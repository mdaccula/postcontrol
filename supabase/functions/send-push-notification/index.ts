import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://post.infoprolab.com.br',
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

  // Configurar VAPID details
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  // Preparar payload
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
  });

  // Montar objeto de subscription no formato esperado pelo web-push
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, message);
    logStep('✅ Push enviado com sucesso');
    return true;
  } catch (error: any) {
    logStep('❌ Erro ao enviar push', error);
    
    // Se erro 410 (Gone), significa que o endpoint expirou
    if (error.statusCode === 410) {
      throw new Error('SUBSCRIPTION_EXPIRED');
    }
    
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

    const { userId, title, body, data, notificationType }: NotificationPayload & { notificationType?: string } = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'userId, title e body são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Verificando preferências de notificação', { userId, notificationType });

    // Verificar preferências do usuário
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      logStep('⚠️ Erro ao buscar preferências, prosseguindo com envio', prefsError);
    }

    // Verificar se usuário desabilitou este tipo de notificação
    if (prefs && notificationType) {
      const prefKey = `notify_${notificationType}`;
      if (prefs[prefKey] === false) {
        logStep('❌ Usuário desabilitou este tipo de notificação', { notificationType });
        return new Response(
          JSON.stringify({ message: 'Usuário desabilitou este tipo de notificação', sent: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
      .map((r, i) => {
        if (r.status === 'rejected' && r.reason?.message === 'SUBSCRIPTION_EXPIRED') {
          return i;
        }
        return -1;
      })
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
