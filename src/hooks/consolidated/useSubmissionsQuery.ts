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
  postType?: string;      // 🆕 SPRINT 2
  searchTerm?: string;    // 🆕 SPRINT 2
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
  postType,       // 🆕 SPRINT 2
  searchTerm,     // 🆕 SPRINT 2
  userId,
  agencyId,
  page = 1,
  itemsPerPage = 30,
  enrichProfiles = true,
  enabled = true
}: UseSubmissionsQueryParams = {}) => {
  return useQuery({
    queryKey: ['submissions', eventId, status, postType, searchTerm, userId, agencyId, page, itemsPerPage],
    queryFn: async () => {
      // 🔴 ITEM 2: Log de performance
      console.time(`⏱️ [Performance] Fetch Submissions (page ${page})`);
      
      // ✅ SPRINT 2: Passa todos os filtros para o backend
      const { data: submissions, count, error } = await getSubmissions({
        eventId,
        status,
        postType,     // 🆕 SPRINT 2
        searchTerm,   // 🆕 SPRINT 2
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

        // Helper: Dividir array em chunks para evitar URLs muito longas
        const chunkArray = <T,>(array: T[], size: number): T[][] => {
          const chunks: T[][] = [];
          for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
          }
          return chunks;
        };

        // 🔴 FASE 2: Otimização de contagem com agregação SQL + Batching
        console.time('⏱️ [Performance] Query Profiles');
        console.time('⏱️ [Performance] Query Counts');
        
        // Dividir userIds em chunks de 15 para evitar URLs muito longas (400 Bad Request)
        const userIdChunks = chunkArray(userIds, 15);
        
        const [profilesData, countsResult] = await Promise.all([
          // Buscar perfis em batches
          Promise.all(
            userIdChunks.map(chunk =>
              sb.from('profiles')
                .select('id, full_name, email, instagram, avatar_url')
                .in('id', chunk)
                .then(res => res.data || [])
            )
          ).then(results => {
            console.timeEnd('⏱️ [Performance] Query Profiles');
            return results.flat();
          }),
          
          // Buscar todas as submissions e contar no client-side
          Promise.all(
            userIdChunks.map(chunk =>
              sb.from('submissions')
                .select('user_id, id')
                .in('user_id', chunk)
                .then(res => res.data || [])
            )
          ).then(results => {
            console.timeEnd('⏱️ [Performance] Query Counts');
            const allSubmissions = results.flat();
            
            // Agregar contagens no client-side
            const counts: Record<string, number> = {};
            allSubmissions.forEach((item: any) => {
              counts[item.user_id] = (counts[item.user_id] || 0) + 1;
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
    staleTime: 10 * 60 * 1000, // ✅ Cache otimizado - 10 minutos
    gcTime: 20 * 60 * 1000,    // ✅ Cache otimizado - 20 minutos
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
