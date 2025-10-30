import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🗑️ Delete User Function - Iniciando...');

    // Criar cliente admin com service role (tem permissão para deletar usuários)
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

    // Extrair userId do body
    const { userId } = await req.json()
    
    if (!userId) {
      console.error('❌ userId não fornecido');
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🔍 Tentando deletar usuário: ${userId}`);

    // Deletar usuário usando service role (tem permissão total)
    // Isso automaticamente deleta os dados relacionados devido ao ON DELETE CASCADE
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('❌ Erro ao deletar usuário:', error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Usuário deletado com sucesso:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário deletado com sucesso',
        data 
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('💥 Exception ao deletar usuário:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
