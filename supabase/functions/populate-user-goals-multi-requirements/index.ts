import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingResult {
  eventId: string;
  eventTitle: string;
  totalUsers: number;
  usersWithGoals: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Iniciando migração de metas múltiplas...');

    // Buscar eventos que tenham regras em event_requirements OU submissões aprovadas
    const { data: eventIdsWithRequirements } = await supabase
      .from('event_requirements')
      .select('event_id');

    const eventIds = [...new Set(eventIdsWithRequirements?.map(r => r.event_id) || [])];

    console.log(`📋 Encontrados ${eventIds.length} eventos com regras em event_requirements`);

    if (eventIds.length === 0) {
      console.log('⚠️ Nenhum evento com regras encontrado');
      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            eventsProcessed: 0,
            totalUsers: 0,
            usersWithGoals: 0,
            totalErrors: 0,
          },
          details: [],
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Buscar detalhes dos eventos
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        agency_id,
        required_posts,
        required_sales
      `)
      .in('id', eventIds);

    if (eventsError) {
      throw new Error(`Erro ao buscar eventos: ${eventsError.message}`);
    }

    console.log(`📋 Processando ${events?.length || 0} eventos`);

    const results: ProcessingResult[] = [];

    // Processar cada evento
    for (const event of events || []) {
      console.log(`\n🎯 Processando evento: ${event.title}`);
      
      const eventResult: ProcessingResult = {
        eventId: event.id,
        eventTitle: event.title,
        totalUsers: 0,
        usersWithGoals: 0,
        errors: [],
      };

      try {
        // Buscar todas as regras de event_requirements para este evento
        const { data: requirements, error: reqError } = await supabase
          .from('event_requirements')
          .select('*')
          .eq('event_id', event.id)
          .order('display_order');

        if (reqError) {
          eventResult.errors.push(`Erro ao buscar regras: ${reqError.message}`);
          results.push(eventResult);
          continue;
        }

        console.log(`  📝 ${requirements?.length || 0} regras encontradas`);

        // Buscar todos os usuários com submissões aprovadas neste evento
        const { data: submissions, error: subError } = await supabase
          .from('submissions')
          .select('user_id, submission_type, status')
          .eq('event_id', event.id)
          .eq('status', 'approved');

        if (subError) {
          eventResult.errors.push(`Erro ao buscar submissões: ${subError.message}`);
          results.push(eventResult);
          continue;
        }

        // Agrupar submissões por usuário
        const userStats = new Map<string, { posts: number; sales: number }>();
        
        for (const sub of submissions || []) {
          const current = userStats.get(sub.user_id) || { posts: 0, sales: 0 };
          // CORREÇÃO: Posts = tudo que NÃO é venda (divulgacao, selecao_perfil, etc)
          if (sub.submission_type !== 'sale') current.posts++;
          if (sub.submission_type === 'sale') current.sales++;
          userStats.set(sub.user_id, current);
        }

        eventResult.totalUsers = userStats.size;
        console.log(`  👥 ${eventResult.totalUsers} usuários com submissões`);

        // Para cada usuário, verificar se bateu alguma regra
        for (const [userId, stats] of userStats.entries()) {
          let achievedReqId: string | null = null;
          let achievedReqPosts = event.required_posts || 0;
          let achievedReqSales = event.required_sales || 0;
          let goalAchieved = false;

          // Verificar se bateu alguma regra de event_requirements
          if (requirements && requirements.length > 0) {
            for (const req of requirements) {
              if (stats.posts >= req.required_posts && stats.sales >= req.required_sales) {
                achievedReqId = req.id;
                achievedReqPosts = req.required_posts;
                achievedReqSales = req.required_sales;
                goalAchieved = true;
                break;
              }
            }
          } else {
            // Fallback: usar eventos.required_posts/sales
            if (stats.posts >= (event.required_posts || 0) && 
                stats.sales >= (event.required_sales || 0)) {
              goalAchieved = true;
            }
          }

          // Inserir/atualizar user_event_goals
          const { error: upsertError } = await supabase
            .from('user_event_goals')
            .upsert({
              user_id: userId,
              event_id: event.id,
              agency_id: event.agency_id,
              current_posts: stats.posts,
              current_sales: stats.sales,
              required_posts: achievedReqPosts,
              required_sales: achievedReqSales,
              goal_achieved: goalAchieved,
              goal_achieved_at: goalAchieved ? new Date().toISOString() : null,
              achieved_requirement_id: achievedReqId,
            }, {
              onConflict: 'user_id,event_id',
            });

          if (upsertError) {
            eventResult.errors.push(`Erro ao atualizar usuário ${userId}: ${upsertError.message}`);
          } else if (goalAchieved) {
            eventResult.usersWithGoals++;
          }
        }

        console.log(`  ✅ ${eventResult.usersWithGoals} usuários bateram a meta`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        eventResult.errors.push(errorMsg);
        console.error(`  ❌ Erro: ${errorMsg}`);
      }

      results.push(eventResult);
    }

    // Resumo final
    const totalProcessed = results.reduce((sum, r) => sum + r.totalUsers, 0);
    const totalWithGoals = results.reduce((sum, r) => sum + r.usersWithGoals, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log('\n📊 RESUMO DA MIGRAÇÃO:');
    console.log(`   Eventos processados: ${results.length}`);
    console.log(`   Usuários processados: ${totalProcessed}`);
    console.log(`   Metas atingidas: ${totalWithGoals}`);
    console.log(`   Erros: ${totalErrors}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          eventsProcessed: results.length,
          totalUsers: totalProcessed,
          usersWithGoals: totalWithGoals,
          totalErrors,
        },
        details: results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
