import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useUserRole } from "@/hooks/useUserRole";

export const AdminTutorialGuide = () => {
  const { user } = useAuthStore();
  const { isAgencyAdmin } = useUserRole();

  useEffect(() => {
    const checkAndStartTutorial = async () => {
      if (!user || !isAgencyAdmin) return;

      // Verificar se o tutorial já foi completado
      const { data: profile } = await supabase
        .from("profiles")
        .select("tutorial_completed")
        .eq("id", user.id)
        .single();

      if (profile?.tutorial_completed) return;

      // Aguardar um pouco para garantir que os elementos estão renderizados
      setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          steps: [
            {
              element: "#stats-cards",
              popover: {
                title: "🎉 Bem-vindo ao Painel de Agência!",
                description:
                  "Aqui você tem acesso a todas as estatísticas da sua agência: eventos ativos, postagens cadastradas e submissões recebidas.",
                side: "bottom",
                align: "start",
              },
            },
            {
              element: "#create-event-button",
              popover: {
                title: "📅 Criar Eventos",
                description:
                  "Use este botão para criar novos eventos. Você pode configurar requisitos de posts, vendas, datas e muito mais.",
                side: "bottom",
                align: "start",
              },
            },
            {
              element: "#submissions-tab",
              popover: {
                title: "📋 Gerenciar Submissões",
                description:
                  "Aqui você aprova ou rejeita as submissões dos influenciadores. Você pode filtrar por evento, post e status.",
                side: "top",
                align: "start",
              },
            },
            {
              element: "#users-tab",
              popover: {
                title: "👥 Gerenciar Usuários",
                description:
                  "Visualize e gerencie todos os usuários vinculados à sua agência. Acompanhe o desempenho de cada influenciador.",
                side: "top",
                align: "start",
              },
            },
            {
              element: "#settings-tab",
              popover: {
                title: "⚙️ Configurações",
                description:
                  "Configure as informações da sua agência, gere links de cadastro e personalize templates de rejeição.",
                side: "top",
                align: "start",
              },
            },
            {
              popover: {
                title: "✅ Tudo Pronto!",
                description:
                  "Agora você está pronto para gerenciar sua agência. Boa sorte! 🚀",
              },
            },
          ],
          onDestroyStarted: async () => {
            // Marcar tutorial como completado
            await supabase
              .from("profiles")
              .update({ tutorial_completed: true })
              .eq("id", user.id);
            driverObj.destroy();
          },
        });

        driverObj.drive();
      }, 1000);
    };

    checkAndStartTutorial();
  }, [user, isAgencyAdmin]);

  return null;
};
