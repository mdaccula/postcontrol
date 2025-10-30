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

// Hook para user agencies com cache
export const useUserAgencies = (userId?: string) => {
  return useQuery({
    queryKey: ['userAgencies', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await sb
        .from('user_agencies')
        .select(`
          agency_id,
          last_accessed_at,
          agencies (
            id,
            name,
            subscription_plan,
            logo_url
          )
        `)
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false });
      
      if (error) throw error;
      return data?.map((ua: any) => ua.agencies).filter(Boolean) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000,
    enabled: !!userId,
  });
};

// Hook para admin settings com cache
export const useAdminSettings = (keys?: string[]) => {
  return useQuery({
    queryKey: ['adminSettings', keys],
    queryFn: async () => {
      let query = sb.from('admin_settings').select('setting_key, setting_value');
      
      if (keys && keys.length > 0) {
        query = query.in('setting_key', keys);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Converter para objeto chave-valor
      const settings: Record<string, string> = {};
      data?.forEach((s) => {
        settings[s.setting_key] = s.setting_value;
      });
      
      return settings;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// ============= MUTATIONS COM INVALIDAÇÃO =============

// Mutation para atualizar status de submissão
export const useUpdateSubmissionStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      submissionId, 
      status, 
      rejectionReason, 
      approvedBy 
    }: { 
      submissionId: string; 
      status: string; 
      rejectionReason?: string;
      approvedBy?: string;
    }) => {
      const { error } = await sb
        .from('submissions')
        .update({
          status,
          rejection_reason: rejectionReason,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          approved_by: approvedBy,
        })
        .eq('id', submissionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

// Mutation para criar/atualizar evento
export const useUpsertEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventData: any) => {
      const { error } = await sb.from('events').upsert(eventData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// Mutation para deletar evento
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await sb.from('events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// Mutation para atualizar perfil
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, profileData }: { userId: string; profileData: any }) => {
      const { error } = await sb
        .from('profiles')
        .update(profileData)
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};
