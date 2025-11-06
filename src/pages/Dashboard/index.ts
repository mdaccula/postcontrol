/**
 * Sprint 3B: Componentes refatorados do Dashboard
 * 
 * Estrutura modular para melhor manutenibilidade:
 * - DashboardStats: Cards de estatísticas e progresso de eventos
 * - DashboardSubmissionHistory: Histórico de submissões com filtros
 * - DashboardProfile: Perfil do usuário e alteração de senha
 * - useDashboardFilters: Hook para gerenciar filtros via URL
 */

export { DashboardStats } from './DashboardStats';
export { DashboardSubmissionHistory } from './DashboardSubmissionHistory';
export { DashboardProfile } from './DashboardProfile';
export { useDashboardFilters } from './useDashboardFilters';
