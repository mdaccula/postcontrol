import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

type UserRole = 'user' | 'agency_admin' | 'master_admin';

interface UseUserRoleQueryReturn {
  roles: UserRole[];
  loading: boolean;
  hasRole: (role: UserRole) => boolean;
  isAgencyAdmin: boolean;
  isMasterAdmin: boolean;
}

export const useUserRoleQuery = (): UseUserRoleQueryReturn => {
  const { user } = useAuthStore();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return (data?.map(r => r.role as UserRole) || []);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados frescos
    gcTime: 10 * 60 * 1000, // 10 minutos - cache mantido na memória
    refetchOnWindowFocus: false, // Não refetch ao focar janela
    refetchOnReconnect: true, // Refetch ao reconectar internet
  });

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  return {
    roles,
    loading: isLoading,
    hasRole,
    isAgencyAdmin: roles.includes('agency_admin'),
    isMasterAdmin: roles.includes('master_admin'),
  };
};
