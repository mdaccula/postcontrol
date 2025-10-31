import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sb } from '@/lib/supabaseSafe';

export interface UserStats {
  user_id: string;
  user_name: string;
  user_email: string;
  user_instagram: string;
  user_phone: string;
  user_gender: string;
  user_followers_range: string;
  events_participated: number;
  total_submissions: number;
  approved_submissions: number;
  pending_submissions: number;
  rejected_submissions: number;
  total_posts_available: number;
  completion_percentage: number;
}

/**
 * Hook com cache para eventos do UserPerformance
 */
export const usePerformanceEvents = (isMasterAdmin: boolean, currentAgencyId: string | null) => {
  return useQuery({
    queryKey: ['performance-events', isMasterAdmin, currentAgencyId],
    queryFn: async () => {
      let query = sb.from('events').select('*').order('created_at', { ascending: false });
      
      if (!isMasterAdmin && currentAgencyId) {
        query = query.eq('agency_id', currentAgencyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Manter no cache por 10 minutos
  });
};

/**
 * Hook com cache para estatísticas de todos os eventos
 */
export const useAllUserStats = (
  currentAgencyId: string | null,
  isMasterAdmin: boolean,
  enabled: boolean = false
) => {
  return useQuery({
    queryKey: ['all-user-stats', currentAgencyId, isMasterAdmin],
    queryFn: async () => {
      if (!currentAgencyId && !isMasterAdmin) {
        return [];
      }

      // 1. Buscar eventos em paralelo
      let eventsQuery = sb.from('events').select('id');
      if (!isMasterAdmin && currentAgencyId) {
        eventsQuery = eventsQuery.eq('agency_id', currentAgencyId);
      }
      
      const { data: agencyEvents } = await eventsQuery;
      const eventIds = (agencyEvents || []).map(e => e.id);

      if (eventIds.length === 0) return [];

      // 2. Buscar posts desses eventos
      const { data: postsData } = await sb
        .from('posts')
        .select('id, event_id')
        .in('event_id', eventIds);

      const postIds = (postsData || []).map(p => p.id);

      if (postIds.length === 0) return [];

      // 3. Buscar submissions desses posts
      const { data: submissionsData } = await sb
        .from('submissions')
        .select('user_id, status, post_id')
        .in('post_id', postIds);

      const uniqueUserIds = Array.from(new Set((submissionsData || []).map(s => s.user_id)));
      if (uniqueUserIds.length === 0) return [];

      // 4. Buscar perfis
      const { data: profilesData } = await sb
        .from('profiles')
        .select('id, full_name, email, instagram, phone, gender, followers_range')
        .in('id', uniqueUserIds);

      // 5. Processar usuários em PARALELO com Promise.all
      const userStatsPromises = (profilesData || []).map(async (profile) => {
        const { data: userSubmissions } = await sb
          .from('submissions')
          .select('post_id, status, posts(event_id)')
          .eq('user_id', profile.id)
          .in('post_id', postIds);

        const eventsParticipated = new Set(
          (userSubmissions || [])
            .map((s: any) => s.posts?.event_id)
            .filter(Boolean)
        ).size;

        const userEventIds = Array.from(new Set(
          (userSubmissions || [])
            .map((s: any) => s.posts?.event_id)
            .filter(Boolean)
        ));

        let totalPostsAvailable = 0;
        if (userEventIds.length > 0) {
          const { count } = await sb
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .in('event_id', userEventIds);
          totalPostsAvailable = count || 0;
        }

        const approvedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'approved').length;
        const pendingSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'pending').length;
        const rejectedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'rejected').length;

        const completionPercentage = totalPostsAvailable > 0 
          ? Math.round((approvedSubmissions / totalPostsAvailable) * 100)
          : 0;

        return {
          user_id: profile.id,
          user_name: profile.full_name || 'Sem nome',
          user_email: profile.email || 'Sem email',
          user_instagram: profile.instagram || 'Sem Instagram',
          user_phone: profile.phone || 'Sem telefone',
          user_gender: profile.gender || 'N/A',
          user_followers_range: profile.followers_range || 'N/A',
          events_participated: eventsParticipated,
          total_submissions: (userSubmissions || []).length,
          approved_submissions: approvedSubmissions,
          pending_submissions: pendingSubmissions,
          rejected_submissions: rejectedSubmissions,
          total_posts_available: totalPostsAvailable,
          completion_percentage: completionPercentage,
        };
      });

      const userStatsData = await Promise.all(userStatsPromises);
      return userStatsData.filter(u => u.total_submissions > 0);
    },
    enabled,
    staleTime: 3 * 60 * 1000, // Cache por 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook com cache para estatísticas de evento específico
 */
export const useEventUserStats = (
  eventId: string,
  currentAgencyId: string | null,
  isMasterAdmin: boolean,
  enabled: boolean = false
) => {
  return useQuery({
    queryKey: ['event-user-stats', eventId, currentAgencyId],
    queryFn: async () => {
      if (!currentAgencyId && !isMasterAdmin) {
        return [];
      }

      // Verificar permissão para agency admin
      if (!isMasterAdmin && currentAgencyId) {
        const { data: eventData } = await sb
          .from('events')
          .select('id, agency_id')
          .eq('id', eventId)
          .eq('agency_id', currentAgencyId)
          .maybeSingle();

        if (!eventData) return [];
      }

      // Buscar posts e submissions em paralelo
      const { data: postsData } = await sb
        .from('posts')
        .select('id')
        .eq('event_id', eventId);

      const postIds = (postsData || []).map((p: any) => p.id);
      if (postIds.length === 0) return [];

      const { data: submissionsData } = await sb
        .from('submissions')
        .select('user_id')
        .in('post_id', postIds);

      const uniqueUsers = new Set((submissionsData || []).map((s: any) => s.user_id));

      const { data: profilesData } = await sb
        .from('profiles')
        .select('id, full_name, email, instagram, phone, gender, followers_range')
        .in('id', Array.from(uniqueUsers));

      // Processar usuários em PARALELO
      const userStatsPromises = (profilesData || []).map(async (profile) => {
        const { data: userSubmissions } = await sb
          .from('submissions')
          .select('id, status')
          .in('post_id', postIds)
          .eq('user_id', profile.id);

        const approvedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'approved').length;
        const pendingSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'pending').length;
        const rejectedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'rejected').length;

        const completionPercentage = (postsData || []).length > 0
          ? Math.round((approvedSubmissions / (postsData || []).length) * 100)
          : 0;

        return {
          user_id: profile.id,
          user_name: profile.full_name || 'Sem nome',
          user_email: profile.email || 'Sem email',
          user_instagram: profile.instagram || 'Sem Instagram',
          user_phone: profile.phone || 'Sem telefone',
          user_gender: profile.gender || 'N/A',
          user_followers_range: profile.followers_range || 'N/A',
          events_participated: 1,
          total_submissions: (userSubmissions || []).length,
          approved_submissions: approvedSubmissions,
          pending_submissions: pendingSubmissions,
          rejected_submissions: rejectedSubmissions,
          total_posts_available: (postsData || []).length,
          completion_percentage: completionPercentage,
        };
      });

      return await Promise.all(userStatsPromises);
    },
    enabled,
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para invalidar caches
 */
export const useInvalidatePerformanceCache = () => {
  const queryClient = useQueryClient();

  return {
    invalidateEvents: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-events'] });
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['event-user-stats'] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-events'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['event-user-stats'] });
    },
  };
};
