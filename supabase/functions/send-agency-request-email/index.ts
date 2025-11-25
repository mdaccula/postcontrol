import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-AGENCY-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    logStep("Resend API key verified");

    const { type, to, agencyName, userName, rejectionReason } = await req.json();
    logStep("Email request received", { type, to, agencyName });

    let subject = "";
    let html = "";

    if (type === "approval") {
      subject = `✅ Sua agência "${agencyName}" foi aprovada!`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">🎉 Parabéns, ${userName}!</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            Sua solicitação para criar a agência <strong>${agencyName}</strong> foi <strong>aprovada</strong>!
          </p>
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">
              Você agora tem 10 dias grátis para testar todas as funcionalidades no plano Básico.
            </p>
          </div>
          <a href="${Deno.env.get("VITE_SUPABASE_URL")?.replace('/rest/v1', '')}/admin" 
             style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px; font-weight: bold;">
            Acessar Painel
          </a>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Após os 10 dias, você poderá escolher entre os planos Básico, Pro ou Enterprise.
          </p>
          <p style="font-size: 18px; margin-top: 20px;">Boa sorte! 🚀</p>
        </div>
      `;
    } else if (type === "rejection") {
      subject = `❌ Sua solicitação para "${agencyName}" foi recusada`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Olá, ${userName}</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            Infelizmente, sua solicitação para criar a agência <strong>${agencyName}</strong> foi <strong>recusada</strong>.
          </p>
          ${rejectionReason ? `
            <div style="background: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong> ${rejectionReason}</p>
            </div>
          ` : ''}
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Se tiver dúvidas, entre em contato conosco.
          </p>
        </div>
      `;
    } else {
      throw new Error("Invalid email type");
    }

    logStep("Sending email via Resend");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "PostControl <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      logStep("ERROR sending email", { status: res.status, data });
      throw new Error(data.message || "Failed to send email");
    }

    logStep("Email sent successfully", { id: data.id });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-agency-request-email", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
