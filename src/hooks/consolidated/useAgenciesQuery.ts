import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * ✅ Hook consolidado para buscar agências de um usuário
 * Substitui: useUserAgencies (useReactQuery.ts)
 */

interface AgencyWithRelations {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  subscription_status: string;
  subscription_plan: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  created_at: string;
}

export const useUserAgenciesQuery = (userId?: string) => {
  return useQuery({
    queryKey: ['user-agencies', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_agencies')
        .select(`
          agency_id,
          agencies(
            id,
            name,
            slug,
            logo_url,
            subscription_status,
            subscription_plan,
            trial_start_date,
            trial_end_date,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Flatten: retornar array de agências
      return (data || [])
        .map((ua: any) => ua.agencies)
        .filter(Boolean) as AgencyWithRelations[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
