import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Checking for expired trials...');

    // Buscar agências com trial expirado
    const { data: expiredAgencies, error: fetchError } = await supabase
      .from('agencies')
      .select('id, name, slug, admin_email, trial_end_date')
      .eq('subscription_status', 'trial')
      .lt('trial_end_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired agencies:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredAgencies?.length || 0} expired trials`);

    if (expiredAgencies && expiredAgencies.length > 0) {
      // Suspender agências com trial expirado
      const agencyIds = expiredAgencies.map(a => a.id);
      
      const { error: updateError } = await supabase
        .from('agencies')
        .update({ subscription_status: 'suspended' })
        .in('id', agencyIds);

      if (updateError) {
        console.error('Error suspending agencies:', updateError);
        throw updateError;
      }

      console.log(`✅ Suspended ${agencyIds.length} agencies with expired trials`);

      // Aqui você pode adicionar lógica de envio de email
      // para notificar os admins sobre a suspensão
      for (const agency of expiredAgencies) {
        console.log(`📧 Should notify ${agency.admin_email} about suspension of ${agency.name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredAgencies?.length || 0,
        suspended_agencies: expiredAgencies?.map(a => a.slug) || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in check-trial-expiration:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
