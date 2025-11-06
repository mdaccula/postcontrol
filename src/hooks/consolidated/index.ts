/**
 * Consolidated Hooks - Sprint 2A
 * ✅ Exporta todos os hooks consolidados
 * 
 * Substitui:
 * - useReactQuery.ts (deprecated)
 * - useAdminQueries.ts (deprecated)
 * - useDashboardData.ts (deprecated → usar useDashboard.ts)
 */

// Events
export { 
  useEventsQuery, 
  useActiveEventsQuery,
  type UseEventsQueryParams 
} from './useEventsQuery';

// Submissions
export { 
  useSubmissionsQuery,
  useUserSubmissionsQuery,
  usePendingSubmissionsQuery,
  type UseSubmissionsQueryParams 
} from './useSubmissionsQuery';

// Profiles
export { 
  useProfilesQuery,
  useCurrentUserProfileQuery,
  useAgencyProfilesQuery,
  useUserStatsQuery,
  type UseProfilesQueryParams 
} from './useProfilesQuery';

// Mutations
export {
  useUpdateSubmissionStatusMutation,
  useDeleteSubmissionMutation,
  useCreateSubmissionMutation,
  useUpsertEventMutation,
  useDeleteEventMutation,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useUpdateProfileMutation
} from './useMutations';

// ✅ Hook de invalidação para compatibilidade
import { useQueryClient } from '@tanstack/react-query';

export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateSubmissions: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }),
    invalidateEvents: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
    invalidateProfiles: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
    invalidatePosts: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};
