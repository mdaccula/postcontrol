import { useState, useEffect, useMemo, useCallback } from "react";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";

interface EventStats {
  eventId: string;
  eventTitle: string;
  totalRequired: number;
  submitted: number;
  percentage: number;
  isApproximate: boolean;
}

interface Submission {
  id: string;
  submitted_at: string;
  screenshot_url: string;
  screenshot_path?: string;
  status: string;
  rejection_reason?: string;
  posts: {
    post_number: number;
    deadline: string;
    event_id: string;
    events: {
      title: string;
      required_posts: number;
    } | null;
  } | null;
}

export const useDashboardData = (userId: string | undefined, currentAgencyId: string | null) => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    try {
      // Buscar IDs das agências do usuário via user_agencies
      const { data: userAgencyData } = await sb
        .from('user_agencies')
        .select('agency_id')
        .eq('user_id', userId);
      
      const userAgencyIds = userAgencyData?.map(ua => ua.agency_id) || [];
      
      // Se não tem nenhuma agência, carregar dados vazios mas não falhar
      if (userAgencyIds.length === 0 && !currentAgencyId) {
        setEvents([]);
        setSubmissions([]);
        setEventStats([]);
        setLoading(false);
        return;
      }

      // Determinar quais agências buscar
      const agenciesToFetch = currentAgencyId 
        ? [currentAgencyId] 
        : userAgencyIds;

      // QUERY OTIMIZADA: Usar Promise.all para carregar em paralelo
      const [eventsData, submissionsData] = await Promise.all([
        // Query 1: Eventos ativos das agências do usuário
        sb
          .from("events")
          .select("id, title, total_required_posts, is_approximate_total")
          .eq("is_active", true)
          .in("agency_id", agenciesToFetch)
          .order("event_date", { ascending: false })
          .then(res => res.data),
        
        // Query 2: Submissões com JOIN completo
        sb
          .from("submissions")
          .select(`
            id,
            submitted_at,
            screenshot_url,
            screenshot_path,
            status,
            rejection_reason,
            posts!inner (
              post_number,
              deadline,
              event_id,
              events!inner (
                title,
                required_posts,
                id,
                is_active,
                agency_id,
                total_required_posts,
                is_approximate_total
              )
            )
          `)
          .eq("user_id", userId)
          .eq("posts.events.is_active", true)
          .in("posts.events.agency_id", agenciesToFetch)
          .order("submitted_at", { ascending: false })
          .then(res => res.data)
      ]);

      setEvents(eventsData || []);
      setSubmissions(submissionsData || []);

      // OTIMIZAÇÃO: Calcular estatísticas sem queries adicionais
      if (submissionsData) {
        const eventMap = new Map<
          string,
          { title: string; totalPosts: number; approvedCount: number; isApproximate: boolean }
        >();

        submissionsData.forEach((sub) => {
          if (sub.posts?.events) {
            const eventId = (sub.posts.events as any).id;
            const eventData = sub.posts.events as any;
            
            if (!eventMap.has(eventId)) {
              eventMap.set(eventId, {
                title: eventData.title,
                totalPosts: eventData.total_required_posts || 0,
                approvedCount: 0,
                isApproximate: eventData.is_approximate_total || false,
              });
            }
            
            // Contar aprovações
            if (sub.status === "approved") {
              const current = eventMap.get(eventId)!;
              current.approvedCount++;
            }
          }
        });

        const stats: EventStats[] = Array.from(eventMap.entries()).map(([eventId, data]) => ({
          eventId,
          eventTitle: data.title,
          totalRequired: data.totalPosts,
          submitted: data.approvedCount,
          percentage: data.totalPosts > 0 ? (data.approvedCount / data.totalPosts) * 100 : 0,
          isApproximate: data.isApproximate,
        }));

        setEventStats(stats);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, currentAgencyId, toast]);

  return {
    submissions,
    eventStats,
    events,
    loading,
    loadDashboardData,
  };
};
