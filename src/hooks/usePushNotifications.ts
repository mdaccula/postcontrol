import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// 🔍 FASE 5: Logger centralizado
const pushLog = {
  group: (title: string) => console.group(`🔔 [Push] ${title}`),
  info: (msg: string, data?: any) => console.log(`✅ ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`⚠️ ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`❌ ${msg}`, error || ''),
  groupEnd: () => console.groupEnd()
};

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const usePushNotifications = () => {
  const { user } = useAuthStore();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const autoRecoveryAttempts = useRef(0);
  const MAX_AUTO_RECOVERY_ATTEMPTS = 3;

  // Verificar suporte e permissão
  useEffect(() => {
    const checkSupport = () => {
      pushLog.group('Verificando Suporte');
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

      pushLog.info('Suporte PWA', {
        serviceWorker: "serviceWorker" in navigator,
        pushManager: "PushManager" in window,
        notification: "Notification" in window,
        result: supported
      });

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        pushLog.info('Permissão atual', Notification.permission);
      }
      pushLog.groupEnd();
    };

    checkSupport();
  }, []);

  // 🔴 FASE 1.1: Auto Re-subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        pushLog.group('Verificando Subscription');
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        pushLog.info('PushManager.getSubscription()', subscription ? 'Subscription encontrada' : 'Nenhuma subscription');

        if (subscription) {
          // Buscar todas as inscrições do usuário e filtrar manualmente
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint")
            .eq("user_id", user.id);

          // Filtrar pelo endpoint no JavaScript (evita erro 406 com URLs longas)
          const existingSubscription = subscriptions?.find((sub) => sub.endpoint === subscription.endpoint);

          setIsSubscribed(!!existingSubscription);
          pushLog.info('Status no banco', existingSubscription ? 'Registrada' : 'Não registrada');

          // 🔴 AUTO-RECOVERY: Se não está no banco mas permissão é granted
          if (!existingSubscription && Notification.permission === 'granted' && autoRecoveryAttempts.current < MAX_AUTO_RECOVERY_ATTEMPTS) {
            pushLog.warn('Auto-recovery iniciado', `Tentativa ${autoRecoveryAttempts.current + 1}/${MAX_AUTO_RECOVERY_ATTEMPTS}`);
            autoRecoveryAttempts.current++;
            
            setTimeout(async () => {
              const registration = await navigator.serviceWorker.ready;
              const currentSub = await registration.pushManager.getSubscription();
              if (!currentSub && autoRecoveryAttempts.current < MAX_AUTO_RECOVERY_ATTEMPTS) {
                subscribe(true);
              }
            }, 5000); // aguarda 5 segundos antes de tentar novamente
          }
        } else {
          setIsSubscribed(false);
          
          // 🔴 AUTO-RECOVERY: Se permissão é granted mas subscription está null
          if (Notification.permission === 'granted' && autoRecoveryAttempts.current < MAX_AUTO_RECOVERY_ATTEMPTS) {
            pushLog.warn('Subscription perdida detectada', 'Iniciando auto-recovery');
            autoRecoveryAttempts.current++;
            
            setTimeout(async () => {
              const registration = await navigator.serviceWorker.ready;
              const currentSub = await registration.pushManager.getSubscription();
              if (!currentSub && autoRecoveryAttempts.current < MAX_AUTO_RECOVERY_ATTEMPTS) {
                subscribe(true);
              }
            }, 5000); // aguarda 5 segundos antes de tentar novamente
          }
        }
        pushLog.groupEnd();
      } catch (error) {
        pushLog.error('Erro ao verificar subscription', error);
        setIsSubscribed(false);
        pushLog.groupEnd();
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const urlBase64ToUint8Array = (base64String: string) => {
    // Adicionar padding se necessário
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

    // Converter base64url para base64 padrão
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    // Decode e converter para Uint8Array
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  };

  const subscribe = async (isAutoRecovery = false) => {
    if (!isSupported || !user) {
      toast.error("Notificações push não são suportadas neste navegador");
      return false;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      pushLog.group(isAutoRecovery ? 'Auto-Recovery Subscription' : 'Manual Subscription');
      pushLog.info('Timestamp', new Date().toISOString());
      pushLog.info('User ID', user?.id);
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;

      pushLog.info('Plataforma', { isMobile, isIOS, isAndroid, isPWA });

      if (isIOS && !isPWA) {
        toast.error("⚠️ iOS: Instale o app primeiro", {
          description: "No Safari, toque em 'Compartilhar' → 'Adicionar à Tela Inicial'",
          duration: 6000,
        });
        pushLog.error('iOS requer instalação PWA');
        pushLog.groupEnd();
        setLoading(false);
        return false;
      }

      // Solicitar permissão
      pushLog.info('Solicitando permissão...');
      const perm = await Notification.requestPermission();
      pushLog.info('Permissão resultado', perm);
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Você precisa permitir as notificações");
        pushLog.error('Permissão negada');
        pushLog.groupEnd();
        setLoading(false);
        return false;
      }

      // Registrar Service Worker
      pushLog.info('Aguardando Service Worker...');
      const registration = await navigator.serviceWorker.ready;
      pushLog.info('Service Worker pronto', registration.scope);

      if (!VAPID_PUBLIC_KEY) {
        throw new Error("VAPID_PUBLIC_KEY não configurada");
      }

      pushLog.info('Convertendo VAPID key...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Verificar subscription existente
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        pushLog.info('Subscription existente encontrada, unsubscribing...');
        await subscription.unsubscribe();
      }

      // Criar nova subscription
      pushLog.info('Criando nova subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      pushLog.info('Subscription criada', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        expirationTime: subscription.expirationTime
      });

      // Salvar no banco
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
        },
      };

      pushLog.info('Salvando no banco...');
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: "endpoint",
        }
      );

      if (error) throw error;

      const duration = Date.now() - startTime;
      pushLog.info('✅ Subscription completa', `${duration}ms`);
      pushLog.groupEnd();

      setIsSubscribed(true);
      autoRecoveryAttempts.current = 0; // Reset contador
      
      if (!isAutoRecovery) {
        toast.success("✅ Notificações ativadas!", {
          description: `Configurado em ${duration}ms`,
        });
        // Limpar subscriptions antigas em background
        cleanupOldSubscriptions();
      } else {
        toast.success("🔄 Subscription recuperada automaticamente");
      }

      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      pushLog.error('Erro na subscription', error);
      pushLog.info('Tempo até erro', `${duration}ms`);
      pushLog.groupEnd();

      if (!isAutoRecovery) {
        toast.error("Erro ao ativar notificações", {
          description: error?.message || "Tente novamente",
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldSubscriptions = async () => {
    if (!user) return;
    
    try {
      pushLog.group('Limpando subscriptions antigas');
      
      // Buscar todas as subscriptions do usuário
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user.id);

      if (!subs || subs.length === 0) {
        pushLog.info('Nenhuma subscription para limpar');
        pushLog.groupEnd();
        return;
      }

      // Obter subscription atual do navegador
      const registration = await navigator.serviceWorker.ready;
      const currentSub = await registration.pushManager.getSubscription();

      if (!currentSub) {
        pushLog.warn('Nenhuma subscription ativa no navegador');
        pushLog.groupEnd();
        return;
      }

      // Identificar subscriptions inválidas (diferentes da atual)
      const invalidSubs = subs.filter(sub => sub.endpoint !== currentSub.endpoint);
      
      if (invalidSubs.length > 0) {
        pushLog.info(`Removendo ${invalidSubs.length} subscription(s) inválida(s)`);
        
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("id", invalidSubs.map(s => s.id));
        
        pushLog.info(`✅ ${invalidSubs.length} subscription(s) removida(s)`);
      } else {
        pushLog.info('✅ Todas as subscriptions estão válidas');
      }
      
      pushLog.groupEnd();
    } catch (error) {
      pushLog.error('Erro ao limpar subscriptions', error);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported || !user) return false;

    setLoading(true);

    try {
      // 1. Obter inscrição atual
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 2. Cancelar inscrição no navegador
        await subscription.unsubscribe();

        // 3. Remover do banco
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success("Notificações push desativadas");
      return true;
    } catch (error) {
      console.error("[usePushNotifications] Erro ao desinscrever:", error);
      toast.error("Erro ao desativar notificações push");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
};
