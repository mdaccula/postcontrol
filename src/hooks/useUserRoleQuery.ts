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

  const { data: roles = [], isLoading, isFetching } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      // Verificar sessão antes de buscar roles
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ [useUserRoleQuery] Erro ao buscar roles:', error.message);
        return [];
      }

      return data?.map(r => r.role as UserRole) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // ✅ FASE 1: Cache de 5 minutos
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  return {
    roles,
    loading: isLoading || isFetching,
    hasRole,
    isAgencyAdmin: roles.includes('agency_admin'),
    isMasterAdmin: roles.includes('master_admin'),
  };
};
