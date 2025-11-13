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
  followers_range?: string | null;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false); // ✅ ITEM 4: Novo state
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [userEvents, setUserEvents] = useState<Record<string, Array<{ id: string; displayName: string }>>>({});
  const [userSalesCount, setUserSalesCount] = useState<Record<string, number>>({});

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
    setLoadingEvents(true);
    
    if (userIds.length === 0) {
      setUserEvents({});
      setUserSalesCount({});
      setLoadingEvents(false);
      return;
    }

    const { data } = await sb
      .from("submissions")
      .select(`
        user_id,
        posts!inner(
          post_type,
          events!inner(
            id,
            title,
            event_purpose
          )
        ),
        submission_type,
        status
      `)
      .in("user_id", userIds);

    // ✅ ITEM 4: Armazenar TANTO eventId quanto displayName
    const eventsMap: Record<string, Array<{ id: string; displayName: string }>> = {};
    const salesMap: Record<string, number> = {};

    userIds.forEach(userId => {
      eventsMap[userId] = [];
      salesMap[userId] = 0;
    });

    if (data) {
      data.forEach((submission: any) => {
        const userId = submission.user_id;
        const eventId = submission.posts?.events?.id;
        const eventTitle = submission.posts?.events?.title;
        const postType = submission.posts?.post_type || submission.posts?.events?.event_purpose || 'divulgacao';
        
        const typeLabel = postType === 'sale' ? 'Vendas' : postType === 'selecao_perfil' ? 'Seleção' : 'Divulgação';
        const displayName = eventTitle ? `${eventTitle} (${typeLabel})` : null;
        
        // ✅ Verificar se evento já existe pelo ID
        if (eventId && displayName && !eventsMap[userId].some(e => e.id === eventId)) {
          eventsMap[userId].push({ id: eventId, displayName });
        }
        
        if (submission.submission_type === 'sale' && submission.status === 'approved') {
          salesMap[userId] = (salesMap[userId] || 0) + 1;
        }
      });
    }

    console.log('📊 Usuários sem evento:', Object.entries(eventsMap).filter(([_, events]) => events.length === 0).length);
    console.log('📊 Total de usuários:', Object.keys(eventsMap).length);

    setUserEvents(eventsMap);
    setUserSalesCount(salesMap);
    setLoadingEvents(false);
  }, []); // ✅ Função estável sem dependências

  const loadUsers = useCallback(async () => {
    setLoading(true);
    
    try {
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
        const { data, error } = await sb
          .from("profiles")
          .select("*, gender")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setUsers(data || []);

        if (data && data.length > 0) {
          await loadUserEvents(data.map((u) => u.id));
        }
    } else if (currentAgencyId) {
      // 🔧 CORREÇÃO 6: Buscar TODOS os usuários da agência (374), não apenas com submissões (323)
      console.log("👤 Agency Admin - carregando TODOS os usuários da agência:", currentAgencyId);
      
      const { data: profilesData, error: profilesError } = await sb
        .from("profiles")
        .select("*, gender")
        .eq("agency_id", currentAgencyId)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;
      
      console.log(`📊 Total de ${profilesData?.length || 0} usuários cadastrados na agência`);
      setUsers(profilesData || []);

      if (profilesData && profilesData.length > 0) {
        console.log('📊 Carregando eventos para', profilesData.length, 'usuários');
        await loadUserEvents(profilesData.map((u) => u.id));
        
        // Verificar se carregamento funcionou
        setTimeout(() => {
          console.log('📊 userEvents final keys:', Object.keys(userEvents).length, 'usuários');
        }, 500);
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
    } finally {
      setLoading(false);
    }
  }, [isMasterAdmin, currentAgencyId]); // ✅ Removido loadUserEvents para evitar loop

  return {
    users,
    loading,
    loadingEvents, // ✅ ITEM 4: Exportar novo state
    currentAgencyId,
    isMasterAdmin,
    events,
    userEvents,
    userSalesCount,
    checkAdminStatus,
    loadUsers,
    setUsers,
  };
};
