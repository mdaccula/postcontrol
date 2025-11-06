/**
 * @deprecated Este arquivo será removido na Sprint 2B
 * ⚠️ USE: src/hooks/consolidated/ em vez disso
 * 
 * Migração:
 * - useEvents → useEventsQuery (src/hooks/consolidated/useEventsQuery.ts)
 * - useSubmissions → useSubmissionsQuery (src/hooks/consolidated/useSubmissionsQuery.ts)
 * - useUpdateSubmissionStatus → useUpdateSubmissionStatusMutation (src/hooks/consolidated/useMutations.ts)
 * - useDeleteEvent → useDeleteEventMutation (src/hooks/consolidated/useMutations.ts)
 * - useDeleteSubmission → useDeleteSubmissionMutation (src/hooks/consolidated/useMutations.ts)
 * 
 * Este código ainda funciona, mas será removido após migração completa dos componentes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sb } from '@/lib/supabaseSafe';
import { toast } from 'sonner';

/**
 * ✅ FASE 3: React Query hooks para Admin.tsx
 * ⚠️ DEPRECATED: Substituem useState + useEffect por cache inteligente
 */

interface UseEventsParams {
  agencyId: string | null;
  enabled?: boolean;
}

export const useEvents = ({ agencyId, enabled = true }: UseEventsParams) => {
  return useQuery({
    queryKey: ['events', agencyId],
    queryFn: async () => {
      let eventsQuery = supabase.from('events').select('*');
      let postsQuery = supabase.from('posts').select('*, events(id, title)');
      
      if (agencyId) {
        eventsQuery = eventsQuery.eq('agency_id', agencyId);
        postsQuery = postsQuery.eq('agency_id', agencyId);
      }

      const [
        { data: eventsData, error: eventsError },
        { data: postsData, error: postsError }
      ] = await Promise.all([
        eventsQuery.order('created_at', { ascending: false }),
        postsQuery.order('created_at', { ascending: false })
      ]);

      if (eventsError) throw eventsError;
      if (postsError) throw postsError;

      // Enrich posts with event data
      const enrichedPosts = postsData?.map(post => {
        if (!post.events && post.event_id) {
          const matchedEvent = eventsData?.find(e => e.id === post.event_id);
          if (matchedEvent) {
            return {
              ...post,
              events: { id: matchedEvent.id, title: matchedEvent.title }
            };
          }
        }
        return post;
      }) || [];

      return {
        events: eventsData || [],
        posts: enrichedPosts
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

interface UseSubmissionsParams {
  agencyId: string | null;
  eventFilter?: string;
  enabled?: boolean;
}

export const useSubmissions = ({ 
  agencyId, 
  eventFilter = 'all',
  enabled = true 
}: UseSubmissionsParams) => {
  return useQuery({
    queryKey: ['submissions', agencyId, eventFilter],
    queryFn: async () => {
      let submissionsQuery = sb
        .from('submissions')
        .select(`
          *,
          posts(
            post_number, 
            deadline, 
            event_id, 
            agency_id, 
            events(title, id, event_purpose)
          )
        `);
      
      if (agencyId) {
        submissionsQuery = submissionsQuery.eq('agency_id', agencyId);
      }
      
      if (eventFilter !== "all") {
        submissionsQuery = submissionsQuery.eq('posts.event_id', eventFilter);
      }
      
      const { data: submissionsData } = await submissionsQuery
        .order('submitted_at', { ascending: false });

      // Buscar perfis e contagens em paralelo
      const userIds = Array.from(new Set((submissionsData || []).map((s: any) => s.user_id)));
      
      const [profilesData, countsData] = await Promise.all([
        userIds.length > 0
          ? sb.from('profiles')
              .select('id, full_name, email, instagram')
              .in('id', userIds)
          : Promise.resolve({ data: [] }),
        
        userIds.length > 0
          ? sb.from('submissions')
              .select('user_id')
              .in('user_id', userIds)
              .then(({ data }) => {
                const counts: Record<string, number> = {};
                (data || []).forEach((s: any) => {
                  counts[s.user_id] = (counts[s.user_id] || 0) + 1;
                });
                return counts;
              })
          : Promise.resolve({})
      ]);

      const profilesById: Record<string, any> = {};
      (profilesData.data || []).forEach((p: any) => { 
        profilesById[p.id] = p; 
      });

      const enrichedSubmissions = (submissionsData || []).map((s: any) => ({
        ...s,
        profiles: profilesById[s.user_id] || null,
        total_submissions: countsData[s.user_id] || 0,
      }));

      return enrichedSubmissions;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useUpdateSubmissionStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      submissionId, 
      status, 
      userId,
      rejectionReason 
    }: { 
      submissionId: string; 
      status: string; 
      userId: string;
      rejectionReason?: string;
    }) => {
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status,
          approved_at: new Date().toISOString(),
          approved_by: userId,
          ...(rejectionReason && { rejection_reason: rejectionReason })
        })
        .eq('id', submissionId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await sb
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento excluído com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao deletar evento:', error);
      toast.error('Erro ao excluir evento');
    }
  });
};

export const useDeleteSubmission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await sb
        .from('submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submissão deletada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao deletar submissão:', error);
      toast.error('Erro ao deletar submissão');
    }
  });
};
