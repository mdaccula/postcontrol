import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlotStats {
  total_slots: number;
  occupied_slots: number;
  available_slots: number;
  occupancy_percentage: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Iniciando snapshot de vagas...');

    // Buscar todos os eventos ativos
    const { data: activeEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, title, agency_id')
      .eq('is_active', true);

    if (eventsError) {
      console.error('❌ Erro ao buscar eventos:', eventsError);
      throw eventsError;
    }

    console.log(`📊 Processando ${activeEvents?.length || 0} eventos ativos`);

    const results = [];
    const alerts = [];

    for (const event of activeEvents || []) {
      console.log(`  📍 Processando evento: ${event.title}`);

      // Registrar snapshot
      const { error: snapshotError } = await supabase.rpc('record_slots_snapshot', {
        p_event_id: event.id,
      });

      if (snapshotError) {
        console.error(`  ❌ Erro no snapshot do evento ${event.title}:`, snapshotError);
        continue;
      }

      // Buscar dados atuais para verificar alertas
      const { data: slotData, error: slotError } = await supabase
        .rpc('get_event_available_slots', { p_event_id: event.id })
        .single();

      if (slotError || !slotData) {
        console.error(`  ❌ Erro ao buscar vagas do evento ${event.title}:`, slotError);
        continue;
      }

      const slots = slotData as unknown as SlotStats;
      
      console.log(`  ✅ Snapshot registrado: ${slots.available_slots}/${slots.total_slots} vagas disponíveis`);

      results.push({
        event_id: event.id,
        event_title: event.title,
        ...slots,
      });

      // Verificar se precisa enviar alerta (< 20% de vagas)
      if (slots.total_slots > 0 && slots.occupancy_percentage >= 80) {
        console.log(`  ⚠️ ALERTA: Apenas ${slots.available_slots} vagas restantes (${(100 - slots.occupancy_percentage).toFixed(1)}%)`);
        
        alerts.push({
          event_id: event.id,
          event_title: event.title,
          available_slots: slots.available_slots,
          occupancy_percentage: slots.occupancy_percentage,
        });

        // Buscar admins da agência para notificar
        const { data: adminProfiles, error: adminError } = await supabase
          .from('profiles')
          .select('id')
          .eq('agency_id', event.agency_id);

        if (!adminError && adminProfiles) {
          for (const admin of adminProfiles) {
            // Verificar se é admin
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', admin.id)
              .eq('role', 'agency_admin')
              .single();

            if (roles) {
              console.log(`  📧 Enviando notificação para admin: ${admin.id}`);
              
              // Enviar push notification
              await supabase.rpc('send_push_to_user', {
                p_user_id: admin.id,
                p_title: '⚠️ Vagas Limitadas!',
                p_body: `O evento "${event.title}" está com apenas ${slots.available_slots} vagas disponíveis (${(100 - slots.occupancy_percentage).toFixed(1)}% restante)`,
                p_data: {
                  type: 'low_slots_alert',
                  event_id: event.id,
                  available_slots: slots.available_slots,
                },
              });

              // Criar notificação in-app
              await supabase.from('notifications').insert({
                user_id: admin.id,
                type: 'low_slots_alert',
                title: '⚠️ Vagas Limitadas!',
                message: `O evento "${event.title}" está com apenas ${slots.available_slots} vagas disponíveis`,
              });
            }
          }
        }
      }
    }

    console.log(`✅ Snapshot concluído: ${results.length} eventos processados, ${alerts.length} alertas enviados`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        alerts_count: alerts.length,
        results,
        alerts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
