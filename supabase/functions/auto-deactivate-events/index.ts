import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔄 Running auto-deactivate-events cron job...");

    // Buscar eventos com data passada e ainda ativos
    const { data: expiredEvents, error: fetchError } = await supabase
      .from("events")
      .select("id, title, event_date")
      .eq("is_active", true)
      .lt("event_date", new Date().toISOString())
      .not("event_date", "is", null);

    if (fetchError) {
      console.error("❌ Error fetching expired events:", fetchError);
      throw fetchError;
    }

    if (!expiredEvents || expiredEvents.length === 0) {
      console.log("✅ No expired events found");
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No events to deactivate",
          deactivatedCount: 0
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`📋 Found ${expiredEvents.length} expired events to deactivate`);

    // Desativar eventos expirados
    const { error: updateError } = await supabase
      .from("events")
      .update({ is_active: false })
      .in("id", expiredEvents.map(e => e.id));

    if (updateError) {
      console.error("❌ Error deactivating events:", updateError);
      throw updateError;
    }

    console.log(`✅ Deactivated ${expiredEvents.length} events`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Events deactivated successfully",
        deactivatedCount: expiredEvents.length,
        events: expiredEvents.map(e => ({ id: e.id, title: e.title }))
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("❌ Error in auto-deactivate-events function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
