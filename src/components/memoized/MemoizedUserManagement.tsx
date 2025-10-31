import { memo } from 'react';
import { UserManagement } from '@/components/UserManagement';

/**
 * Versão memoizada do UserManagement para evitar re-renders desnecessários
 * Só re-renderiza quando as props mudarem
 */
export const MemoizedUserManagement = memo(UserManagement);

MemoizedUserManagement.displayName = 'MemoizedUserManagement';
