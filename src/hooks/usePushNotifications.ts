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
            
            setTimeout(() => {
              subscribe(true);
            }, 1000);
          }
        } else {
          setIsSubscribed(false);
          
          // 🔴 AUTO-RECOVERY: Se permissão é granted mas subscription está null
          if (Notification.permission === 'granted' && autoRecoveryAttempts.current < MAX_AUTO_RECOVERY_ATTEMPTS) {
            pushLog.warn('Subscription perdida detectada', 'Iniciando auto-recovery');
            autoRecoveryAttempts.current++;
            
            setTimeout(() => {
              subscribe(true);
            }, 1000);
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

  const subscribe = async () => {
    if (!isSupported || !user) {
      toast.error("Notificações push não são suportadas neste navegador");
      return false;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      // 📱 ITEM #6: Detecção de plataforma mobile
      console.group('🔔 [Push] Iniciando subscription');
      console.log('🕐 Timestamp:', new Date().toISOString());
      console.log('👤 User ID:', user?.id);
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;

      console.log('📱 Platform:', { 
        isMobile, 
        isIOS, 
        isAndroid, 
        isPWA,
        userAgent: navigator.userAgent 
      });
      console.groupEnd();

      // ⚠️ Verificar se é iOS sem PWA instalado
      if (isIOS && !isPWA) {
        toast.warning('Notificações no iOS', {
          description: 'Para receber notificações no iPhone/iPad, você precisa:\n1. Tocar no botão de compartilhar (📤)\n2. Selecionar "Adicionar à Tela Inicial"\n3. Abrir o app pela tela inicial (não pelo Safari)',
          duration: 10000
        });
        setLoading(false);
        return false;
      }

      // 1. Solicitar permissão
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      console.group('🔔 [Push] Permissão solicitada');
      console.log('✅ Resultado:', permissionResult);
      console.log('🕐 Tempo decorrido:', (Date.now() - startTime) + 'ms');
      console.groupEnd();

      if (permissionResult !== "granted") {
        toast.error("Permissão para notificações negada");
        return false;
      }

      // 2. Obter Service Worker
      console.group('🔔 [Push] Service Worker');
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Registration:', registration);
      console.log('📍 Scope:', registration.scope);
      console.log('🔗 Active:', registration.active?.scriptURL);
      console.log('🔗 State:', registration.active?.state);
      console.groupEnd();

      // 3. Converter VAPID Key
      console.group('🔔 [Push] VAPID Key');
      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log('🔐 Key Length:', convertedKey.byteLength, 'bytes (esperado: 65)');
      console.log('🔐 First 10 bytes:', Array.from(convertedKey.slice(0, 10)));
      console.log('✅ Valid:', convertedKey.byteLength === 65);
      console.groupEnd();

      // 4. Criar inscrição push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      console.group('🔔 [Push] Subscription criada');
      console.log('✅ Subscription:', subscription);
      console.log('📡 Endpoint:', subscription.endpoint.substring(0, 100) + '...');
      console.groupEnd();

      // 5. Extrair chaves
      const subscriptionJSON = subscription.toJSON() as PushSubscriptionData;

      if (!subscriptionJSON.keys) {
        throw new Error("Falha ao obter chaves de inscrição");
      }

      console.log('🔑 Keys:', subscriptionJSON.keys);

      // 6. Salvar no banco
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscriptionJSON.endpoint,
          p256dh: subscriptionJSON.keys.p256dh,
          auth: subscriptionJSON.keys.auth,
          user_agent: navigator.userAgent,
        },
        {
          onConflict: "user_id,endpoint",
        },
      );

      if (error) throw error;

      console.log('🕐 [Push] Tempo total:', (Date.now() - startTime) + 'ms');

      setIsSubscribed(true);
      toast.success("Notificações push ativadas!");
      return true;
    } catch (error) {
      console.group('❌ [Push] Erro');
      console.error('Erro completo:', error);
      console.log('📍 Onde ocorreu:', 'subscribe()');
      console.log('🕐 Timestamp:', new Date().toISOString());
      console.groupEnd();
      
      toast.error("Erro ao ativar notificações push");
      return false;
    } finally {
      setLoading(false);
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
