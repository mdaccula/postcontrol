import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Search, Users } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/usePagination";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  gender?: string;
  instagram?: string;
  agency_id?: string;
  created_at: string;
  roles?: string[];
  followers_range?: string;
}

interface Agency {
  id: string;
  name: string;
  slug: string;
}

export const AllUsersManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [genderOptions, setGenderOptions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    instagram: "",
    agency_id: "",
    gender: "",
  });
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log("🔄 Carregando usuários...");

    // Load users first
    const { data: usersData, error: usersError } = await sb
      .from("profiles")
      .select("*, gender")
      .order("created_at", { ascending: false });

    console.log("📊 Usuários carregados:", usersData?.length, "Error:", usersError);

    if (usersData) {
      // Load roles separately for each user
      const usersWithRoles = await Promise.all(
        usersData.map(async (user: any) => {
          const { data: rolesData } = await sb
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

          return {
            ...user,
            roles: rolesData?.map((ur: any) => ur.role) || [],
          };
        })
      );

      console.log("✅ Usuários com roles:", usersWithRoles.length);
      setUsers(usersWithRoles);

      // Load submission counts for each user
      const counts: Record<string, number> = {};
      await Promise.all(
        usersWithRoles.map(async (user) => {
          const { count } = await sb
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);
          counts[user.id] = count || 0;
        })
      );
      setSubmissionCounts(counts);
    }

    // Load agencies
    const { data: agenciesData } = await sb
      .from("agencies")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (agenciesData) {
      setAgencies(agenciesData);
    }

    // ✅ Load gender options dynamically (corrigido para TypeScript)
    const { data: genderData, error: genderError } = await sb
      .from("profiles")
      .select("gender", { distinct: true });

    if (!genderError && genderData) {
      const uniqueGenders: string[] = Array.from(
        new Set(
          (genderData as { gender: string | null }[])
            .map((item) => item.gender)
            .filter((g): g is string => Boolean(g))
        )
      );
      setGenderOptions(uniqueGenders);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      instagram: user.instagram || "",
      agency_id: user.agency_id || "",
      gender: user.gender || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    console.log('💾 [Master] Salvando usuário:', selectedUser.id);
    console.log('📝 [Master] Dados do formulário:', editForm);

    try {
      // Limpar telefone removendo caracteres especiais
      const cleanPhone = editForm.phone ? editForm.phone.replace(/\D/g, '') : null;
      
      const updateData = {
        full_name: editForm.full_name,
        email: editForm.email,
        phone: cleanPhone,
        instagram: editForm.instagram || null,
        agency_id: editForm.agency_id || null,
        gender: editForm.gender || null,
      };
      
      console.log('📤 [Master] Enviando update:', updateData);
      
      const { error } = await sb
        .from("profiles")
        .update(updateData)
        .eq("id", selectedUser.id);

      if (error) {
        console.error('❌ [Master] Erro no update:', error);
        throw error;
      }

      console.log('✅ [Master] Update bem-sucedido');

      toast({
        title: "Usuário atualizado",
        description: "As informações foram salvas com sucesso.",
      });

      setEditDialogOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('❌ [Master] Exception:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirm = window.confirm(
      `⚠️ ATENÇÃO: Deseja realmente excluir o usuário "${userName}"?\n\nTODAS as submissões deste usuário também serão excluídas.\n\nEsta ação NÃO pode ser desfeita.`
    );

    if (!confirm) return;

    try {
      const { data, error } = await sb.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Usuário excluído",
        description: "O usuário e todas as suas submissões foram removidos.",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAgencyName = (agencyId?: string) => {
    if (!agencyId) return "—";
    const agency = agencies.find((a) => a.id === agencyId);
    return agency?.name || "—";
  };

  const getUserRole = (roles?: string[]) => {
    if (!roles || roles.length === 0) return "Usuário";
    if (roles.includes("master_admin")) return "Master Admin";
    if (roles.includes("agency_admin")) return "Agency Admin";
    return "Usuário";
  };

  const getRoleBadgeVariant = (roles?: string[]) => {
    if (!roles || roles.length === 0) return "secondary";
    if (roles.includes("master_admin")) return "default";
    if (roles.includes("agency_admin")) return "outline";
    return "secondary";
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = searchTerm
      ? user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.instagram?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesAgency =
      agencyFilter === "all" || user.agency_id === agencyFilter;

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "master_admin" && user.roles?.includes("master_admin")) ||
      (roleFilter === "agency_admin" && user.roles?.includes("agency_admin")) ||
      (roleFilter === "user" && (!user.roles || user.roles.length === 0));

    return matchesSearch && matchesAgency && matchesRole;
  });

  // Paginação
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedUsers,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage
  } = usePagination({ items: filteredUsers, itemsPerPage: 20 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Todos os Usuários</h2>
          <p className="text-muted-foreground mt-1">
            Visualize, edite e gerencie todos os usuários do sistema
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Users className="w-4 h-4 mr-2" />
          {filteredUsers.length} usuários {totalPages > 1 && `(página ${currentPage} de ${totalPages})`}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou Instagram..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Nível de acesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="master_admin">Master Admin</SelectItem>
                <SelectItem value="agency_admin">Agency Admin</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as agências" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as agências</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-4 md:p-6">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de busca
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] min-w-[180px]">Nome</TableHead>
                    <TableHead className="w-[200px] min-w-[200px]">Email</TableHead>
                    <TableHead className="w-[130px] min-w-[130px]">Instagram</TableHead>
                    <TableHead className="w-[120px] min-w-[120px] hidden lg:table-cell">Telefone</TableHead>
                    <TableHead className="w-[100px] min-w-[100px] hidden xl:table-cell">Sexo</TableHead>
                    <TableHead className="w-[140px] min-w-[140px]">Acesso</TableHead>
                    <TableHead className="w-[150px] min-w-[150px] hidden lg:table-cell">Agência</TableHead>
                    <TableHead className="w-[90px] min-w-[90px] text-center">Posts</TableHead>
                    <TableHead className="w-[120px] min-w-[120px] sticky right-0 bg-card">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium w-[180px] min-w-[180px]">
                        <div className="truncate max-w-[170px]" title={user.full_name || "—"}>
                          {user.full_name || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="w-[200px] min-w-[200px]">
                        <div className="truncate max-w-[190px]" title={user.email || "—"}>
                          {user.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="w-[130px] min-w-[130px]">
                        <div className="truncate max-w-[120px]">
                          {user.instagram ? `@${user.instagram}` : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="w-[120px] min-w-[120px] hidden lg:table-cell">{user.phone || "—"}</TableCell>
                      <TableCell className="w-[100px] min-w-[100px] hidden xl:table-cell">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {user.gender || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[140px] min-w-[140px]">
                        <Badge variant={getRoleBadgeVariant(user.roles)} className="text-xs whitespace-nowrap">
                          {getUserRole(user.roles)}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[150px] min-w-[150px] hidden lg:table-cell">
                        <div className="truncate max-w-[140px]" title={getAgencyName(user.agency_id)}>
                          {getAgencyName(user.agency_id)}
                        </div>
                      </TableCell>
                      <TableCell className="w-[90px] min-w-[90px] text-center">
                        <Badge variant="secondary" className="text-xs">
                          {submissionCounts[user.id] || 0}
                        </Badge>
                      </TableCell>
                       <TableCell className="w-[120px] min-w-[120px] sticky right-0 bg-card shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            title="Editar usuário"
                            className="h-7 w-7 p-0"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDeleteUser(
                                user.id,
                                user.full_name || user.email
                              )
                            }
                            title="Excluir usuário"
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
            />
          </div>
        )}
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (apenas números)</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  setEditForm({ ...editForm, phone: cleaned });
                }}
                placeholder="11999887766"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">Digite apenas números (10 ou 11 dígitos)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={editForm.instagram}
                onChange={(e) =>
                  setEditForm({ ...editForm, instagram: e.target.value })
                }
                placeholder="@usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gênero</Label>
              <Select
                value={editForm.gender || ""}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gênero" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency">Agência Vinculada</Label>
              <Select
                value={editForm.agency_id || "none"}
                onValueChange={(value) =>
                  setEditForm({
                    ...editForm,
                    agency_id: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma agência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma agência</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} className="bg-gradient-primary">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
