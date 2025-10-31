import { memo } from 'react';
import { AdminSettings } from '@/components/AdminSettings';

/**
 * Versão memoizada do AdminSettings para evitar re-renders desnecessários
 * Só re-renderiza quando as props mudarem
 */
export const MemoizedAdminSettings = memo(AdminSettings);

MemoizedAdminSettings.displayName = 'MemoizedAdminSettings';
