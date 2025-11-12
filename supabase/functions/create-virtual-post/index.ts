import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[create-virtual-post] No authorization header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validar JWT do usuário
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('[create-virtual-post] Invalid token:', authError)
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { event_id } = await req.json()

    if (!event_id) {
      console.error('[create-virtual-post] Missing event_id')
      return new Response(JSON.stringify({ error: 'event_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[create-virtual-post] Creating virtual post for user:', user.id, 'event:', event_id)

    // Buscar dados do evento
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, agency_id, title')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      console.error('[create-virtual-post] Event not found:', eventError)
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validar que usuário pertence à agência do evento
    const { data: userAgency, error: agencyError } = await supabaseClient
      .from('user_agencies')
      .select('agency_id')
      .eq('user_id', user.id)
      .eq('agency_id', event.agency_id)
      .single()

    if (agencyError || !userAgency) {
      console.error('[create-virtual-post] User does not belong to event agency:', agencyError)
      return new Response(JSON.stringify({ 
        error: 'User does not belong to event agency' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ✅ NOVO: Verificar se já existe post virtual para este evento (reutilizar se existir)
    const { data: existingPost, error: existingPostError } = await supabaseClient
      .from('posts')
      .select('id')
      .eq('event_id', event.id)
      .eq('post_number', 0)
      .eq('post_type', 'venda')
      .maybeSingle()

    if (existingPost) {
      console.log('[create-virtual-post] Reusing existing virtual post:', existingPost.id)
      return new Response(JSON.stringify({ 
        post_id: existingPost.id,
        event_id: event.id,
        reused: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ✅ Criar post virtual apenas se não existir (service_role bypassa RLS)
    const { data: virtualPost, error: postError } = await supabaseClient
      .from('posts')
      .insert({
        event_id: event.id,
        post_number: 0,
        deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: user.id,
        agency_id: event.agency_id,
        post_type: 'venda', // ✅ Corrigido: usar 'venda' (PT) ao invés de 'sale' (EN)
      })
      .select()
      .single()

    if (postError) {
      console.error('[create-virtual-post] Error creating post:', postError)
      return new Response(JSON.stringify({ error: postError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[create-virtual-post] Success - Created virtual post:', virtualPost.id)

    return new Response(JSON.stringify({ 
      post_id: virtualPost.id,
      event_id: event.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[create-virtual-post] Exception:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
