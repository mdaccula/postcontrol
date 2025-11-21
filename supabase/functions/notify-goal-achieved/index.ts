import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  userId: string;
  eventId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, eventId }: NotificationPayload = await req.json();

    console.log('🎯 Processing goal achievement notification:', { userId, eventId });

    // Buscar informações do evento e da agência
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, agency_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('❌ Event not found:', eventError);
      throw new Error('Event not found');
    }

    // Buscar configuração de notificações da agência
    const { data: config } = await supabase
      .from('agency_goal_notifications_config')
      .select('*')
      .eq('agency_id', event.agency_id)
      .single();

    const sendPush = config?.send_push_notification ?? true;
    const sendEmail = config?.send_email_notification ?? false;
    const customMessage = config?.custom_message ?? '🎉 Parabéns! Você garantiu sua vaga no grupo do evento!';

    console.log('📧 Notification config:', { sendPush, sendEmail });

    // Enviar push notification se habilitado
    if (sendPush) {
      try {
        await supabase.rpc('send_push_to_user', {
          p_user_id: userId,
          p_title: `Meta Atingida - ${event.title}`,
          p_body: customMessage,
          p_data: {
            type: 'goal_achieved',
            eventId: eventId,
            url: '/dashboard'
          }
        });
        console.log('✅ Push notification sent');
      } catch (pushError) {
        console.error('⚠️ Failed to send push:', pushError);
      }
    }

    // Criar notificação no sistema
    await supabase.from('notifications').insert({
      user_id: userId,
      title: `🎉 Meta Atingida - ${event.title}`,
      message: customMessage,
      type: 'goal_achieved'
    });

    // Marcar como notificado
    await supabase
      .from('user_event_goals')
      .update({ 
        notified: true, 
        notified_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('event_id', eventId);

    console.log('✅ Goal achievement notification completed');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in notify-goal-achieved:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
