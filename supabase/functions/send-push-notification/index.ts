import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  console.log(`[PUSH-NOTIFICATION] ${step}`, details || '');
};

async function sendWebPush(
  subscription: PushSubscription,
  payload: { title: string; body: string; data?: Record<string, any> }
) {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error('Chaves VAPID não configuradas');
  }

  logStep('Preparando envio Web Push', { endpoint: subscription.endpoint });

  // Preparar payload
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
  });

  // Usar web-push API nativa do Deno
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Extrair endpoint URL
  const url = new URL(subscription.endpoint);
  
  // Criar headers para Web Push
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'TTL': '86400',
  };

  // Adicionar chaves de encriptação
  headers['Crypto-Key'] = `p256ecdsa=${vapidPublicKey}`;
  headers['Encryption'] = `salt=${subscription.auth}`;
  
  // VAPID headers (simplified - production should use proper JWT)
  headers['Authorization'] = `vapid t=${vapidPublicKey}, k=${vapidPrivateKey}`;

  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body: message,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Web Push falhou: ${response.status} - ${errorText}`);
    }

    logStep('✅ Push enviado com sucesso');
    return true;
  } catch (error) {
    logStep('❌ Erro ao enviar push', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('🚀 Iniciando envio de notificação push');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, data }: NotificationPayload = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'userId, title e body são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Buscando inscrições push do usuário', { userId });

    // Buscar todas as inscrições do usuário
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      logStep('❌ Erro ao buscar inscrições', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      logStep('⚠️ Nenhuma inscrição encontrada para o usuário');
      return new Response(
        JSON.stringify({ message: 'Nenhuma inscrição encontrada', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep(`📨 Enviando para ${subscriptions.length} dispositivo(s)`);

    // Enviar para todas as inscrições
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendWebPush(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          { title, body, data }
        )
      )
    );

    // Contar sucessos e falhas
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Remover inscrições inválidas (endpoint expirado)
    const invalidIndexes = results
      .map((r, i) => (r.status === 'rejected' ? i : -1))
      .filter((i) => i !== -1);

    if (invalidIndexes.length > 0) {
      logStep(`🗑️ Removendo ${invalidIndexes.length} inscrição(ões) inválida(s)`);
      const invalidEndpoints = invalidIndexes.map((i) => subscriptions[i].endpoint);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', invalidEndpoints);
    }

    logStep('✅ Notificações enviadas', { successful, failed });

    return new Response(
      JSON.stringify({
        message: 'Notificações processadas',
        sent: successful,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logStep('❌ Erro crítico', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
