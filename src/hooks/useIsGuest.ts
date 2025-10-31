import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface UseIsGuestReturn {
  isGuest: boolean;
  guestData: any | null;
  loading: boolean;
}

export const useIsGuest = (): UseIsGuestReturn => {
  const { user } = useAuthStore();

  const { data: guestData, isLoading } = useQuery({
    queryKey: ['isGuest', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('agency_guests')
        .select('*, guest_event_permissions(*)')
        .eq('guest_user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error checking guest status:', error);
        return null;
      }

      // Verificar se ainda está dentro do período de acesso
      const now = new Date();
      const startDate = new Date(data.access_start_date);
      const endDate = new Date(data.access_end_date);

      if (now < startDate || now > endDate) {
        return null;
      }

      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    isGuest: !!guestData,
    guestData,
    loading: isLoading,
  };
};
