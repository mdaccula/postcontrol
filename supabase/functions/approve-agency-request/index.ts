import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPROVE-AGENCY] ${step}${detailsStr}`);
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

    const { requestId, action, rejectionReason } = await req.json();
    logStep("Request received", { requestId, action });

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

    // Get request details
    const { data: request, error: requestError } = await supabaseClient
      .from("agency_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      logStep("ERROR: Request not found", { requestError });
      throw new Error("Request not found");
    }
    logStep("Request found", { agencyName: request.agency_name, userId: request.user_id });

    if (action === "approve") {
      logStep("Processing approval");

      // Create agency
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 10);

      const { data: newAgency, error: agencyError } = await supabaseClient
        .from("agencies")
        .insert({
          name: request.agency_name,
          slug: request.agency_slug,
          owner_id: request.user_id,
          subscription_status: "trial",
          subscription_plan: "basic",
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          max_influencers: 100,
          max_events: 50,
        })
        .select()
        .single();

      if (agencyError) {
        logStep("ERROR creating agency", { agencyError });
        throw agencyError;
      }
      logStep("Agency created", { agencyId: newAgency.id });

      // Update profile with agency_id
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({ agency_id: newAgency.id })
        .eq("id", request.user_id);

      if (profileError) {
        logStep("WARN: Error updating profile", { profileError });
      } else {
        logStep("Profile updated with agency_id");
      }

      // Link user to agency
      const { error: userAgencyError } = await supabaseClient
        .from("user_agencies")
        .insert({
          user_id: request.user_id,
          agency_id: newAgency.id,
        });

      if (userAgencyError) {
        logStep("WARN: Error linking user to agency", { userAgencyError });
      } else {
        logStep("User linked to agency");
      }

      // Check if user already has a role
      const { data: existingRole } = await supabaseClient
        .from("user_roles")
        .select("*")
        .eq("user_id", request.user_id)
        .single();

      if (existingRole) {
        // Update existing role to agency_admin
        const { error: updateRoleError } = await supabaseClient
          .from("user_roles")
          .update({ role: "agency_admin" })
          .eq("user_id", request.user_id);

        if (updateRoleError) {
          logStep("ERROR updating user role", { updateRoleError });
        } else {
          logStep("User role updated to agency_admin");
        }
      } else {
        // Insert new agency_admin role
        const { error: insertRoleError } = await supabaseClient
          .from("user_roles")
          .insert({
            user_id: request.user_id,
            role: "agency_admin",
          });

        if (insertRoleError) {
          logStep("ERROR inserting user role", { insertRoleError });
        } else {
          logStep("User role created as agency_admin");
        }
      }

      // Update request status
      const { error: updateRequestError } = await supabaseClient
        .from("agency_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", requestId);

      if (updateRequestError) {
        logStep("WARN: Error updating request status", { updateRequestError });
      } else {
        logStep("Request status updated to approved");
      }

      // Get user details for email
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", request.user_id)
        .single();

      if (!profile?.email) {
        logStep("WARN: No email found for user");
      } else {
        // Send approval email
        logStep("Sending approval email");
        const { error: emailError } = await supabaseClient.functions.invoke("send-agency-request-email", {
          body: {
            type: "approval",
            to: profile.email,
            agencyName: request.agency_name,
            userName: profile.full_name || profile.email,
          },
        });

        if (emailError) {
          logStep("WARN: Error sending email", { emailError });
        } else {
          logStep("Approval email sent");
        }
      }

      return new Response(
        JSON.stringify({ success: true, agency: newAgency }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "reject") {
      logStep("Processing rejection");

      // Update request status
      const { error: updateRequestError } = await supabaseClient
        .from("agency_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: rejectionReason,
        })
        .eq("id", requestId);

      if (updateRequestError) {
        logStep("ERROR updating request status", { updateRequestError });
        throw updateRequestError;
      }
      logStep("Request status updated to rejected");

      // Get user details for email
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", request.user_id)
        .single();

      if (!profile?.email) {
        logStep("WARN: No email found for user");
      } else {
        // Send rejection email
        logStep("Sending rejection email");
        const { error: emailError } = await supabaseClient.functions.invoke("send-agency-request-email", {
          body: {
            type: "rejection",
            to: profile.email,
            agencyName: request.agency_name,
            userName: profile.full_name || profile.email,
            rejectionReason,
          },
        });

        if (emailError) {
          logStep("WARN: Error sending email", { emailError });
        } else {
          logStep("Rejection email sent");
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Invalid action");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in approve-agency-request", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
