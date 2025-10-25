import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export const TutorialGuide = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    const checkAndStartTutorial = async () => {
      if (!user) return;

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
              element: "#welcome-card",
              popover: {
                title: "🎉 Bem-vindo ao Sistema!",
                description:
                  "Vamos fazer um tour rápido para você conhecer as funcionalidades principais. Você pode pular a qualquer momento.",
                side: "bottom",
                align: "start",
              },
            },
            {
              element: "#events-section",
              popover: {
                title: "📅 Escolha um Evento",
                description:
                  "Aqui você encontra todos os eventos ativos. Clique em um para ver os detalhes e fazer suas submissões.",
                side: "top",
                align: "start",
              },
            },
            {
              element: "#submit-button",
              popover: {
                title: "📸 Enviar Postagem",
                description:
                  "Depois de escolher um evento e fazer sua postagem no Instagram, clique aqui para enviar o print de comprovação.",
                side: "left",
                align: "start",
              },
            },
            {
              element: "#stats-section",
              popover: {
                title: "📊 Acompanhe seu Progresso",
                description:
                  "Aqui você vê suas estatísticas: posts aprovados, eventos ativos e seu desempenho geral.",
                side: "top",
                align: "start",
              },
            },
            {
              popover: {
                title: "✅ Tudo Pronto!",
                description:
                  "Agora você está pronto para começar. Boa sorte com suas submissões! 🚀",
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
  }, [user]);

  return null;
};
