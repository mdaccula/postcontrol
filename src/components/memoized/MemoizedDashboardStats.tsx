import { memo } from 'react';
import { DashboardStats } from '@/components/DashboardStats';

/**
 * Versão memoizada do DashboardStats para evitar re-renders desnecessários
 * Só re-renderiza quando as props mudarem
 */
export const MemoizedDashboardStats = memo(DashboardStats);

MemoizedDashboardStats.displayName = 'MemoizedDashboardStats';
