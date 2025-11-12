import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';

export type UserRole = 'agency_admin' | 'master_admin' | 'guest';

interface UseUserRoleQueryReturn {
  roles: UserRole[];
  loading: boolean;
  hasRole: (role: UserRole) => boolean;
  isAgencyAdmin: boolean;
  isMasterAdmin: boolean;
}

export const useUserRoleQuery = (): UseUserRoleQueryReturn => {
  const { user } = useAuthStore();
  const [debugMode] = useState(() => new URLSearchParams(window.location.search).has('debug'));

  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user) {
        if (debugMode) console.log('🔐 [useUserRoleQuery] No user, retornando []');
        return [];
      }

      // Verificar sessão antes de buscar roles
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (debugMode) console.log('🔐 [useUserRoleQuery] No session, retornando []');
        return [];
      }

      if (debugMode) console.log('🔐 [useUserRoleQuery] Buscando roles para user:', user.id);

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ [useUserRoleQuery] Erro ao buscar roles:', error);
        if (debugMode) {
          console.error('❌ Detalhes do erro:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
        }
        return [];
      }

      const rolesArray = data?.map(r => r.role as UserRole) || [];
      if (debugMode) {
        console.log('✅ [useUserRoleQuery] Roles carregadas:', rolesArray);
      }

      return rolesArray;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3, // 🆕 FASE 1: Tentar 3x em caso de erro
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 🆕 FASE 1: Backoff exponencial
  });

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  // 🆕 FASE 1: Logger de estado em modo debug
  useEffect(() => {
    if (debugMode) {
      console.log('📊 [useUserRoleQuery] Estado atual:', {
        user: user?.id,
        roles,
        loading: isLoading,
        isAgencyAdmin: roles.includes('agency_admin'),
        isMasterAdmin: roles.includes('master_admin'),
        error: error?.message,
      });
    }
  }, [user, roles, isLoading, error, debugMode]);

  return {
    roles,
    loading: isLoading, // ✅ SOLUÇÃO 3: Removido isFetching para evitar loading desnecessário
    hasRole,
    isAgencyAdmin: roles.includes('agency_admin'),
    isMasterAdmin: roles.includes('master_admin'),
  };
};
