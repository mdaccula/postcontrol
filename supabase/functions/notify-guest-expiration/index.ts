import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Resend API wrapper
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(options: { from: string; to: string[]; subject: string; html: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return response.json();
}

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

    console.log("Checking for guests about to expire...");

    // Buscar convidados que expiram em 7 dias E que querem ser notificados
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(0, 0, 0, 0);

    const eightDaysFromNow = new Date();
    eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 8);
    eightDaysFromNow.setHours(0, 0, 0, 0);

    const { data: guestsExpiring7Days, error: error7Days } = await supabase
      .from("agency_guests")
      .select(
        `
        *,
        agencies(name, logo_url)
      `,
      )
      .eq("status", "accepted")
      .eq("notify_before_expiry", true)
      .gte("access_end_date", sevenDaysFromNow.toISOString())
      .lt("access_end_date", eightDaysFromNow.toISOString());

    if (error7Days) {
      console.error("Error fetching 7-day expiring guests:", error7Days);
    }

    // Buscar convidados que expiram em 24 horas
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    oneDayFromNow.setHours(0, 0, 0, 0);

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(0, 0, 0, 0);

    const { data: guestsExpiring1Day, error: error1Day } = await supabase
      .from("agency_guests")
      .select(
        `
        *,
        agencies(name, logo_url)
      `,
      )
      .eq("status", "accepted")
      .eq("notify_before_expiry", true)
      .gte("access_end_date", oneDayFromNow.toISOString())
      .lt("access_end_date", twoDaysFromNow.toISOString());

    if (error1Day) {
      console.error("Error fetching 1-day expiring guests:", error1Day);
    }

    const notifications = [];

    // Notificar convidados que expiram em 7 dias
    if (guestsExpiring7Days && guestsExpiring7Days.length > 0) {
      console.log(`Found ${guestsExpiring7Days.length} guests expiring in 7 days`);

      for (const guest of guestsExpiring7Days) {
        try {
          const emailResponse = await sendEmail({
            from: "Sua Agência <onboarding@resend.dev>",
            to: [guest.guest_email],
            subject: `⏰ Seu acesso expira em 10 dias - ${guest.agencies.name}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
                  .warning-box { 
                    background: #fff3cd; 
                    border-left: 4px solid #ffc107; 
                    padding: 15px; 
                    margin: 20px 0; 
                  }
                  .footer { 
                    text-align: center; 
                    padding-top: 20px; 
                    border-top: 2px solid #f0f0f0; 
                    color: #666; 
                    font-size: 12px; 
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>⏰ Lembrete de Expiração</h1>
                  </div>
                  
                  <div class="warning-box">
                    <p><strong>Atenção:</strong> Seu acesso aos eventos de <strong>${guest.agencies.name}</strong> expira em <strong>10 dias</strong>!</p>
                    <p>Data de expiração: <strong>${new Date(guest.access_end_date).toLocaleDateString("pt-BR")}</strong></p>
                  </div>
                  
                  <p>Após essa data, você não terá mais acesso aos eventos e submissões.</p>
                  
                  <p>Se precisar estender seu acesso, entre em contato com o administrador da agência.</p>
                  
                  <div class="footer">
                    <p>Esta é uma notificação automática de ${guest.agencies.name}</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          notifications.push({
            guest: guest.guest_email,
            days: 7,
            status: "sent",
            emailId: emailResponse.id,
          });
        } catch (error: any) {
          console.error(`Failed to send 7-day notification to ${guest.guest_email}:`, error);
          notifications.push({
            guest: guest.guest_email,
            days: 7,
            status: "failed",
            error: error.message,
          });
        }
      }
    }

    // Notificar convidados que expiram em 24 horas
    if (guestsExpiring1Day && guestsExpiring1Day.length > 0) {
      console.log(`Found ${guestsExpiring1Day.length} guests expiring in 1 day`);

      for (const guest of guestsExpiring1Day) {
        try {
          const emailResponse = await sendEmail({
            from: "Sua Agência <onboarding@resend.dev>",
            to: [guest.guest_email],
            subject: `🚨 URGENTE: Seu acesso expira em 24 horas - ${guest.agencies.name}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
                  .urgent-box { 
                    background: #f8d7da; 
                    border-left: 4px solid #dc3545; 
                    padding: 15px; 
                    margin: 20px 0; 
                  }
                  .footer { 
                    text-align: center; 
                    padding-top: 20px; 
                    border-top: 2px solid #f0f0f0; 
                    color: #666; 
                    font-size: 12px; 
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🚨 Aviso Urgente de Expiração</h1>
                  </div>
                  
                  <div class="urgent-box">
                    <p><strong>ATENÇÃO:</strong> Seu acesso aos eventos de <strong>${guest.agencies.name}</strong> expira em <strong>24 HORAS</strong>!</p>
                    <p>Data de expiração: <strong>${new Date(guest.access_end_date).toLocaleDateString("pt-BR")} às ${new Date(guest.access_end_date).toLocaleTimeString("pt-BR")}</strong></p>
                  </div>
                  
                  <p>Este é seu último dia com acesso aos eventos e submissões. Após a expiração, você não poderá mais:</p>
                  <ul>
                    <li>Visualizar eventos e submissões</li>
                    <li>Aprovar ou reprovar conteúdo</li>
                    <li>Acessar o dashboard de convidado</li>
                  </ul>
                  
                  <p><strong>Entre em contato com o administrador HOJE se precisar estender seu acesso.</strong></p>
                  
                  <div class="footer">
                    <p>Esta é uma notificação automática de ${guest.agencies.name}</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          notifications.push({
            guest: guest.guest_email,
            days: 1,
            status: "sent",
            emailId: emailResponse.id,
          });
        } catch (error: any) {
          console.error(`Failed to send 1-day notification to ${guest.guest_email}:`, error);
          notifications.push({
            guest: guest.guest_email,
            days: 1,
            status: "failed",
            error: error.message,
          });
        }
      }
    }

    console.log("Notifications sent:", notifications);

    return new Response(
      JSON.stringify({
        success: true,
        notifications,
        summary: {
          total: notifications.length,
          sent: notifications.filter((n) => n.status === "sent").length,
          failed: notifications.filter((n) => n.status === "failed").length,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in notify-guest-expiration function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
