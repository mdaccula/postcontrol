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
      // 🔴 ITEM 2: Log de performance
      console.time(`⏱️ [Performance] Fetch Submissions (page ${page})`);
      
      // ✅ Usa submissionService da Sprint 1
      const { data: submissions, count, error } = await getSubmissions({
        eventId,
        status,
        userId,
        agencyId,
        page,
        itemsPerPage
      });

      console.timeEnd(`⏱️ [Performance] Fetch Submissions (page ${page})`);
      if (error) throw error;

      // Se enrichProfiles = true, buscar perfis e contagens
      if (enrichProfiles && submissions && submissions.length > 0) {
        console.time('⏱️ [Performance] Enrich Profiles');
        
        const userIds = Array.from(new Set(submissions.map(s => s.user_id)));

        // 🔴 FASE 2: Otimização de contagem com agregação SQL
        console.time('⏱️ [Performance] Query Profiles');
        console.time('⏱️ [Performance] Query Counts');
        
        const [profilesData, countsResult] = await Promise.all([
          sb.from('profiles')
            .select('id, full_name, email, instagram, avatar_url')
            .in('id', userIds)
            .then(res => {
              console.timeEnd('⏱️ [Performance] Query Profiles');
              return res.data || [];
            }),
          
          // ✅ Usar agregação SQL nativa ao invés de JavaScript
          sb.from('submissions')
            .select('user_id, count:id.count()')
            .in('user_id', userIds)
            .then(res => {
              console.timeEnd('⏱️ [Performance] Query Counts');
              const counts: Record<string, number> = {};
              (res.data || []).forEach((item: any) => {
                counts[item.user_id] = item.count || 0;
              });
              console.log('📊 [Counts] Total por usuário:', counts);
              return counts;
            })
        ]);
        
        console.timeEnd('⏱️ [Performance] Enrich Profiles');

        // Criar mapa de perfis por ID
        const profilesById: Record<string, any> = {};
        profilesData.forEach(p => { 
          profilesById[p.id] = p; 
        });

        // Enriquecer submissões com perfis e contagens
        const enrichedSubmissions = submissions.map(s => ({
          ...s,
          profiles: profilesById[s.user_id] || null,
          total_submissions: countsResult[s.user_id] || 0,
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
    staleTime: 5 * 60 * 1000, // ✅ SPRINT 1: Cache inteligente - 5 minutos
    gcTime: 10 * 60 * 1000,   // ✅ SPRINT 1: Cache inteligente - 10 minutos
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
