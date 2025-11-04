import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 [CREATE-CHECKOUT] Iniciando criação de sessão de checkout");

    const { planKey } = await req.json();
    if (!planKey) {
      throw new Error("Plan key is required");
    }
    console.log("📋 [CREATE-CHECKOUT] Plan key recebido:", planKey);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error("User not authenticated");
    }
    console.log("👤 [CREATE-CHECKOUT] Usuário autenticado:", user.email);

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('plan_key', planKey)
      .single();

    if (planError || !plan) {
      throw new Error(`Plan not found: ${planKey}`);
    }

    if (!plan.stripe_price_id) {
      throw new Error(`Plan ${planKey} doesn't have a Stripe price ID configured`);
    }
    console.log("💳 [CREATE-CHECKOUT] Plano encontrado:", plan.plan_name, "Price ID:", plan.stripe_price_id);

    // Get user's agency (optional - will be created after payment if doesn't exist)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('agency_id, full_name')
      .eq('id', user.id)
      .single();

    const agencyId = profile?.agency_id || null;
    console.log("🏢 [CREATE-CHECKOUT] Agency ID:", agencyId || "Will be created after payment");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("✅ [CREATE-CHECKOUT] Cliente Stripe existente:", customerId);
    } else {
      const customerMetadata: Record<string, string> = {
        supabase_user_id: user.id,
      };
      
      if (agencyId) {
        customerMetadata.agency_id = agencyId;
      }

      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || user.email.split('@')[0],
        metadata: customerMetadata,
      });
      customerId = newCustomer.id;
      console.log("✨ [CREATE-CHECKOUT] Novo cliente Stripe criado:", customerId);
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    const sessionMetadata: Record<string, string> = {
      plan_key: planKey,
      user_id: user.id,
      user_email: user.email,
      user_name: profile?.full_name || user.email.split('@')[0],
    };
    
    if (agencyId) {
      sessionMetadata.agency_id = agencyId;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=canceled`,
      metadata: sessionMetadata,
    });

    console.log("🎉 [CREATE-CHECKOUT] Sessão criada com sucesso:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ [CREATE-CHECKOUT] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
