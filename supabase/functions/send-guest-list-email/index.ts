import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuestListRegistration {
  full_name: string;
  email: string;
  gender: string;
  registered_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Iniciando verificação de eventos para envio de email...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    // Buscar datas de eventos que:
    // 1. Tem send_notification_email = true
    // 2. Ainda não enviou notificação (notification_sent_at IS NULL)
    // 3. Horário do evento já passou (event_date + start_time < now())
    const { data: datesToNotify, error: datesError } = await supabase
      .from("guest_list_dates")
      .select(`
        id,
        event_id,
        event_date,
        start_time,
        name,
        guest_list_events (
          id,
          name,
          agency_id,
          agencies (
            id,
            name,
            notification_email,
            admin_email
          )
        )
      `)
      .eq("send_notification_email", true)
      .is("notification_sent_at", null)
      .lt("event_date", new Date().toISOString());

    if (datesError) {
      console.error("❌ Erro ao buscar datas:", datesError);
      throw datesError;
    }

    if (!datesToNotify || datesToNotify.length === 0) {
      console.log("✅ Nenhum evento pendente de notificação");
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum evento pendente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Encontrados ${datesToNotify.length} eventos para notificar`);

    const results = [];

    for (const date of datesToNotify) {
      try {
        // Validar se start_time já passou (se configurado)
        if (date.start_time) {
          const eventDateTime = new Date(`${date.event_date}T${date.start_time}-03:00`);
          const now = new Date();
          
          if (eventDateTime > now) {
            console.log(`⏰ Evento ${date.id} ainda não iniciou. Pulando...`);
            continue;
          }
        }

        const event = date.guest_list_events;
        const agency = event?.agencies;

        if (!agency) {
          console.warn(`⚠️ Agência não encontrada para evento ${date.id}`);
          continue;
        }

        // Determinar email de destino (notification_email ou admin_email)
        const recipientEmail = agency.notification_email || agency.admin_email;

        if (!recipientEmail) {
          console.warn(`⚠️ Nenhum email configurado para agência ${agency.name}`);
          continue;
        }

        // Buscar todos os registros desta data
        const { data: registrations, error: regError } = await supabase
          .from("guest_list_registrations")
          .select("full_name, email, gender, registered_at")
          .eq("date_id", date.id)
          .order("registered_at", { ascending: true });

        if (regError) {
          console.error(`❌ Erro ao buscar registros da data ${date.id}:`, regError);
          continue;
        }

        const totalRegistrations = registrations?.length || 0;
        console.log(`📊 Data ${date.id}: ${totalRegistrations} participantes`);

        // Gerar HTML da tabela
        const participantsHTML = registrations
          ?.map((reg: GuestListRegistration, index: number) => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px; text-align: center;">${index + 1}</td>
              <td style="padding: 12px;">${reg.full_name}</td>
              <td style="padding: 12px;">${reg.email}</td>
              <td style="padding: 12px; text-align: center;">${reg.gender === 'female' ? 'Feminino' : 'Masculino'}</td>
              <td style="padding: 12px; text-align: center;">${new Date(reg.registered_at).toLocaleString('pt-BR')}</td>
            </tr>
          `)
          .join("") || '<tr><td colspan="5" style="padding: 12px; text-align: center;">Nenhum participante registrado</td></tr>';

        const eventName = date.name || new Date(date.event_date).toLocaleDateString('pt-BR');
        const eventLocation = event?.name || "Evento";

        const emailHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Lista de Participantes</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px;">📋 Lista de Participantes</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">${eventLocation} - ${eventName}</p>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; color: #1f2937;">📊 Resumo</h2>
              <p style="margin: 5px 0;"><strong>Total de participantes:</strong> ${totalRegistrations}</p>
              <p style="margin: 5px 0;"><strong>Data do evento:</strong> ${new Date(date.event_date).toLocaleDateString('pt-BR')}</p>
              ${date.start_time ? `<p style="margin: 5px 0;"><strong>Horário:</strong> ${date.start_time}</p>` : ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #667eea; color: white;">
                  <th style="padding: 12px; text-align: center;">#</th>
                  <th style="padding: 12px; text-align: left;">Nome</th>
                  <th style="padding: 12px; text-align: left;">Email</th>
                  <th style="padding: 12px; text-align: center;">Gênero</th>
                  <th style="padding: 12px; text-align: center;">Data de Inscrição</th>
                </tr>
              </thead>
              <tbody>
                ${participantsHTML}
              </tbody>
            </table>

            <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Este email foi enviado automaticamente pelo sistema de lista VIP.<br>
                Agência: ${agency.name}
              </p>
            </div>
          </body>
          </html>
        `;

        // Enviar email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Lista VIP <noreply@domain.com.br>",
            to: [recipientEmail],
            subject: `📋 Lista de Participantes - ${eventLocation} (${eventName})`,
            html: emailHTML,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text();
          throw new Error(`Resend API error: ${errorData}`);
        }

        const emailData = await emailResponse.json();
        console.log(`✅ Email enviado para ${recipientEmail}:`, emailData);

        // Marcar como enviado
        const { error: updateError } = await supabase
          .from("guest_list_dates")
          .update({ notification_sent_at: new Date().toISOString() })
          .eq("id", date.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar notification_sent_at:`, updateError);
        }

        results.push({
          date_id: date.id,
          event_name: eventName,
          recipient: recipientEmail,
          participants: totalRegistrations,
          success: true,
        });

      } catch (error: any) {
        console.error(`❌ Erro ao processar data ${date.id}:`, error);
        results.push({
          date_id: date.id,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
