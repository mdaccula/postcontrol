import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GoalProgress {
  currentPosts: number;
  currentSales: number;
  requiredPosts: number;
  requiredSales: number;
  goalAchieved: boolean;
  goalAchievedAt: string | null;
  completionPercentage: number;
  postsRemaining: number;
  salesRemaining: number;
}

export const useUserGoalProgress = (eventId: string | null, userId: string | null) => {
  return useQuery({
    queryKey: ['user-goal-progress', eventId, userId],
    queryFn: async (): Promise<GoalProgress | null> => {
      if (!eventId || !userId) return null;

      const { data, error } = await supabase
        .from('user_event_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (error || !data) {
        // Se não existe, criar registro inicial
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('check_and_update_user_goal', {
            p_user_id: userId,
            p_event_id: eventId
          });
          
          // Buscar novamente
          const { data: newData } = await supabase
            .from('user_event_goals')
            .select('*')
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .single();
          
          if (newData) {
            return mapToGoalProgress(newData);
          }
        }
        return null;
      }

      return mapToGoalProgress(data);
    },
    enabled: !!eventId && !!userId,
    staleTime: 30000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

function mapToGoalProgress(data: any): GoalProgress {
  const total = data.required_posts + data.required_sales;
  const current = data.current_posts + data.current_sales;
  const completionPercentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return {
    currentPosts: data.current_posts,
    currentSales: data.current_sales,
    requiredPosts: data.required_posts,
    requiredSales: data.required_sales,
    goalAchieved: data.goal_achieved,
    goalAchievedAt: data.goal_achieved_at,
    completionPercentage,
    postsRemaining: Math.max(0, data.required_posts - data.current_posts),
    salesRemaining: Math.max(0, data.required_sales - data.current_sales),
  };
}
