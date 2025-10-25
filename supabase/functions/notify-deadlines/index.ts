import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Buscar posts com deadlines próximos
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select(`
        id,
        post_number,
        deadline,
        event_id,
        events!inner (
          title,
          is_active
        )
      `)
      .eq('events.is_active', true)
      .gte('deadline', now.toISOString())
      .lte('deadline', in7Days.toISOString())

    if (postsError) throw postsError

    // Buscar usuários que ainda não enviaram essas postagens
    for (const post of posts || []) {
      const { data: submissions } = await supabaseAdmin
        .from('submissions')
        .select('user_id')
        .eq('post_id', post.id)

      const submittedUserIds = new Set(submissions?.map(s => s.user_id) || [])

      // Buscar todos os usuários (exceto os que já enviaram)
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()

      for (const user of users?.users || []) {
        if (submittedUserIds.has(user.id) || !user.email) continue

        // Verificar preferências de notificação
        const { data: prefs } = await supabaseAdmin
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        // Se não tiver preferências, criar com valores padrão
        if (!prefs) {
          await supabaseAdmin
            .from('notification_preferences')
            .insert({
              user_id: user.id,
              email_notifications: true,
              deadline_24h: true,
              deadline_3days: true,
              deadline_7days: true
            })
        }

        const preferences = prefs || {
          email_notifications: true,
          deadline_24h: true,
          deadline_3days: true,
          deadline_7days: true
        }

        if (!preferences.email_notifications) continue

        const deadline = new Date(post.deadline)
        const timeUntilDeadline = deadline.getTime() - now.getTime()
        const hoursUntil = timeUntilDeadline / (1000 * 60 * 60)

        let shouldNotify = false
        let notificationType = ''

        if (hoursUntil <= 24 && hoursUntil > 20 && preferences.deadline_24h) {
          shouldNotify = true
          notificationType = '24 horas'
        } else if (hoursUntil <= 72 && hoursUntil > 68 && preferences.deadline_3days) {
          shouldNotify = true
          notificationType = '3 dias'
        } else if (hoursUntil <= 168 && hoursUntil > 164 && preferences.deadline_7days) {
          shouldNotify = true
          notificationType = '7 dias'
        }

        if (shouldNotify) {
          // Enviar email via Supabase Auth
          const emailHtml = `
            <h2>⏰ Lembrete: Prazo se aproximando!</h2>
            <p>Olá!</p>
            <p>O prazo para enviar a <strong>Postagem #${post.post_number}</strong> do evento <strong>${(post.events as any)?.title}</strong> está se aproximando!</p>
            <p><strong>Prazo:</strong> ${deadline.toLocaleString('pt-BR')}</p>
            <p>Faltam aproximadamente <strong>${notificationType}</strong> para o prazo final.</p>
            <p>Não perca a oportunidade! <a href="${Deno.env.get('VITE_SUPABASE_URL')}/submit">Envie sua postagem agora</a>.</p>
            <br>
            <p><small>Para alterar suas preferências de notificação, acesse seu dashboard.</small></p>
          `

          console.log(`Notificando ${user.email} sobre post #${post.post_number} (${notificationType})`)
          
          // Aqui você pode integrar com um serviço de email
          // Por enquanto, apenas registramos no console
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificações processadas com sucesso',
        postsChecked: posts?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in notify-deadlines:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
