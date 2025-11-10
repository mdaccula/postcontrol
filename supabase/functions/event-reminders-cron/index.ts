import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[EVENT-REMINDERS-CRON] ${step}`, details || '');
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('🔔 Iniciando verificação de lembretes de eventos');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Chamar função do banco que envia os lembretes
    const { error } = await supabase.rpc('send_event_reminders');

    if (error) {
      logStep('❌ Erro ao executar função de lembretes', error);
      throw error;
    }

    logStep('✅ Lembretes de eventos processados com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lembretes de eventos enviados',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logStep('❌ Erro crítico no cron job', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
