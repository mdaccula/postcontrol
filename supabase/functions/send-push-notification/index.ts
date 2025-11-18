import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Função auxiliar para conversão base64url
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Criar JWT para VAPID
async function createVapidAuthHeader(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = {
    typ: "JWT",
    alg: "ES256"
  };

  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 horas
    sub: subject
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Importar chave privada
  const privateKeyBytes = base64UrlToUint8Array(privateKey);
  const arrayBuffer = new Uint8Array(privateKeyBytes).buffer as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    arrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Assinar
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

async function sendWebPush(
  subscription: PushSubscription,
  payload: { title: string; body: string; data?: Record<string, any> },
) {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error("Chaves VAPID não configuradas");
  }

  if (!vapidSubject.startsWith('mailto:')) {
    throw new Error('VAPID_SUBJECT deve começar com mailto: (ex: mailto:seu@email.com)');
  }

  logStep("Preparando envio Web Push", { endpoint: subscription.endpoint });

  // Preparar payload
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: payload.data || {},
  });

  try {
    // Extrair audience do endpoint
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // Criar token VAPID
    const vapidToken = await createVapidAuthHeader(
      audience,
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Enviar notificação via HTTP POST
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Authorization": `vapid t=${vapidToken}, k=${vapidPublicKey}`,
        "TTL": "86400",
      },
      body: message,
    });

    if (response.status === 410) {
      throw new Error("SUBSCRIPTION_EXPIRED");
    }

    if (!response.ok) {
      throw new Error(`Push failed: ${response.status} ${response.statusText}`);
    }

    logStep("✅ Push enviado com sucesso");
    return true;
  } catch (error: any) {
    logStep("❌ Erro ao enviar push", error);

    if (error.message === "SUBSCRIPTION_EXPIRED") {
      throw error;
    }

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 200,
      headers: corsHeaders 
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
    const validSubscriptions = subscriptions.filter(sub => {
      if (!sub.last_used_at) return true;
      
      const lastUsed = new Date(sub.last_used_at);
      const diffMs = now.getTime() - lastUsed.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      return diffDays < 30;
    });

    logStep(`📊 Filtro de uso recente`, { 
      total: subscriptions.length, 
      válidas: validSubscriptions.length,
      ignoradas: subscriptions.length - validSubscriptions.length 
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
