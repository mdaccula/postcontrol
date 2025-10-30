import { useQuery, useQueryClient, UseMutationOptions, useMutation } from '@tanstack/react-query';
import { sb } from '@/lib/supabaseSafe';

// M7: Hook expandido para eventos com filtros
export const useEvents = (agencyId?: string, isActive?: boolean) => {
  return useQuery({
    queryKey: ['events', agencyId, isActive],
    queryFn: async () => {
      let query = sb.from('events').select('*');
      
      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }
      
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }
      
      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos
    gcTime: 10 * 60 * 1000,
  });
};

// M7: Hook expandido para submissions com paginação
export const useSubmissions = (
  eventFilter?: string, 
  statusFilter?: string,
  page: number = 1,
  itemsPerPage: number = 30
) => {
  return useQuery({
    queryKey: ['submissions', eventFilter, statusFilter, page, itemsPerPage],
    queryFn: async () => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      let query = sb
        .from('submissions')
        .select(`*, posts!inner(*, events(*)), profiles(*)`, { count: 'exact' });
      
      if (eventFilter && eventFilter !== 'all') {
        query = query.eq('posts.event_id', eventFilter);
      }
      
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, count } = await query
        .order('submitted_at', { ascending: false })
        .range(from, to);
      
      return { data: data || [], count: count || 0 };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para invalidar queries
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateSubmissions: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }),
    invalidateEvents: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};

// M7: Hook expandido para profiles com filtros
export const useProfiles = (agencyId?: string) => {
  return useQuery({
    queryKey: ['profiles', agencyId],
    queryFn: async () => {
      let query = sb.from('profiles').select('*');
      
      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }
      
      const { data } = await query;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// M7: Hook para posts com cache
export const usePosts = (eventId?: string, agencyId?: string) => {
  return useQuery({
    queryKey: ['posts', eventId, agencyId],
    queryFn: async () => {
      let query = sb.from('posts').select('*, events(title)');
      
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      
      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }
      
      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
