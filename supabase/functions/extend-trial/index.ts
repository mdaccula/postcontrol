import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXTEND-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { agencyId } = await req.json();
    if (!agencyId) {
      throw new Error("Agency ID is required");
    }
    logStep("Request received", { agencyId });

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");
    logStep("User authenticated", { userId: user.id });

    // Verify master admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "master_admin")
      .single();

    if (!roles) {
      logStep("ERROR: User is not master admin");
      throw new Error("Not a master admin");
    }
    logStep("Master admin verified");

    // Get agency details
    const { data: agency, error: agencyError } = await supabaseClient
      .from("agencies")
      .select("*")
      .eq("id", agencyId)
      .single();

    if (agencyError || !agency) {
      logStep("ERROR: Agency not found", { agencyError });
      throw new Error("Agency not found");
    }
    logStep("Agency found", { name: agency.name, trialExtended: agency.trial_extended });

    // Check if trial already extended
    if (agency.trial_extended) {
      logStep("ERROR: Trial already extended");
      throw new Error("Trial já foi estendido anteriormente");
    }

    // Check if agency is in trial
    if (agency.subscription_status !== 'trial') {
      logStep("ERROR: Agency is not in trial", { status: agency.subscription_status });
      throw new Error("Agência não está em período de trial");
    }

    // Extend trial by 10 days
    const currentEndDate = new Date(agency.trial_end_date);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + 10);

    const { error: updateError } = await supabaseClient
      .from("agencies")
      .update({
        trial_end_date: newEndDate.toISOString(),
        trial_extended: true,
      })
      .eq("id", agencyId);

    if (updateError) {
      logStep("ERROR updating agency", { updateError });
      throw updateError;
    }

    logStep("Trial extended successfully", {
      oldEndDate: currentEndDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        newEndDate: newEndDate.toISOString(),
        message: "Trial estendido por mais 10 dias"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in extend-trial", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
