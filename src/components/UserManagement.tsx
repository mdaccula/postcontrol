import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sb } from "@/lib/supabaseSafe";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";
import { z } from "zod";
import { CSVImportExport } from "@/components/CSVImportExport";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useProfiles } from "@/hooks/useReactQuery";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  instagram: string | null;
  phone: string | null;
  created_at: string;
  gender?: string | null;
    followers_range?: string | null; // ✅ ADICIONAR

}

// Validation schema
const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  instagram: z.string().trim().min(1, "Instagram é obrigatório").max(50, "Instagram muito longo"),
  phone: z
    .string()
    .trim()
    .regex(/^\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})$/, "Formato de telefone inválido. Use: (00) 00000-0000")
    .optional()
    .or(z.literal("")),
});

export const UserManagement = () => {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [events, setEvents] = useState<any[]>([]);
  const [userEvents, setUserEvents] = useState<Record<string, string[]>>({});
  const [userSalesCount, setUserSalesCount] = useState<Record<string, number>>({});
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Usar React Query para cache de profiles
  const { data: cachedProfiles, isLoading: loadingProfiles } = useProfiles(currentAgencyId || undefined);
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Atualizar users quando cachedProfiles mudar
  useEffect(() => {
    if (cachedProfiles) {
      setUsers(cachedProfiles);
    }
  }, [cachedProfiles]);

  // Carregar usuários apenas quando isMasterAdmin e currentAgencyId estiverem definidos
  useEffect(() => {
    if (isMasterAdmin !== null && (isMasterAdmin || currentAgencyId)) {
      loadUsers();
    }
  }, [isMasterAdmin, currentAgencyId]);

  const checkAdminStatus = async () => {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    // Check if master admin
    const { data: masterCheck } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "master_admin")
      .maybeSingle();

    setIsMasterAdmin(!!masterCheck);

    // Se não for master admin, buscar agência onde é owner
    if (!masterCheck) {
      const { data: agencyData } = await sb.from("agencies").select("id").eq("owner_id", user.id).maybeSingle();

      setCurrentAgencyId(agencyData?.id || null);
      console.log("👤 Agency Admin - agência:", agencyData?.id);
    } else {
      console.log("👑 Master Admin");
    }
    // Não chamar loadUsers() aqui - será chamado pelo useEffect
  };

  const loadUsers = async () => {
    try {
      // Carregar eventos apenas da agência atual
      let eventsQuery = sb
        .from("events")
        .select("id, title, is_active")
        .eq("is_active", true)
        .order("title");
      
      // Filtrar por agência se não for master admin
      if (!isMasterAdmin && currentAgencyId) {
        eventsQuery = eventsQuery.eq("agency_id", currentAgencyId);
      }

      const { data: eventsData } = await eventsQuery;
      setEvents(eventsData || []);

      if (isMasterAdmin) {
        // Master admin vê todos os usuários
        console.log("👑 Master Admin - carregando todos os usuários");
        const { data, error } = await sb.from("profiles").select("*, gender").order("created_at", { ascending: false });

        if (error) throw error;
        console.log(`📊 Loaded ${data?.length || 0} users (master admin)`);
        setUsers(data || []);

        // Carregar eventos por usuário
        if (data && data.length > 0) {
          await loadUserEvents(data.map((u) => u.id));
        }
      } else if (currentAgencyId) {
        // Agency admin vê apenas usuários que fizeram submissões em eventos da sua agência
        console.log("👤 Agency Admin - carregando usuários com submissões da agência:", currentAgencyId);

        // Primeiro, buscar os IDs dos usuários que fizeram submissões
        const { data: submissionsData, error: submissionsError } = await sb
          .from("submissions")
          .select(
            `
            user_id,
            posts!inner(
              event_id,
              events!inner(
                agency_id
              )
            )
          `,
          )
          .eq("posts.events.agency_id", currentAgencyId);

        if (submissionsError) {
          console.error("❌ Erro ao buscar submissões:", submissionsError);
          throw submissionsError;
        }

        console.log("📋 Submissões encontradas:", submissionsData?.length || 0);

        // Extrair IDs únicos de usuários
        const userIds = Array.from(new Set((submissionsData || []).map((s: any) => s.user_id)));
        console.log("👥 User IDs únicos:", userIds.length, userIds);

        if (userIds.length === 0) {
          console.log("⚠️ Nenhum usuário encontrado com submissões");
          setUsers([]);
          return;
        }

        // Buscar os perfis desses usuários
        const { data: profilesData, error: profilesError } = await sb
          .from("profiles")
          .select("*, gender")
          .in("id", userIds)
          .order("created_at", { ascending: false });

        if (profilesError) {
          console.error("❌ Erro ao buscar perfis:", profilesError);
          throw profilesError;
        }

        console.log(`📊 Loaded ${profilesData?.length || 0} users for agency ${currentAgencyId}`);
        setUsers(profilesData || []);

        // Carregar eventos por usuário
        if (profilesData && profilesData.length > 0) {
          await loadUserEvents(profilesData.map((u) => u.id));
        }
} else {
  // Agency admin SEM currentAgencyId definido - buscar diretamente do perfil
  const { data: { user: currentUser } } = await sb.auth.getUser();
  if (!currentUser) {
    setUsers([]);
    return;
  }
  
  const { data: profileData } = await sb
    .from('profiles')
    .select('agency_id')
    .eq('id', currentUser.id)
    .maybeSingle();
  
  if (profileData?.agency_id) {
    // Buscar usuários da mesma agência
    const { data: agencyUsers } = await sb
      .from('profiles')
.select('*, gender, followers_range')
      .eq('agency_id', profileData.agency_id)
      .order('created_at', { ascending: false });
    
    setUsers(agencyUsers || []);
  } else {
    console.warn("⚠️ Agency admin sem agency_id no perfil");
    setUsers([]);
  }
}
    } catch (error) {
      toast.error("Erro ao carregar usuários", {
        description: "Não foi possível carregar a lista de usuários. Tente novamente."
      });
      console.error("❌ Erro ao carregar usuários:", error);
      setUsers([]);
    }
  };

  const loadUserEvents = async (userIds: string[]) => {
  if (userIds.length === 0) {
    setUserEvents({});
    setUserSalesCount({});
    return;
  }

  // ✅ UMA ÚNICA QUERY para todos os usuários
  const { data } = await sb
    .from("submissions")
    .select(`
      user_id,
      posts!inner(
        events!inner(
          id,
          title
        )
      ),
      submission_type,
      status
    `)
    .in("user_id", userIds);

  // Processar dados em memória (muito mais rápido)
  const eventsMap: Record<string, string[]> = {};
  const salesMap: Record<string, number> = {};

  userIds.forEach(userId => {
    eventsMap[userId] = [];
    salesMap[userId] = 0;
  });

  if (data) {
    data.forEach((submission: any) => {
      const userId = submission.user_id;
      const eventTitle = submission.posts?.events?.title;
      
      // Adicionar evento único
      if (eventTitle && !eventsMap[userId].includes(eventTitle)) {
        eventsMap[userId].push(eventTitle);
      }
      
      // Contar vendas aprovadas
      if (submission.submission_type === 'sale' && submission.status === 'approved') {
        salesMap[userId] = (salesMap[userId] || 0) + 1;
      }
    });
  }

  setUserEvents(eventsMap);
  setUserSalesCount(salesMap);
};

  const startEdit = (user: Profile) => {
    setEditingUser(user.id);
    setEditForm({
      email: user.email,
      phone: user.phone,
      full_name: user.full_name,
      instagram: user.instagram,
      gender: user.gender, // ADICIONAR ESTA LINHA
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const saveEdit = async (userId: string) => {
    // Validate inputs before saving
    try {
      profileUpdateSchema.parse({
        full_name: editForm.full_name,
        email: editForm.email,
        instagram: editForm.instagram,
        phone: editForm.phone || "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    const { error } = await sb
      .from("profiles")
      .update({
        email: editForm.email,
        phone: editForm.phone,
        full_name: editForm.full_name,
        instagram: editForm.instagram,
        gender: editForm.gender, // ADICIONAR ESTA LINHA
      })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao atualizar usuário", {
        description: "Não foi possível salvar as alterações. Verifique os dados e tente novamente."
      });
      console.error(error);
    } else {
      toast.success("Usuário atualizado com sucesso", {
        description: "As informações do usuário foram salvas."
      });
      await loadUsers();
      cancelEdit();
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.full_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.instagram?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.phone?.includes(debouncedSearchTerm);

      const matchesGender = genderFilter === "all" || user.gender === genderFilter;

      const matchesEvent =
        eventFilter === "all" ||
        userEvents[user.id]?.some((eventTitle) => events.find((e) => e.title === eventTitle)?.id === eventFilter);

      return matchesSearch && matchesGender && matchesEvent;
    });
  }, [users, debouncedSearchTerm, genderFilter, eventFilter, userEvents, events]);

  // Paginação
  const {
    paginatedItems: paginatedUsers,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({
    items: filteredUsers,
    itemsPerPage: 20,
  });

  if (loadingProfiles) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gerenciador de Usuários</h2>
          <CSVImportExport onImportComplete={loadUsers} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Buscar usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos os sexos</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="LGBTQ+">LGBTQ+</option>
          </select>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos os eventos</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="p-6">
        {filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedUsers.map((user) => (
              <Card key={user.id} className="p-6">
                {editingUser === user.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome Completo</Label>
                        <Input
                          value={editForm.full_name || ""}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={editForm.email || ""}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Instagram (sem @)</Label>
                        <Input
                          value={editForm.instagram || ""}
                          onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          value={editForm.phone || ""}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Sexo</Label>
                        <select
                          value={editForm.gender || ""}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Não definido</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="LGBTQ+">LGBTQ+</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={cancelEdit}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button onClick={() => saveEdit(user.id)} className="bg-gradient-primary">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg">{user.full_name || "Nome não definido"}</h3>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Email:</span>{" "}
                          <span className="font-medium">{user.email || "Não definido"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Instagram:</span>{" "}
                          <a
                            href={`https://instagram.com/${user.instagram?.replace("@", "") || ""}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            @{user.instagram?.replace("@", "") || "Não definido"}
                          </a>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Telefone:</span>{" "}
                          <span className="font-medium">{user.phone || "Não definido"}</span>
                        </div>
                     <div>
  <span className="text-muted-foreground">Sexo:</span>{" "}
  <span className="font-medium">{user.gender || "Não definido"}</span>
</div>
<div>
  <span className="text-muted-foreground">Seguidores:</span>{" "}
  <span className="font-medium">{user.followers_range || "Não informado"}</span>
</div>

                        <span className="text-muted-foreground">Cadastrado em:</span>{" "}
                          <span className="font-medium">{new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {userEvents[user.id] && userEvents[user.id].length > 0 && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Eventos participando:</span>{" "}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {userEvents[user.id].map((eventTitle, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded"
                                >
                                  {eventTitle}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {userSalesCount[user.id] !== undefined && userSalesCount[user.id] > 0 && (
                          <div>
                            <span className="text-muted-foreground">Vendas Aprovadas:</span>{" "}
                            <span className="font-medium text-green-600">💰 {userSalesCount[user.id]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
              ))}
            </div>
            
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
            />
          </>
        )}
      </Card>
    </div>
  );
};
