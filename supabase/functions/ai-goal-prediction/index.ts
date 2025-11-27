import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
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

    const { eventId, userId } = await req.json();

    // 2. Validar se o usuário tem permissão (próprio userId ou é admin)
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['agency_admin', 'master_admin']);

    const isAdmin = roleData && roleData.length > 0;
    const isOwnData = user.id === userId;

    if (!isAdmin && !isOwnData) {
      console.error('❌ Usuário sem permissão para acessar dados de outro usuário');
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Você só pode ver suas próprias previsões.' }), 
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Permissão validada');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do evento
    const { data: event } = await supabase
      .from("events")
      .select("*, posts(*)")
      .eq("id", eventId)
      .single();

    if (!event) {
      throw new Error("Event not found");
    }

    // Buscar submissões do usuário neste evento
    const { data: submissions } = await supabase
      .from("submissions")
      .select("*, posts(*)")
      .eq("user_id", userId)
      .in(
        "post_id",
        event.posts.map((p: any) => p.id)
      );

    const totalPosts = event.posts.length;
    const approvedPosts = submissions?.filter((s: any) => s.status === "approved").length || 0;
    const pendingPosts = submissions?.filter((s: any) => s.status === "pending").length || 0;

    // Calcular dias restantes até o próximo deadline
    const nextDeadline = event.posts
      .map((p: any) => new Date(p.deadline))
      .filter((d: Date) => d > new Date())
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    const daysRemaining = nextDeadline
      ? Math.ceil((nextDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Chamar Lovable AI para previsão
    const prompt = `
Você é um consultor de marketing especializado em eventos e gestão de influencers.

Analise os dados do evento e forneça insights acionáveis:

EVENTO: ${event.title}
META: ${totalPosts} posts até ${event.event_date}

DADOS ATUAIS:
- Posts aprovados: ${approvedPosts}/${totalPosts}
- Posts pendentes: ${pendingPosts}
- Dias restantes: ${daysRemaining}

FORNEÇA:
1. Probabilidade de sucesso (0-100%)
2. 3 riscos específicos identificados
3. 3 recomendações práticas e acionáveis
4. 1 insight surpreendente baseado nos dados

Responda em JSON:
{
  "probability": 85,
  "risks": ["Risco 1", "Risco 2", "Risco 3"],
  "recommendations": ["Ação 1", "Ação 2", "Ação 3"],
  "insight": "Insight surpreendente"
}
`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";

    let aiPrediction;
    try {
      aiPrediction = JSON.parse(aiContent);
    } catch {
      aiPrediction = {
        probability: Math.round((approvedPosts / totalPosts) * 100),
        risks: ["Dados insuficientes para análise detalhada"],
        recommendations: ["Continue enviando posts regularmente"],
        insight: "Mantenha o ritmo de postagens para atingir a meta"
      };
    }

    // Calcular data prevista de esgotamento baseado na velocidade atual
    const postsRemaining = totalPosts - approvedPosts;
    const avgPostsPerDay = daysRemaining > 0 ? approvedPosts / Math.max(1, 30 - daysRemaining) : 0;
    const daysToComplete = avgPostsPerDay > 0 ? postsRemaining / avgPostsPerDay : daysRemaining || 7;
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + Math.ceil(daysToComplete));

    // Determinar nível de confiança baseado em dados disponíveis
    let confidenceLevel: 'baixa' | 'média' | 'alta' = 'média';
    if (approvedPosts < 3 || daysRemaining > 20) {
      confidenceLevel = 'baixa';
    } else if (approvedPosts >= 10 && daysRemaining <= 10) {
      confidenceLevel = 'alta';
    }

    const confidencePercentage = aiPrediction.probability || 
                                  Math.min(95, Math.max(20, Math.round((approvedPosts / totalPosts) * 100)));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Previsão gerada com sucesso",
        prediction: {
          predicted_exhaustion_date: predictedDate.toISOString(),
          confidence_level: confidenceLevel,
          confidence_percentage: confidencePercentage,
          hours_until_exhaustion: daysToComplete * 24,
          factors: aiPrediction.risks || [
            `${approvedPosts} posts aprovados de ${totalPosts} total`,
            `${pendingPosts} posts pendentes de aprovação`,
            `${daysRemaining} dias restantes até o evento`
          ],
          recommendations: aiPrediction.recommendations || [
            "Mantenha frequência constante de postagens",
            "Acompanhe aprovações diárias",
            "Engaje com seguidores para aumentar alcance"
          ],
          analysis: aiPrediction.insight || 
                   `Com base no ritmo atual de ${approvedPosts} posts aprovados, você está ${
                     approvedPosts >= totalPosts * 0.7 ? 'no caminho certo' : 'precisando acelerar'
                   } para atingir a meta de ${totalPosts} posts até ${event.event_date}.`
        },
        stats: {
          totalPosts,
          approvedPosts,
          pendingPosts,
          daysRemaining,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in ai-goal-prediction:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
