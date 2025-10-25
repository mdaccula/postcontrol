import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking events for auto activation/deactivation...");

    const now = new Date().toISOString();

    // Ativar eventos que chegaram no horário
    const { data: toActivate, error: activateError } = await supabase
      .from("events")
      .update({ is_active: true })
      .lte("auto_activate_at", now)
      .eq("is_active", false)
      .not("auto_activate_at", "is", null)
      .select();

    if (activateError) {
      console.error("Error activating events:", activateError);
    } else {
      console.log(`Activated ${toActivate?.length || 0} events`);
    }

    // Desativar eventos que chegaram no horário
    const { data: toDeactivate, error: deactivateError } = await supabase
      .from("events")
      .update({ is_active: false })
      .lte("auto_deactivate_at", now)
      .eq("is_active", true)
      .not("auto_deactivate_at", "is", null)
      .select();

    if (deactivateError) {
      console.error("Error deactivating events:", deactivateError);
    } else {
      console.log(`Deactivated ${toDeactivate?.length || 0} events`);
    }

    return new Response(
      JSON.stringify({
        activated: toActivate?.length || 0,
        deactivated: toDeactivate?.length || 0,
        timestamp: now,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in auto-event-scheduler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
