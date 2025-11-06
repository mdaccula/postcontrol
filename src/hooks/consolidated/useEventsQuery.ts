/**
 * Consolidated Events Query Hook
 * ✅ Sprint 2A: Substitui useEvents de useReactQuery.ts e useAdminQueries.ts
 * 
 * @uses eventService.getEvents, eventService.getEventPosts
 */

import { useQuery } from '@tanstack/react-query';
import { getEvents, getEventPosts } from '@/services/eventService';

export interface UseEventsQueryParams {
  agencyId?: string;
  isActive?: boolean;
  includePosts?: boolean;
  enabled?: boolean;
}

/**
 * Hook consolidado para buscar eventos
 * - Substitui useEvents de useReactQuery.ts e useAdminQueries.ts
 * - Usa eventService da Sprint 1
 * - Suporta filtros de agência e status ativo
 * - Opcionalmente inclui posts relacionados
 * 
 * @example
 * const { data, isLoading } = useEventsQuery({ 
 *   agencyId: 'abc123', 
 *   isActive: true,
 *   includePosts: true 
 * });
 */
export const useEventsQuery = ({ 
  agencyId, 
  isActive, 
  includePosts = false,
  enabled = true 
}: UseEventsQueryParams = {}) => {
  return useQuery({
    queryKey: ['events', agencyId, isActive, includePosts],
    queryFn: async () => {
      // ✅ Usa eventService da Sprint 1
      const { data: events, error } = await getEvents({ agencyId, isActive });
      
      if (error) throw error;

      // Se includePosts = true, buscar posts em paralelo
      if (includePosts && events) {
        const { data: posts } = await getEventPosts(agencyId);
        
        // Enriquecer posts com dados do evento
        const enrichedPosts = (posts || []).map(post => {
          const matchedEvent = events.find(e => e.id === post.event_id);
          return {
            ...post,
            events: matchedEvent ? { id: matchedEvent.id, title: matchedEvent.title } : null
          };
        });

        return {
          events: events || [],
          posts: enrichedPosts
        };
      }

      return {
        events: events || [],
        posts: []
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para buscar apenas eventos ativos de uma agência
 * Atalho para useEventsQuery com isActive=true
 */
export const useActiveEventsQuery = (agencyId?: string) => {
  return useEventsQuery({ agencyId, isActive: true });
};
