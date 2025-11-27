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
  isActive, // ✅ CORREÇÃO #1: Remover default para permitir buscar todos os eventos
  includePosts = false,
  enabled = true 
}: UseEventsQueryParams = {}) => {
  return useQuery({
    queryKey: ['events', agencyId, isActive, includePosts],
    refetchOnMount: true, // ✅ CORREÇÃO #4: Garantir que eventos sejam recarregados ao montar
    queryFn: async () => {
      // ✅ Usa eventService da Sprint 1
      const { data: events, error } = await getEvents({ agencyId, isActive });
      
      if (error) throw error;

      // 🆕 FASE 3: Ordenar por data (mais próximo primeiro)
      const sortedEvents = (events || []).sort((a, b) => {
        const dateA = a.event_date ? new Date(a.event_date).getTime() : Infinity;
        const dateB = b.event_date ? new Date(b.event_date).getTime() : Infinity;
        return dateA - dateB;
      });

      // Se includePosts = true, buscar posts para cada evento
      if (includePosts && sortedEvents && sortedEvents.length > 0) {
        // Buscar posts de cada evento em paralelo
        const postsPromises = sortedEvents.map(event => getEventPosts(event.id));
        const postsResults = await Promise.all(postsPromises);
        
        // Consolidar todos os posts
        const allPosts = postsResults.flatMap(result => result.data || []);
        
        // Enriquecer posts com dados do evento
        const enrichedPosts = allPosts.map(post => {
          const matchedEvent = sortedEvents.find(e => e.id === post.event_id);
          return {
            ...post,
            events: matchedEvent ? { id: matchedEvent.id, title: matchedEvent.title } : null
          };
        });

        return {
          events: sortedEvents || [],
          posts: enrichedPosts
        };
      }

      return {
        events: sortedEvents || [],
        posts: []
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000, // ✅ Cache reduzido para 2 minutos - eventos aparecem mais rápido
    gcTime: 10 * 60 * 1000,    // ✅ Cache otimizado - 10 minutos
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};

/**
 * Hook para buscar apenas eventos ativos de uma agência
 * Atalho para useEventsQuery com isActive=true
 */
export const useActiveEventsQuery = (agencyId?: string) => {
  return useEventsQuery({ agencyId, isActive: true });
};
