/**
 * Consolidated Profiles Query Hook
 * ✅ Sprint 2A: Consolida queries de perfis
 * 
 * @uses profileService.getProfiles, profileService.getCurrentUserProfile
 */

import { useQuery } from '@tanstack/react-query';
import { getProfiles, getCurrentUserProfile, getAgencyProfiles, getUserStats } from '@/services/profileService';

export interface UseProfilesQueryParams {
  agencyId?: string;
  email?: string;
  enabled?: boolean;
}

/**
 * Hook consolidado para buscar perfis
 * - Usa profileService da Sprint 1
 * - Suporta filtros de agência e email
 * 
 * @example
 * const { data, isLoading } = useProfilesQuery({ agencyId: 'abc123' });
 */
export const useProfilesQuery = ({ 
  agencyId,
  email,
  enabled = true
}: UseProfilesQueryParams = {}) => {
  return useQuery({
    queryKey: ['profiles', agencyId, email],
    queryFn: async () => {
      const { data, error } = await getProfiles({ agencyId, email });
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};

/**
 * Hook para buscar perfil do usuário logado
 * 
 * @example
 * const { data: profile, isLoading } = useCurrentUserProfileQuery();
 */
export const useCurrentUserProfileQuery = () => {
  return useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      const { data, error } = await getCurrentUserProfile();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (perfil muda raramente)
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};

/**
 * Hook para buscar perfis de uma agência
 * 
 * @example
 * const { data: profiles } = useAgencyProfilesQuery('abc123');
 */
export const useAgencyProfilesQuery = (agencyId: string) => {
  return useQuery({
    queryKey: ['agencyProfiles', agencyId],
    queryFn: async () => {
      const { data, error } = await getAgencyProfiles(agencyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};

/**
 * Hook para buscar estatísticas de um usuário
 * 
 * @example
 * const { data: stats } = useUserStatsQuery(userId);
 */
export const useUserStatsQuery = (userId: string) => {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      const { data, error } = await getUserStats(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};
