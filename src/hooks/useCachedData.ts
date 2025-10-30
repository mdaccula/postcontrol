/**
 * Hook personalizado que demonstra o uso do cache inteligente
 * Centraliza a lógica de cache e invalidação para reutilização
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useCachedData = () => {
  const queryClient = useQueryClient();

  /**
   * Invalidar cache de submissões
   */
  const invalidateSubmissions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['submissions'] });
  }, [queryClient]);

  /**
   * Invalidar cache de eventos
   */
  const invalidateEvents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  }, [queryClient]);

  /**
   * Invalidar cache de perfis
   */
  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
  }, [queryClient]);

  /**
   * Invalidar cache de settings
   */
  const invalidateSettings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
  }, [queryClient]);

  /**
   * Invalidar todos os caches
   */
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  /**
   * Limpar cache específico
   */
  const clearCache = useCallback((queryKey: string[]) => {
    queryClient.removeQueries({ queryKey });
  }, [queryClient]);

  /**
   * Obter dados do cache sem fazer nova requisição
   */
  const getCachedData = useCallback(<T,>(queryKey: string[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  }, [queryClient]);

  /**
   * Definir dados no cache manualmente
   */
  const setCachedData = useCallback(<T,>(queryKey: string[], data: T) => {
    queryClient.setQueryData(queryKey, data);
  }, [queryClient]);

  /**
   * Pré-carregar dados no cache
   */
  const prefetchData = useCallback(async (
    queryKey: string[],
    queryFn: () => Promise<any>
  ) => {
    await queryClient.prefetchQuery({ queryKey, queryFn });
  }, [queryClient]);

  return {
    invalidateSubmissions,
    invalidateEvents,
    invalidateProfiles,
    invalidateSettings,
    invalidateAll,
    clearCache,
    getCachedData,
    setCachedData,
    prefetchData,
  };
};
