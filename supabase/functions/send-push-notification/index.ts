import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.3.0";

// Helper para decodificar base64url
function base64UrlDecode(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// Helper para codificar base64url
function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Converte chaves VAPID de string para JWK format
async function vapidKeysToJWK(publicKeyString: string, privateKeyString: string) {
  // Decodificar a chave pública (formato: 0x04 + X (32 bytes) + Y (32 bytes))
  const publicKeyBytes = base64UrlDecode(publicKeyString);
  
  // Extrair coordenadas X e Y (pulando o byte 0x04 no início)
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  
  // Decodificar a chave privada
  const privateKeyBytes = base64UrlDecode(privateKeyString);
  
  // Criar JWK para chave pública
  const publicKeyJWK: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    ext: true,
  };
  
  // Criar JWK para chave privada
  const privateKeyJWK: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    d: base64UrlEncode(privateKeyBytes),
    ext: true,
  };
  
  return { publicKey: publicKeyJWK, privateKey: privateKeyJWK };
}

// Normaliza Base64 padrão para Base64URL (corrige + / = → - _ sem-padding)
function normalizeBase64Url(input: string): string {
  return input.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 🧩 Função auxiliar para logs detalhados e padronizados
function logPushStep(step: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[PUSH-DEBUG] ${timestamp} | ${step}`, data ?? "");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

const logStep = (step: string, details?: any) => {
  console.log(`[PUSH-NOTIFICATION] ${step}`, details || "");
};

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: Record<string, any> },
) {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error("Chaves VAPID não configuradas");
  }

  if (!vapidSubject.startsWith("mailto:")) {
    throw new Error("VAPID_SUBJECT deve começar com mailto:");
  }

  // 🔎 Log fingerprint VAPID backend
  const vapidFingerprint = vapidPublicKey.substring(0, 20) + "..." + vapidPublicKey.substring(vapidPublicKey.length - 10);
  logStep("🔎 VAPID backend fingerprint", vapidFingerprint);

  logStep("Preparando envio Web Push", { endpoint: subscription.endpoint });

  try {
    // Converter chaves string para formato JWK
    const jwkKeys = await vapidKeysToJWK(vapidPublicKey, vapidPrivateKey);
    
    // Importar as chaves VAPID
    const vapidKeys = await webpush.importVapidKeys(jwkKeys);

    // Criar o Application Server
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: vapidSubject,
      vapidKeys,
    });

    // ✅ Usar chaves diretas do banco (já estão em Base64URL correto)
    const subscriber = appServer.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    });

    // Preparar a mensagem
    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: payload.data || {},
    });

    // Enviar a mensagem
    await subscriber.pushTextMessage(message, {
      ttl: 86400, // 24 horas
    });

    logStep("✅ Push enviado com sucesso");
    return true;
  } catch (error: any) {
    logStep("❌ Erro ao enviar push", error);

    // 🔍 Capturar corpo completo do erro FCM
    if (error?.response) {
      try {
        const errorBody = await error.response.text();
        logStep("📋 FCM response body", errorBody);
        logStep("📋 FCM response status", `${error.response.status} ${error.response.statusText}`);
      } catch (e) {
        logStep("⚠️ Não foi possível ler corpo do erro FCM");
      }
    }

    // Detectar subscription expirada (código 410 Gone)
    if (error instanceof webpush.PushMessageError && error.isGone()) {
      throw new Error("SUBSCRIPTION_EXPIRED");
    }

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    logStep("🚀 Iniciando envio de notificação push");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, data, notificationType }: NotificationPayload & { notificationType?: string } =
      await req.json();

    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: "userId, title e body são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Verificando preferências de notificação", { userId, notificationType });

    // Verificar preferências do usuário
    const { data: prefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (prefsError) {
      logStep("⚠️ Erro ao buscar preferências, prosseguindo com envio", prefsError);
    }

    // Verificar se usuário desabilitou este tipo de notificação
    if (prefs && notificationType) {
      const prefKey = `notify_${notificationType}`;
      if (prefs[prefKey] === false) {
        logStep("❌ Usuário desabilitou este tipo de notificação", { notificationType });
        return new Response(JSON.stringify({ message: "Usuário desabilitou este tipo de notificação", sent: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    logStep("Buscando inscrições push do usuário", { userId });

    // Buscar todas as inscrições do usuário
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) {
      logStep("❌ Erro ao buscar inscrições", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      logStep("⚠️ Nenhuma inscrição encontrada para o usuário");
      return new Response(JSON.stringify({ message: "Nenhuma inscrição encontrada", sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filtrar apenas subscriptions usadas nos últimos 30 dias
    const now = new Date();
    const validSubscriptions = subscriptions.filter((sub) => {
      if (!sub.last_used_at) return true;

      const lastUsed = new Date(sub.last_used_at);
      const diffMs = now.getTime() - lastUsed.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      return diffDays < 30;
    });

    logStep(`📊 Filtro de uso recente`, {
      total: subscriptions.length,
      válidas: validSubscriptions.length,
      ignoradas: subscriptions.length - validSubscriptions.length,
    });

    if (validSubscriptions.length === 0) {
      logStep("⚠️ Nenhuma subscription válida (todas antigas)");
      return new Response(JSON.stringify({ message: "Nenhuma subscription válida", sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(`📨 Enviando para ${validSubscriptions.length} dispositivo(s)`);

    // Enviar para todas as inscrições válidas
    const results = await Promise.allSettled(
      validSubscriptions.map((sub) =>
        sendWebPush(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          { title, body, data },
        ),
      ),
    );

    // Contar sucessos e falhas
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // Se houve falhas, salvar para retry (exceto subscriptions expiradas)
    if (failed > 0) {
      const failedResults = results
        .map((r, i) => ({ result: r, subscription: validSubscriptions[i] }))
        .filter(({ result }) => 
          result.status === "rejected" && 
          result.reason?.message !== "SUBSCRIPTION_EXPIRED"
        );

      if (failedResults.length > 0) {
        logStep(`💾 Salvando ${failedResults.length} notificação(ões) para retry`);
        
        // Calcular próximo retry (5 minutos)
        const nextRetry = new Date();
        nextRetry.setMinutes(nextRetry.getMinutes() + 5);

        const firstFailure = failedResults[0].result;
        const errorMsg = firstFailure.status === "rejected" 
          ? (firstFailure.reason instanceof Error ? firstFailure.reason.message : String(firstFailure.reason))
          : "Unknown error";

        await supabase.from("push_notification_retries").insert({
          user_id: userId,
          title,
          body,
          data: data || {},
          notification_type: notificationType,
          attempt_count: 0,
          max_attempts: 3,
          next_retry_at: nextRetry.toISOString(),
          last_error: errorMsg,
          status: "pending",
        });
      }
    }

    // Remover inscrições inválidas (endpoint expirado)
    const invalidIndexes = results
      .map((r, i) => {
        if (r.status === "rejected" && r.reason?.message === "SUBSCRIPTION_EXPIRED") {
          return i;
        }
        return -1;
      })
      .filter((i) => i !== -1);

    if (invalidIndexes.length > 0) {
      logStep(`🗑️ Removendo ${invalidIndexes.length} inscrição(ões) inválida(s)`);
      const invalidEndpoints = invalidIndexes.map((i) => validSubscriptions[i].endpoint);
      await supabase.from("push_subscriptions").delete().in("endpoint", invalidEndpoints);
    }

    logStep("✅ Notificações enviadas", { successful, failed });

    return new Response(
      JSON.stringify({
        message: "Notificações processadas",
        sent: successful,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    logStep("❌ Erro crítico", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
