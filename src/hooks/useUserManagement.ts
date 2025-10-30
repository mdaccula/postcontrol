import { useState, useCallback } from "react";
import { sb } from "@/lib/supabaseSafe";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  instagram: string | null;
  phone: string | null;
  created_at: string;
  gender?: string | null;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [userEvents, setUserEvents] = useState<Record<string, string[]>>({});

  const checkAdminStatus = useCallback(async () => {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { data: masterCheck } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "master_admin")
      .maybeSingle();

    setIsMasterAdmin(!!masterCheck);

    if (!masterCheck) {
      const { data: agencyData } = await sb.from("agencies").select("id").eq("owner_id", user.id).maybeSingle();
      setCurrentAgencyId(agencyData?.id || null);
    }
  }, []);

  const loadUserEvents = useCallback(async (userIds: string[]) => {
    const eventsMap: Record<string, string[]> = {};

    for (const userId of userIds) {
      const { data } = await sb
        .from("submissions")
        .select(
          `
          posts!inner(
            events!inner(
              id,
              title
            )
          )
        `
        )
        .eq("user_id", userId);

      if (data && data.length > 0) {
        const eventTitles = Array.from(new Set(data.map((s: any) => s.posts?.events?.title).filter(Boolean)));
        eventsMap[userId] = eventTitles as string[];
      } else {
        eventsMap[userId] = [];
      }
    }

    setUserEvents(eventsMap);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);

    try {
      // Carregar eventos
      let eventsQuery = sb
        .from("events")
        .select("id, title, is_active")
        .eq("is_active", true)
        .order("title");

      if (!isMasterAdmin && currentAgencyId) {
        eventsQuery = eventsQuery.eq("agency_id", currentAgencyId);
      }

      const { data: eventsData } = await eventsQuery;
      setEvents(eventsData || []);

      if (isMasterAdmin) {
        const { data, error } = await sb.from("profiles").select("*, gender").order("created_at", { ascending: false });

        if (error) throw error;
        setUsers(data || []);

        if (data && data.length > 0) {
          await loadUserEvents(data.map((u) => u.id));
        }
      } else if (currentAgencyId) {
        const { data: profilesData, error: profilesError } = await sb
          .from("profiles")
          .select("*, gender")
          .eq("agency_id", currentAgencyId)
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        setUsers(profilesData || []);

        if (profilesData && profilesData.length > 0) {
          await loadUserEvents(profilesData.map((u) => u.id));
        }
      } else {
        setUsers([]);
      }
    } catch (error) {
      toast.error("Erro ao carregar usuários", {
        description: "Não foi possível carregar a lista de usuários. Tente novamente.",
      });
      console.error("❌ Erro ao carregar usuários:", error);
      setUsers([]);
    }

    setLoading(false);
  }, [isMasterAdmin, currentAgencyId, loadUserEvents]);

  return {
    users,
    loading,
    currentAgencyId,
    isMasterAdmin,
    events,
    userEvents,
    checkAdminStatus,
    loadUsers,
    setUsers,
  };
};
