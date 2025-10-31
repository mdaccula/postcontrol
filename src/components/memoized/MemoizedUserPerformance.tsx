import { memo } from 'react';
import { UserPerformance } from '@/components/UserPerformance';

/**
 * Versão memoizada do UserPerformance para evitar re-renders desnecessários
 * Só re-renderiza quando as props mudarem
 */
export const MemoizedUserPerformance = memo(UserPerformance);

MemoizedUserPerformance.displayName = 'MemoizedUserPerformance';
