import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Hook para gerenciar filtros do Dashboard via URL
 * Similar ao useAdminFilters, mas para Dashboard
 * 
 * Benefícios:
 * - Filtros persistem no refresh da página
 * - State management simplificado
 * - Facilita compartilhamento de URLs com filtros específicos
 */
export const useDashboardFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Leitores de filtros da URL
  const selectedHistoryEvent = searchParams.get('event') || 'all';

  /**
   * Atualizador genérico de filtros
   */
  const updateFilter = useCallback((updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === 'all') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  /**
   * Setters individuais
   */
  const setSelectedHistoryEvent = useCallback((value: string) => {
    updateFilter({ event: value });
  }, [updateFilter]);

  /**
   * Limpar todos os filtros
   */
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  /**
   * Estado dos filtros
   */
  const filters = useMemo(() => ({
    selectedHistoryEvent,
  }), [selectedHistoryEvent]);

  return {
    // Estado atual
    filters,
    
    // Setters
    setSelectedHistoryEvent,
    
    // Utilities
    updateFilter,
    clearFilters,
  };
};
