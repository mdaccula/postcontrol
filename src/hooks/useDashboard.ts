import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/supabaseSafe";
import { useAuthStore } from "@/stores/authStore";

interface EventStats {
  eventId: string;
  eventTitle: string;
  totalRequired: number;
  submitted: number;
  percentage: number;
  isApproximate: boolean;
}

export const useDashboard = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      if (!user) {
        console.log("❌ useDashboard: Sem user");
        return null;
      }

      console.log("🔄 [useDashboard] Iniciando query para user:", user.id);
      const startTime = performance.now();

      // ✅ PASSO 1: Buscar perfil, roles e user_agencies em paralelo
      const [profileRes, rolesRes, userAgenciesRes] = await Promise.all([
        sb.from("profiles").select("*").eq("id", user.id).single(),
        sb.from("user_roles").select("role").eq("user_id", user.id),
        sb.from("user_agencies").select("agency_id").eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      const roles = rolesRes.data?.map((r) => r.role) || [];
      const userAgencyIds = (userAgenciesRes.data || []).map((ua: any) => ua.agency_id);

      console.log("📊 [useDashboard] Dados básicos:", {
        profile: profile?.full_name || "(sem nome)",
        roles: roles.join(", ") || "(sem role)",
        userAgencies: userAgencyIds.length,
        profileAgencyId: profile?.agency_id || null,
      });

      // ✅ PASSO 2: Determinar agências efetivas
      let effectiveAgencyIds: string[] = [];

      if (userAgencyIds.length > 0) {
        effectiveAgencyIds = userAgencyIds;
      } else if (profile?.agency_id) {
        effectiveAgencyIds = [profile.agency_id];
      }

      console.log("🎯 [useDashboard] Agências do usuário:", effectiveAgencyIds);

      // Se não tem nenhuma agência, retornar indicador
      if (effectiveAgencyIds.length === 0) {
        console.log("⚠️ [useDashboard] Usuário sem agências vinculadas");
        return {
          profile,
          roles,
          submissions: [],
          events: [],
          eventStats: [],
          isMasterAdmin: roles.includes("master_admin"),
          isAgencyAdmin: roles.includes("agency_admin"),
          hasAgencies: false, // 🆕 Flag indicando ausência de agências
          userAgencyIds: [],
        };
      }

      // ✅ PASSO 3: Buscar submissions e eventos das agências do usuário
      const [submissionsRes, eventsRes] = await Promise.all([
        sb
          .from("submissions")
          .select(
            `
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
          `,
          )
          .eq("user_id", user.id)
          .eq("posts.events.is_active", true)
          .in("posts.events.agency_id", effectiveAgencyIds)
          .order("submitted_at", { ascending: false }),

        sb
          .from("events")
          .select("id, title, total_required_posts, is_approximate_total, agency_id")
          .eq("is_active", true)
          .in("agency_id", effectiveAgencyIds)
          .order("event_date", { ascending: false }),
      ]);

      const endTime = performance.now();
      console.log(`✅ [useDashboard] Dados carregados em ${(endTime - startTime).toFixed(0)}ms`);

      const submissions = submissionsRes.data || [];
      const events = eventsRes.data || [];

      console.log("📊 [useDashboard] Resultado final:", {
        submissions: submissions.length,
        events: events.length,
      });

      const eventStats = calculateEventStats(submissions);

      return {
        profile,
        roles,
        submissions,
        events,
        eventStats,
        isMasterAdmin: roles.includes("master_admin"),
        isAgencyAdmin: roles.includes("agency_admin"),
        hasAgencies: true,
        userAgencyIds: effectiveAgencyIds,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

function calculateEventStats(submissions: any[]): EventStats[] {
  const eventMap = new Map<
    string,
    { title: string; totalPosts: number; approvedCount: number; isApproximate: boolean }
  >();

  submissions.forEach((sub) => {
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

      if (sub.status === "approved") {
        const current = eventMap.get(eventId)!;
        current.approvedCount++;
      }
    }
  });

  return Array.from(eventMap.entries()).map(([eventId, data]) => ({
    eventId,
    eventTitle: data.title,
    totalRequired: data.totalPosts,
    submitted: data.approvedCount,
    percentage: data.totalPosts > 0 ? (data.approvedCount / data.totalPosts) * 100 : 0,
    isApproximate: data.isApproximate,
  }));
}
