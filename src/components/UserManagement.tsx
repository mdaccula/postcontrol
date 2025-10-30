import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sb } from "@/lib/supabaseSafe";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";
import { z } from "zod";
import { CSVImportExport } from "@/components/CSVImportExport";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  instagram: string | null;
  phone: string | null;
  created_at: string;
  gender?: string | null;
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
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [events, setEvents] = useState<any[]>([]);
  const [userEvents, setUserEvents] = useState<Record<string, string[]>>({});

  useEffect(() => {
    checkAdminStatus();
  }, []);

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
    setLoading(true);

    try {
      // Carregar eventos
      const { data: eventsData } = await sb
        .from('events')
        .select('id, title, is_active')
        .eq('is_active', true)
        .order('title');
      
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
          await loadUserEvents(data.map(u => u.id));
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
          setLoading(false);
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
          await loadUserEvents(profilesData.map(u => u.id));
        }
      } else {
        console.warn("⚠️ Agency admin sem currentAgencyId definido");
        setUsers([]);
      }
    } catch (error) {
      toast.error("Erro ao carregar usuários");
      console.error("❌ Erro ao carregar usuários:", error);
      setUsers([]);
    }

    setLoading(false);
  };

  const loadUserEvents = async (userIds: string[]) => {
    // Buscar eventos únicos por usuário via submissions
    const eventsMap: Record<string, string[]> = {};
    
    for (const userId of userIds) {
      const { data } = await sb
        .from('submissions')
        .select(`
          posts!inner(
            events!inner(
              id,
              title
            )
          )
        `)
        .eq('user_id', userId);
      
      if (data && data.length > 0) {
        const eventTitles = Array.from(
          new Set(
            data
              .map((s: any) => s.posts?.events?.title)
              .filter(Boolean)
          )
        );
        eventsMap[userId] = eventTitles as string[];
      } else {
        eventsMap[userId] = [];
      }
    }
    
    setUserEvents(eventsMap);
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
      toast.error("Erro ao atualizar usuário");
      console.error(error);
    } else {
      toast.success("Usuário atualizado com sucesso");
      await loadUsers();
      cancelEdit();
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.instagram?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    
    const matchesGender = genderFilter === "all" || user.gender === genderFilter;
    
    const matchesEvent = eventFilter === "all" || (userEvents[user.id]?.some(eventTitle => 
      events.find(e => e.title === eventTitle)?.id === eventFilter
    ));
    
    return matchesSearch && matchesGender && matchesEvent;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
          <Input 
            placeholder="Buscar usuário..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          
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
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="p-6">
        {filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
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
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(user.id)}>
                        <Save className="h-4 w-4 mr-1" />
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
                          <span className="text-muted-foreground">Cadastrado em:</span>{" "}
                          <span className="font-medium">{new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {userEvents[user.id] && userEvents[user.id].length > 0 && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Eventos participando:</span>{" "}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {userEvents[user.id].map((eventTitle, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                                  {eventTitle}
                                </span>
                              ))}
                            </div>
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
        )}
      </Card>
    </div>
  );
};
