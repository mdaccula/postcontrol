import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui/card";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Trophy, Flame, Rocket, Star } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

interface Badge {
  id: string;
  badge_type: string;
  earned_at: string;
  event_id: string | null;
}

const BADGE_CONFIG = {
  first_approval: {
    icon: Trophy,
    label: "Primeira Aprovação",
    color: "bg-yellow-500",
    emoji: "🥇",
  },
  streak_5: {
    icon: Flame,
    label: "Streak de 5 Posts",
    color: "bg-orange-500",
    emoji: "🔥",
  },
  event_100: {
    icon: Rocket,
    label: "100% Conclusão",
    color: "bg-green-500",
    emoji: "🚀",
  },
  top_10: {
    icon: Star,
    label: "Top 10 Colaborador",
    color: "bg-purple-500",
    emoji: "⭐",
  },
};

export const BadgeDisplay = () => {
  const { user } = useAuthStore();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  useEffect(() => {
    if (!user) return;

    loadBadges();

    // Subscrever a novos badges
    const channel = supabase
      .channel("user_badges_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_badges",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const badge = payload.new as Badge;
          setNewBadge(badge);
          celebrateBadge();
          setTimeout(() => setNewBadge(null), 5000);
          loadBadges();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const loadBadges = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    if (data) setBadges(data);
  };

  const celebrateBadge = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  if (badges.length === 0) return null;

  return (
    <>
      <Card className="p-4">
        <h3 className="font-bold text-lg mb-3">🏆 Conquistas</h3>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => {
            const config = BADGE_CONFIG[badge.badge_type as keyof typeof BADGE_CONFIG];
            if (!config) return null;

            const Icon = config.icon;

            return (
              <motion.div
                key={badge.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
              >
                <BadgeUI
                  variant="secondary"
                  className={`${config.color} text-white flex items-center gap-1 cursor-pointer`}
                  title={`Conquistado em ${new Date(badge.earned_at).toLocaleDateString("pt-BR")}`}
                >
                  <Icon className="h-3 w-3" />
                  {config.emoji} {config.label}
                </BadgeUI>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Toast de novo badge */}
      <AnimatePresence>
        {newBadge && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Card className="p-6 bg-gradient-primary text-white shadow-2xl">
              <div className="text-center space-y-2">
                <div className="text-4xl">
                  {BADGE_CONFIG[newBadge.badge_type as keyof typeof BADGE_CONFIG]?.emoji}
                </div>
                <h4 className="font-bold text-xl">Nova Conquista!</h4>
                <p className="text-sm opacity-90">
                  {BADGE_CONFIG[newBadge.badge_type as keyof typeof BADGE_CONFIG]?.label}
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
