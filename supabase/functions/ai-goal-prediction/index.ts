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
    const { eventId, userId } = await req.json();

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
Analise os dados de progresso do usuário neste evento:
- Total de posts necessários: ${totalPosts}
- Posts aprovados: ${approvedPosts}
- Posts pendentes: ${pendingPosts}
- Dias restantes até próximo deadline: ${daysRemaining}

Com base nisso, calcule:
1. Probabilidade (0-100%) de atingir a meta de 100% de conclusão
2. Sugestões práticas para melhorar as chances (max 3 sugestões curtas)

Responda em formato JSON:
{
  "probability": 75,
  "suggestions": ["Envie os posts pendentes hoje", "Revise os requisitos", "Agende posts para os próximos dias"]
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

    let prediction;
    try {
      prediction = JSON.parse(aiContent);
    } catch {
      prediction = {
        probability: Math.round((approvedPosts / totalPosts) * 100),
        suggestions: ["Continue enviando posts regularmente"],
      };
    }

    return new Response(
      JSON.stringify({
        ...prediction,
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
