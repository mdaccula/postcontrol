import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[AUTO-DEACTIVATE-DATES] Iniciando desativação automática de datas...');

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar datas que devem ser desativadas:
    // - auto_deactivate_after_start = true
    // - is_active = true
    // - event_date + start_time < NOW()
    const { data: datesToDeactivate, error: fetchError } = await supabase
      .from('guest_list_dates')
      .select('id, name, event_date, start_time')
      .eq('auto_deactivate_after_start', true)
      .eq('is_active', true);

    if (fetchError) {
      console.error('[AUTO-DEACTIVATE-DATES] Erro ao buscar datas:', fetchError);
      throw fetchError;
    }

    if (!datesToDeactivate || datesToDeactivate.length === 0) {
      console.log('[AUTO-DEACTIVATE-DATES] Nenhuma data para desativar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          deactivated: 0,
          message: 'Nenhuma data precisa ser desativada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AUTO-DEACTIVATE-DATES] Encontradas ${datesToDeactivate.length} datas candidatas`);

    // Filtrar datas que já passaram
    const now = new Date();
    const dateIdsToDeactivate: string[] = [];

    for (const date of datesToDeactivate) {
      // Montar datetime completo
      let dateTime: Date;
      
      if (date.start_time) {
        // Se tem horário de início, usar ele
        const [hours, minutes] = date.start_time.split(':');
        dateTime = new Date(date.event_date);
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        // Se não tem horário, usar meia-noite do dia do evento
        dateTime = new Date(date.event_date);
        dateTime.setHours(0, 0, 0, 0);
      }

      // Se o evento já começou, marcar para desativar
      if (dateTime < now) {
        console.log(`[AUTO-DEACTIVATE-DATES] Data passada: ${date.name || date.event_date} (${dateTime.toISOString()})`);
        dateIdsToDeactivate.push(date.id);
      }
    }

    if (dateIdsToDeactivate.length === 0) {
      console.log('[AUTO-DEACTIVATE-DATES] Nenhuma data passou do horário ainda');
      return new Response(
        JSON.stringify({ 
          success: true, 
          deactivated: 0,
          message: 'Nenhuma data precisa ser desativada ainda' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Desativar datas em lote
    const { error: updateError } = await supabase
      .from('guest_list_dates')
      .update({ is_active: false })
      .in('id', dateIdsToDeactivate);

    if (updateError) {
      console.error('[AUTO-DEACTIVATE-DATES] Erro ao desativar datas:', updateError);
      throw updateError;
    }

    console.log(`[AUTO-DEACTIVATE-DATES] ✅ ${dateIdsToDeactivate.length} datas desativadas com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deactivated: dateIdsToDeactivate.length,
        message: `${dateIdsToDeactivate.length} data(s) desativada(s) automaticamente`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AUTO-DEACTIVATE-DATES] ❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
