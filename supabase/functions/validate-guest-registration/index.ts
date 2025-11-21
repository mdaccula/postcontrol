import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Lista expandida de domínios temporários/descartáveis (Top 100)
const DISPOSABLE_DOMAINS = [
  'guerrillamail.com', 'mailinator.com', '10minutemail.com',
  'tempmail.com', 'throwaway.email', 'maildrop.cc', 'temp-mail.org',
  'getnada.com', 'trashmail.com', 'yopmail.com', 'emailondeck.com',
  'spam4.me', 'mailnesia.com', 'mintemail.com', 'sharklasers.com',
  'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'tafmail.com', 'fakeinbox.com', 'mailcatch.com', 'mytrashmail.com',
  '10minutemail.co.uk', 'tempinbox.com', 'dispostable.com', 'throwawaymail.com',
  'getairmail.com', 'mailexpire.com', 'meltmail.com', 'spamgourmet.com',
  'mailforspam.com', 'mailmoat.com', 'spamex.com', 'incognitomail.org',
  'mailcatch.com', 'throwmail.com', 'filzmail.com', 'fakemailgenerator.com',
  'anonymbox.com', 'deadaddress.com', 'spambox.us', 'receivemail.org',
  'tempmailaddress.com', 'fakemail.fr', 'inboxalias.com', 'mailimex.com',
  'anonymousemail.me', 'tempmailo.com', 'mohmal.com', 'spambog.com',
  'mailzi.ru', 'emailfake.com', 'spamthisplease.com', 'jetable.org',
  'drdrb.com', 'klzlk.com', 'zwoho.com', 'bumpymail.com',
  'discard.email', 'fudgerub.com', 'letthemeatspam.com', 'thankyou2010.com',
  'thisisnotmyrealemail.com', 'trash-mail.com', 'crazymailing.com', 'hot-mail.cf',
  'instant-mail.de', 'mailbidon.com', 'mailimate.com', 'mt2014.com',
  'mt2015.com', 'mytemp.email', 'onewaymail.com', 'pookmail.com',
  'rhyta.com', 'sharklasers.com', 'teleworm.us', 'tmails.net',
  'trbvm.com', 'wegwerfmail.de', 'wegwerpmailadres.nl', 'zehnminutenmail.de',
  'boximail.com', 'fmail.info', 'fakeinbox.cf', 'fakemail.ga',
  'dropmail.me', 'moakt.com', 'armyspy.com', 'cuvox.de',
  'dayrep.com', 'einrot.com', 'fleckens.hu', 'gustr.com',
  'jourrapide.com', 'superrito.com', 'teewars.org', 'fakemail.fr',
  'emailfake.com', 'emailondeck.com', 'spambog.ru', 'spambog.de'
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      honeypot, 
      eventId, 
      dateId, 
      fullName, 
      gender, 
      utmParams 
    } = await req.json();
    
    console.log('[GUEST-VALIDATION] 🚀 Iniciando validação', { 
      email, 
      eventId, 
      hasHoneypot: !!honeypot 
    });

    // 1️⃣ VALIDAÇÃO HONEYPOT
    if (honeypot && honeypot.trim() !== '') {
      console.log('[GUEST-VALIDATION] 🤖 Bot detectado via honeypot:', { email, honeypot });
      return new Response(
        JSON.stringify({ 
          error: 'Requisição inválida', 
          isBotSuspected: true 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 2️⃣ VALIDAÇÃO EMAIL TEMPORÁRIO
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const isDisposable = DISPOSABLE_DOMAINS.includes(emailDomain);
    
    if (isDisposable) {
      console.log('[GUEST-VALIDATION] 🚫 Email temporário detectado:', { email, domain: emailDomain });
      return new Response(
        JSON.stringify({ 
          error: 'Emails temporários não são permitidos. Use um email válido.', 
          isDisposable: true 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 3️⃣ CAPTURAR IP E USER AGENT
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log('[GUEST-VALIDATION] 📋 Informações do cliente', { 
      ipAddress, 
      userAgent: userAgent.substring(0, 50) 
    });

    // 4️⃣ CRIAR CLIENTE SUPABASE
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 5️⃣ VERIFICAR DUPLICATAS (mesmo email + mesmo evento + mesma data)
    const { data: existingReg, error: checkError } = await supabase
      .from('guest_list_registrations')
      .select('id, full_name, registered_at')
      .eq('event_id', eventId)
      .eq('date_id', dateId)
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('[GUEST-VALIDATION] ❌ Erro ao verificar duplicatas:', checkError);
    }

    if (existingReg) {
      console.log('[GUEST-VALIDATION] ⚠️ Email já cadastrado neste evento:', { 
        email, 
        eventId, 
        existingId: existingReg.id 
      });
      return new Response(
        JSON.stringify({ 
          error: 'Este email já está cadastrado nesta data do evento.', 
          isDuplicate: true,
          existingRegistration: {
            id: existingReg.id,
            name: existingReg.full_name,
            date: existingReg.registered_at
          }
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 6️⃣ REGISTRAR INSCRIÇÃO VÁLIDA
    const { data, error } = await supabase
      .from('guest_list_registrations')
      .insert({
        event_id: eventId,
        date_id: dateId,
        full_name: fullName,
        email: email,
        gender: gender,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_bot_suspected: false,
        utm_source: utmParams?.source || null,
        utm_medium: utmParams?.medium || null,
        utm_campaign: utmParams?.campaign || null
      })
      .select()
      .single();

    if (error) {
      console.error('[GUEST-VALIDATION] ❌ Erro ao inserir registro:', error);
      throw error;
    }

    console.log('[GUEST-VALIDATION] ✅ Registro criado com sucesso:', { 
      id: data.id, 
      email, 
      eventId 
    });

    // 7️⃣ REGISTRAR EVENTO DE ANALYTICS (submission)
    await supabase
      .from('guest_list_analytics')
      .insert({
        event_id: eventId,
        date_id: dateId,
        event_type: 'submission',
        ip_address: ipAddress,
        user_agent: userAgent,
        utm_params: utmParams || null
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        registration: data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error('[GUEST-VALIDATION] ❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao processar sua inscrição. Tente novamente.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});