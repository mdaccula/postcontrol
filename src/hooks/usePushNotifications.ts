import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

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
          // Verificar se a inscrição existe no banco
          const { data } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .eq("endpoint", subscription.endpoint)
            .maybeSingle();

          setIsSubscribed(!!data);
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
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
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

    try {
      // 1. Solicitar permissão
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Permissão para notificações negada");
        return false;
      }

      // 2. Obter Service Worker
      const registration = await navigator.serviceWorker.ready;

      // 3. Criar inscrição push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
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
