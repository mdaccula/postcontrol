import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// 🔍 DEBUG - Verificar se key está carregada (ETAPA 1)
console.log('🔑 VAPID_PUBLIC_KEY:', VAPID_PUBLIC_KEY);
console.log('🔑 Tamanho:', VAPID_PUBLIC_KEY?.length || 0, 'caracteres');
console.log('🔑 Tipo:', typeof VAPID_PUBLIC_KEY);

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

  // Verificar suporte e permissão
  useEffect(() => {
    const checkSupport = () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Verificar se usuário já está inscrito
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          // Buscar todas as inscrições do usuário e filtrar manualmente
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint")
            .eq("user_id", user.id);

          // Filtrar pelo endpoint no JavaScript (evita erro 406 com URLs longas)
          const existingSubscription = subscriptions?.find(
            sub => sub.endpoint === subscription.endpoint
          );

          setIsSubscribed(!!existingSubscription);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error("[usePushNotifications] Erro ao verificar inscrição:", error);
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const urlBase64ToUint8Array = (base64String: string) => {
    // Converter base64url para base64 padrão (atob aceita sem padding)
    const base64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode e converter para Uint8Array diretamente
    const rawData = atob(base64);
    return Uint8Array.from(rawData, c => c.charCodeAt(0));
  };

  const subscribe = async () => {
    if (!isSupported || !user) {
      toast.error("Notificações push não são suportadas neste navegador");
      return false;
    }

    setLoading(true);

    try {
      // 1. Solicitar permissão
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Permissão para notificações negada");
        return false;
      }

      // 2. Obter Service Worker
      console.log('🔧 Verificando Service Worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker pronto:', registration);
      console.log('📍 Scope:', registration.scope);
      console.log('🔗 Active:', registration.active?.scriptURL);

      // 🔍 DEBUG - Verificar conversão da key (ETAPA 2)
      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log('🔐 Converted Key:', convertedKey);
      console.log('🔐 Key Length:', convertedKey.byteLength, 'bytes (esperado: 65)');
      console.log('🔐 Primeiros bytes:', Array.from(convertedKey.slice(0, 5)));

      // 3. Criar inscrição push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // 4. Extrair chaves
      const subscriptionJSON = subscription.toJSON() as PushSubscriptionData;

      if (!subscriptionJSON.keys) {
        throw new Error("Falha ao obter chaves de inscrição");
      }

      // 5. Salvar no banco
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

      setIsSubscribed(true);
      toast.success("Notificações push ativadas!");
      return true;
    } catch (error) {
      console.error("[usePushNotifications] Erro ao inscrever:", error);
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
