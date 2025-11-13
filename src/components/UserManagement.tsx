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
import { useUserManagement } from "@/hooks/useUserManagement";

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

// Validation schema
const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  instagram: z.string().trim().min(1, "Instagram é obrigatório").max(50, "Instagram muito longo"),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, '')) // Remove tudo que não é número
    .refine((val) => val === '' || val.length === 10 || val.length === 11, {
      message: "Telefone deve ter 10 ou 11 dígitos"
    })
    .optional()
    .or(z.literal("")),
});

export const UserManagement = () => {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [followersFilter, setFollowersFilter] = useState<string>("all");
  const [minSubmissions, setMinSubmissions] = useState<number>(0);
  const [minEvents, setMinEvents] = useState<number>(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const { 
    users, 
    loading, 
    loadingEvents, 
    currentAgencyId, 
    isMasterAdmin, 
    events, 
    userEvents,
    userSalesCount,
    checkAdminStatus, 
    loadUsers, 
    setUsers 
  } = useUserManagement();

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Carregar usuários apenas quando isMasterAdmin e currentAgencyId estiverem definidos
  useEffect(() => {
    if (isMasterAdmin !== null && (isMasterAdmin || currentAgencyId)) {
      loadUsers();
    }
  }, [isMasterAdmin, currentAgencyId, loadUsers]);

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
    console.log('💾 Salvando edição para usuário:', userId);
    console.log('📝 Dados do formulário:', editForm);
    
    // Validate inputs before saving
    try {
      const validatedData = profileUpdateSchema.parse({
        full_name: editForm.full_name,
        email: editForm.email,
        instagram: editForm.instagram || "",
        phone: editForm.phone || "",
      });
      console.log('✅ Validação passou:', validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Erro de validação:', error.errors);
        toast.error(error.errors[0].message);
        return;
      }
    }

    // Limpar telefone antes de salvar
    const cleanPhone = editForm.phone ? editForm.phone.replace(/\D/g, '') : '';
    
    const updateData = {
      email: editForm.email,
      phone: cleanPhone,
      full_name: editForm.full_name,
      instagram: editForm.instagram || '',
      gender: editForm.gender || null,
    };
    
    console.log('📤 Enviando update:', updateData);
    
    const { error } = await sb
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error('❌ Erro no update:', error);
      toast.error("Erro ao atualizar usuário", {
        description: error.message || "Não foi possível salvar as alterações. Verifique os dados e tente novamente."
      });
    } else {
      console.log('✅ Update bem-sucedido');
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
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.instagram?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm);

      const matchesGender = genderFilter === "all" || user.gender === genderFilter;
      const matchesFollowers = followersFilter === "all" || user.followers_range === followersFilter;

      let matchesEvent = true;
      if (eventFilter !== "all") {
        if (eventFilter === "no_event") {
          matchesEvent = userEvents.hasOwnProperty(user.id) && userEvents[user.id].length === 0;
        } else {
          matchesEvent = userEvents[user.id]?.some((event) => event.id === eventFilter);
        }
      }

      const submissionCount = userSalesCount[user.id] || 0;
      const matchesMinSubmissions = submissionCount >= minSubmissions;

      const eventCount = userEvents[user.id]?.length || 0;
      const matchesMinEvents = eventCount >= minEvents;

      return matchesSearch && matchesGender && matchesFollowers && matchesEvent && matchesMinSubmissions && matchesMinEvents;
    });
  }, [users, searchTerm, genderFilter, followersFilter, eventFilter, userEvents, minSubmissions, minEvents, userSalesCount]);

  // Paginação
  const {
    paginatedItems: paginatedUsers,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination<Profile>({
    items: filteredUsers,
    itemsPerPage: itemsPerPage,
  });

  if (loading) {
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Gerenciador de Usuários</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
              {(eventFilter !== "all" || genderFilter !== "all" || searchTerm) && (
                <span className="text-xs ml-1">de {users.length} total</span>
              )}
            </p>
          </div>
          <CSVImportExport 
            users={filteredUsers} 
            onImportComplete={loadUsers} 
            currentAgencyId={currentAgencyId || undefined}
            isMasterAdmin={isMasterAdmin || false}
            genderFilter={genderFilter}
            followersFilter={followersFilter}
            minSubmissions={minSubmissions}
            minEvents={minEvents}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
            disabled={loadingEvents} // ✅ ITEM 4: Desabilitar enquanto carrega
          >
            <option value="all">Todos os eventos</option>
            <option value="no_event" disabled={loadingEvents}>
              {loadingEvents ? '⏳ Carregando...' : '🚫 Sem Evento'}
            </option>
            {events.map((event: any) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          
          <select
            value={itemsPerPage.toString()}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              goToPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="30">30 por página</option>
            <option value="50">50 por página</option>
            <option value="100">100 por página</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
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
                        <Label>Telefone (apenas números)</Label>
                        <Input
                          value={editForm.phone || ""}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D/g, '');
                            setEditForm({ ...editForm, phone: cleaned });
                          }}
                          placeholder="11999887766"
                          maxLength={11}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Digite apenas números (10 ou 11 dígitos)</p>
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
                          <span className="text-muted-foreground">Faixa de Seguidores:</span>{" "}
                          <span className="font-medium">{user.followers_range || "Não informado"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cadastrado em:</span>{" "}
                          <span className="font-medium">{new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {userEvents[user.id] && userEvents[user.id].length > 0 && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Eventos participando:</span>{" "}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {userEvents[user.id].map((event, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded"
                                >
                                  {event.displayName}
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
      )}
    </div>
  );
};
