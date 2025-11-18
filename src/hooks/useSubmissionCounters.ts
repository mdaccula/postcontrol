/**
 * 🆕 SPRINT 2 + CACHE: Hook React Query para contadores de submissões
 * Cache de 5 minutos para evitar buscas desnecessárias
 */

import { useQuery } from '@tanstack/react-query';
import { getSubmissionCountsByEvent, getSubmissionCountsByPost } from '@/services/submissionService';

const CACHE_TIME = 5 * 60 * 1000; // 5 minutos em ms

/**
 * Hook para buscar contadores de submissões por evento com cache
 * @param agencyId - ID da agência (opcional)
 * @param enabled - Se a query deve ser executada
 */
export const useSubmissionCountsByEvent = (agencyId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['submission-counters', 'by-event', agencyId],
    queryFn: () => getSubmissionCountsByEvent(agencyId),
    staleTime: 60 * 1000, // ✅ Cache de 60 segundos
    gcTime: 5 * 60 * 1000, // ✅ Manter por 5 minutos
    refetchOnWindowFocus: true, // ✅ Refetch ao voltar à aba
    refetchOnMount: true, // ✅ Sempre buscar ao montar componente
    enabled: enabled && !!agencyId,
  });
};

/**
 * Hook para buscar contadores de submissões por post com cache
 * @param agencyId - ID da agência (opcional)
 * @param enabled - Se a query deve ser executada
 */
export const useSubmissionCountsByPost = (agencyId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['submission-counters', 'by-post', agencyId],
    queryFn: () => getSubmissionCountsByPost(agencyId),
    staleTime: 60 * 1000, // ✅ Cache de 60 segundos
    gcTime: 5 * 60 * 1000, // ✅ Manter por 5 minutos
    refetchOnWindowFocus: true, // ✅ Refetch ao voltar à aba
    refetchOnMount: true, // ✅ Sempre buscar ao montar componente
    enabled: enabled && !!agencyId,
  });
};
