import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Hook customizado para gerenciar filtros do Admin via URL
 * Substitui múltiplos useState por uma única fonte de verdade (URL)
 * 
 * Benefícios:
 * - Filtros persistem no refresh da página
 * - Facilita compartilhamento de URLs com filtros específicos
 * - State management simplificado
 */
export const useAdminFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Leitores de filtros da URL
  const submissionEventFilter = searchParams.get('event') || 'all';
  const submissionPostFilter = searchParams.get('post') || 'all';
  const submissionStatusFilter = searchParams.get('status') || 'all';
  const postTypeFilter = searchParams.get('type') || 'all';
  const searchTerm = searchParams.get('search') || '';
  const dateFilterStart = searchParams.get('dateStart') || '';
  const dateFilterEnd = searchParams.get('dateEnd') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = parseInt(searchParams.get('perPage') || '30', 10);
  const kanbanView = searchParams.get('view') === 'kanban';
  const eventActiveFilter = searchParams.get('eventActive') || 'all';
  const postEventFilter = searchParams.get('postEvent') || 'all';

  /**
   * Atualizador genérico de filtros
   * Mantém filtros existentes e atualiza apenas os especificados
   */
  const updateFilter = useCallback((updates: Record<string, string | number | boolean>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === 'all' || value === false) {
        newParams.delete(key);
      } else {
        newParams.set(key, value.toString());
      }
    });
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  /**
   * Setters individuais para cada filtro
   * Usam o atualizador genérico internamente
   */
  const setSubmissionEventFilter = useCallback((value: string) => {
    updateFilter({ 
      event: value,
      post: 'all', // Reset post filter quando muda evento
      page: '1'    // Reset página
    });
  }, [updateFilter]);

  const setSubmissionPostFilter = useCallback((value: string) => {
    updateFilter({ post: value, page: '1' });
  }, [updateFilter]);

  const setSubmissionStatusFilter = useCallback((value: string) => {
    updateFilter({ status: value, page: '1' });
  }, [updateFilter]);

  const setPostTypeFilter = useCallback((value: string) => {
    updateFilter({ type: value, page: '1' });
  }, [updateFilter]);

  const setSearchTerm = useCallback((value: string) => {
    updateFilter({ search: value, page: '1' });
  }, [updateFilter]);

  const setDateFilterStart = useCallback((value: string) => {
    updateFilter({ dateStart: value, page: '1' });
  }, [updateFilter]);

  const setDateFilterEnd = useCallback((value: string) => {
    updateFilter({ dateEnd: value, page: '1' });
  }, [updateFilter]);

  const setCurrentPage = useCallback((value: number) => {
    updateFilter({ page: value });
  }, [updateFilter]);

  const setItemsPerPage = useCallback((value: number) => {
    updateFilter({ perPage: value, page: '1' });
  }, [updateFilter]);

  const setKanbanView = useCallback((value: boolean) => {
    updateFilter({ view: value ? 'kanban' : 'list' });
  }, [updateFilter]);

  const setEventActiveFilter = useCallback((value: string) => {
    updateFilter({ eventActive: value });
  }, [updateFilter]);

  const setPostEventFilter = useCallback((value: string) => {
    updateFilter({ postEvent: value });
  }, [updateFilter]);

  /**
   * Limpar todos os filtros e voltar ao estado inicial
   */
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  /**
   * Estado dos filtros para fácil acesso
   */
  const filters = useMemo(() => ({
    submissionEventFilter,
    submissionPostFilter,
    submissionStatusFilter,
    postTypeFilter,
    searchTerm,
    dateFilterStart,
    dateFilterEnd,
    currentPage,
    itemsPerPage,
    kanbanView,
    eventActiveFilter,
    postEventFilter,
  }), [
    submissionEventFilter,
    submissionPostFilter,
    submissionStatusFilter,
    postTypeFilter,
    searchTerm,
    dateFilterStart,
    dateFilterEnd,
    currentPage,
    itemsPerPage,
    kanbanView,
    eventActiveFilter,
    postEventFilter,
  ]);

  return {
    // Estado atual
    filters,
    
    // Setters
    setSubmissionEventFilter,
    setSubmissionPostFilter,
    setSubmissionStatusFilter,
    setPostTypeFilter,
    setSearchTerm,
    setDateFilterStart,
    setDateFilterEnd,
    setCurrentPage,
    setItemsPerPage,
    setKanbanView,
    setEventActiveFilter,
    setPostEventFilter,
    
    // Utilities
    updateFilter,
    clearFilters,
  };
};
