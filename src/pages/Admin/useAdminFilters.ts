import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Admin Filters Hook - URL-based Filter Management
 * 
 * Manages all admin panel filters through URL query parameters,
 * ensuring persistence across page refreshes and shareable filter states.
 * 
 * @returns {Object} Filter state and setter functions
 * @returns {Object} filters - Current filter values
 * @returns {Function} setSubmissionEventFilter - Set event filter
 * @returns {Function} setSubmissionPostFilter - Set post number filter
 * @returns {Function} setSubmissionStatusFilter - Set status filter
 * @returns {Function} setPostTypeFilter - Set post type filter
 * @returns {Function} setSearchTerm - Set search term
 * @returns {Function} setDateFilterStart - Set start date
 * @returns {Function} setDateFilterEnd - Set end date
 * @returns {Function} setCurrentPage - Set current page
 * @returns {Function} setItemsPerPage - Set items per page
 * @returns {Function} setKanbanView - Toggle kanban view
 * @returns {Function} setEventActiveFilter - Set event active filter
 * @returns {Function} setPostEventFilter - Set post event filter
 * @returns {Function} updateFilter - Generic filter updater
 * @returns {Function} clearFilters - Clear all filters
 * 
 * @example
 * const { filters, setSubmissionEventFilter, clearFilters } = useAdminFilters();
 * 
 * // Set a single filter
 * setSubmissionEventFilter('event-123');
 * 
 * // Access current filter state
 * console.log(filters.submissionEventFilter); // 'event-123'
 * 
 * // Clear all filters
 * clearFilters();
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
  const cardsGridView = searchParams.get('view') === 'cards';
  const eventActiveFilter = searchParams.get('eventActive') || 'active'; // ✅ ITEM 8: Padrão 'active'
  const postEventFilter = searchParams.get('postEvent') || 'all';
  const postEventActiveFilter = searchParams.get('postEventActive') || 'active'; // ✅ FASE 3: Padrão 'active'
  const eventSortOrder = searchParams.get('eventSort') || 'oldest'; // ✅ FASE 3: Ordenação padrão para mais antigos

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

  const setCardsGridView = useCallback((value: boolean) => {
    updateFilter({ view: value ? 'cards' : 'list' });
  }, [updateFilter]);

  const setEventActiveFilter = useCallback((value: string) => {
    updateFilter({ eventActive: value });
  }, [updateFilter]);

  const setPostEventFilter = useCallback((value: string) => {
    updateFilter({ postEvent: value });
  }, [updateFilter]);

  const setPostEventActiveFilter = useCallback((value: string) => {
    updateFilter({ postEventActive: value });
  }, [updateFilter]);

  const setEventSortOrder = useCallback((value: string) => {
    updateFilter({ eventSort: value });
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
    cardsGridView,
    eventActiveFilter,
    postEventFilter,
    postEventActiveFilter,
    eventSortOrder,
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
    cardsGridView,
    eventActiveFilter,
    postEventFilter,
    postEventActiveFilter,
    eventSortOrder,
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
    setCardsGridView,
    setEventActiveFilter,
    setPostEventFilter,
    setPostEventActiveFilter,
    setEventSortOrder,
    
    // Utilities
    updateFilter,
    clearFilters,
  };
};
