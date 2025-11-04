import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validar autenticação JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Token de autenticação não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação é obrigatório' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Criar cliente com o token do usuário para validar autenticação
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Token inválido ou expirado:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Usuário autenticado: ${user.id}`);

    // 2. Validar se o usuário é agency_admin ou master_admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['agency_admin', 'master_admin']);

    if (roleError || !roleData || roleData.length === 0) {
      console.error('❌ Usuário não tem permissão de admin');
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas admins podem importar usuários.' }), 
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Permissão de admin validada');

    // 3. Buscar agency_id do usuário (se for agency_admin)
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single();

    const userAgencyId = profileData?.agency_id;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { users } = await req.json();
    
    // ✅ ITEM 1: Validar gêneros antes de processar
    const VALID_GENDERS = ['Masculino', 'Feminino', 'LGBTQ+', 'Agência'];
    
    const results = {
      success: [] as string[],
      errors: [] as { email: string; error: string }[]
    };

    for (const importUser of users) {
      // Validar gênero se fornecido
      if (importUser.gender && !VALID_GENDERS.includes(importUser.gender)) {
        results.errors.push({ 
          email: importUser.email, 
          error: `Gênero inválido: "${importUser.gender}". Valores permitidos: ${VALID_GENDERS.join(', ')}` 
        });
        continue;
      }
      try {
        // Criar usuário com senha padrão
        const { data, error } = await supabase.auth.admin.createUser({
          email: importUser.email,
          password: 'Temp@123!', // Senha padrão
          email_confirm: true, // Auto-confirmar email
          user_metadata: {
            full_name: importUser.full_name,
            instagram: importUser.instagram,
            phone: importUser.phone,
          }
        });

        if (error) throw error;

        // 4. Atualizar profile com agency_id e gender (se fornecidos)
        if (data.user) {
          const profileUpdate: any = {};
          
          if (userAgencyId) {
            profileUpdate.agency_id = userAgencyId;
          }
          
          if (importUser.gender) {
            profileUpdate.gender = importUser.gender;
          }
          
          if (Object.keys(profileUpdate).length > 0) {
            await supabase
              .from('profiles')
              .update(profileUpdate)
              .eq('id', data.user.id);
          }
        }
        
        results.success.push(importUser.email);
        
        // Enviar email de recuperação para o usuário definir sua senha
        await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: importUser.email,
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({ email: importUser.email, error: errorMessage });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
