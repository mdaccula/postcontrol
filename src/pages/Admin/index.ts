/**
 * Sprint 3A: Componentes refatorados do Admin
 * 
 * Estrutura modular para melhor manutenibilidade:
 * - AdminFilters: Filtros de submissões
 * - AdminSubmissionList: Lista paginada de submissões
 * - AdminEventList: Lista de eventos e posts
 * - useAdminFilters: Hook para gerenciar filtros via URL
 */

export { AdminFilters } from './AdminFilters';
export { AdminSubmissionList } from './AdminSubmissionList';
export { AdminEventList } from './AdminEventList';
export { useAdminFilters } from './useAdminFilters';
