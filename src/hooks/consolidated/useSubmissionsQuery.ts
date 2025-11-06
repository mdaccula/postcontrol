/**
 * Consolidated Submissions Query Hook
 * ✅ Sprint 2A: Substitui useSubmissions de useReactQuery.ts e useAdminQueries.ts
 * 
 * @uses submissionService.getSubmissions
 */

import { useQuery } from '@tanstack/react-query';
import { getSubmissions } from '@/services/submissionService';
import { sb } from '@/lib/supabaseSafe';

export interface UseSubmissionsQueryParams {
  eventId?: string;
  status?: string;
  userId?: string;
  agencyId?: string;
  page?: number;
  itemsPerPage?: number;
  enrichProfiles?: boolean;
  enabled?: boolean;
}

/**
 * Hook consolidado para buscar submissões
 * - Substitui useSubmissions de useReactQuery.ts e useAdminQueries.ts
 * - Usa submissionService da Sprint 1
 * - Suporta paginação, filtros e enriquecimento de perfis
 * 
 * @example
 * const { data, isLoading } = useSubmissionsQuery({ 
 *   agencyId: 'abc123',
 *   status: 'pending',
 *   page: 1,
 *   itemsPerPage: 30,
 *   enrichProfiles: true
 * });
 */
export const useSubmissionsQuery = ({ 
  eventId,
  status,
  userId,
  agencyId,
  page = 1,
  itemsPerPage = 30,
  enrichProfiles = true,
  enabled = true
}: UseSubmissionsQueryParams = {}) => {
  return useQuery({
    queryKey: ['submissions', eventId, status, userId, agencyId, page, itemsPerPage],
    queryFn: async () => {
      // ✅ Usa submissionService da Sprint 1
      const { data: submissions, count, error } = await getSubmissions({
        eventId,
        status,
        userId,
        agencyId,
        page,
        itemsPerPage
      });

      if (error) throw error;

      // Se enrichProfiles = true, buscar perfis e contagens
      if (enrichProfiles && submissions && submissions.length > 0) {
        const userIds = Array.from(new Set(submissions.map(s => s.user_id)));

        // Buscar perfis e contagens em paralelo
        const [profilesData, countsData] = await Promise.all([
          sb.from('profiles')
            .select('id, full_name, email, instagram, avatar_url')
            .in('id', userIds)
            .then(res => res.data || []),
          
          sb.from('submissions')
            .select('user_id')
            .in('user_id', userIds)
            .then(res => {
              const counts: Record<string, number> = {};
              (res.data || []).forEach((s: any) => {
                counts[s.user_id] = (counts[s.user_id] || 0) + 1;
              });
              return counts;
            })
        ]);

        // Criar mapa de perfis por ID
        const profilesById: Record<string, any> = {};
        profilesData.forEach(p => { 
          profilesById[p.id] = p; 
        });

        // Enriquecer submissões com perfis e contagens
        const enrichedSubmissions = submissions.map(s => ({
          ...s,
          profiles: profilesById[s.user_id] || null,
          total_submissions: countsData[s.user_id] || 0,
        }));

        return {
          data: enrichedSubmissions,
          count: count || 0
        };
      }

      return {
        data: submissions || [],
        count: count || 0
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para buscar submissões de um usuário específico
 * Atalho para useSubmissionsQuery com userId
 */
export const useUserSubmissionsQuery = (userId: string, agencyId?: string) => {
  return useSubmissionsQuery({ userId, agencyId, enrichProfiles: false });
};

/**
 * Hook para buscar submissões pendentes de uma agência
 * Atalho para useSubmissionsQuery com status='pending'
 */
export const usePendingSubmissionsQuery = (agencyId?: string) => {
  return useSubmissionsQuery({ agencyId, status: 'pending' });
};
