import { useState } from "react";
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
import { Pencil, Trash2, Search, Users, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/usePagination";
import { useAllUsers, useAgencies } from "@/hooks/useAllUsers";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  
  // ✅ ITEM 6 & 7: Migração para React Query + Paginação Backend
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
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

  // ✅ Opções de gênero fixas
  const genderOptions = ['Masculino', 'Feminino', 'LGBTQ+', 'Agência'];

  // ✅ ITEM 6: React Query para carregar usuários com paginação backend
  const { 
    data: usersData, 
    isLoading: isLoadingUsers,
    refetch: refetchUsers 
  } = useAllUsers({
    page: currentPage,
    pageSize: 20,
    searchTerm,
    roleFilter,
    agencyFilter,
    genderFilter
  });

  // ✅ ITEM 6: React Query para carregar agências
  const { data: agencies = [] } = useAgencies();

  const users = usersData?.users || [];
  const totalCount = usersData?.totalCount || 0;
  // ✅ ITEM 4: Ajustar paginação para considerar filtros de role
  const totalPages = Math.ceil(totalCount / 20) || 1;

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
      await refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
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

      await refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
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

  const handleExportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      users.map(user => {
        // Limpar Instagram username (remover @ se existir)
        const cleanInstagram = user.instagram 
          ? user.instagram.replace('@', '').trim()
          : "";
        
        return {
          Nome: user.full_name || "",
          Email: user.email || "",
          Instagram: cleanInstagram ? `@${cleanInstagram}` : "",
          "Link Instagram": cleanInstagram ? `https://instagram.com/${cleanInstagram}` : "",
          Telefone: user.phone || "",
          Gênero: user.gender || "",
          "Faixa de Seguidores": user.followers_range || "",
          Nível: getUserRole(user.roles),
          Agência: getAgencyName(user.agency_id),
          "Total Posts": user.submission_count || 0,
        };
      })
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuários");
    XLSX.writeFile(workbook, `usuarios_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({
      title: "Exportação concluída",
      description: `${users.length} usuários exportados com sucesso.`,
    });
  };

  // ✅ Handlers de paginação
  const goToPage = (page: number) => setCurrentPage(page);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const previousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Todos os Usuários</h2>
          <p className="text-muted-foreground mt-1">
            Visualize, edite e gerencie todos os usuários do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isLoadingUsers || users.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar XLSX
          </Button>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            {totalCount} usuários {totalPages > 1 && `(página ${currentPage} de ${totalPages})`}
          </Badge>
        </div>
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
          <div className="w-full md:w-48">
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os gêneros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gêneros</SelectItem>
                {genderOptions.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {gender}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-4 md:p-6">
        {isLoadingUsers ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        ) : users.length === 0 ? (
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
          <div className="w-full overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%] min-w-[140px]">
                      <div className="truncate">Nome</div>
                    </TableHead>
                    <TableHead className="w-[18%] min-w-[160px]">
                      <div className="truncate">Email</div>
                    </TableHead>
                    <TableHead className="w-[10%] min-w-[100px]">
                      <div className="truncate">Instagram</div>
                    </TableHead>
                    <TableHead className="w-[10%] min-w-[100px] hidden lg:table-cell">
                      <div className="truncate">Telefone</div>
                    </TableHead>
                    <TableHead className="w-[12%] min-w-[110px] hidden lg:table-cell">
                      <div className="truncate">Faixa Seguidores</div>
                    </TableHead>
                    <TableHead className="w-[8%] min-w-[80px] hidden xl:table-cell">
                      <div className="truncate">Sexo</div>
                    </TableHead>
                    <TableHead className="w-[10%] min-w-[100px]">
                      <div className="truncate">Acesso</div>
                    </TableHead>
                    <TableHead className="w-[12%] min-w-[110px] hidden lg:table-cell">
                      <div className="truncate">Agência</div>
                    </TableHead>
                    <TableHead className="w-[6%] min-w-[60px] text-center">Posts</TableHead>
                    <TableHead className="w-[10%] min-w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium max-w-0">
                        <div className="truncate" title={user.full_name || "—"}>
                          {user.full_name || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0">
                        <div className="truncate text-xs" title={user.email || "—"}>
                          {user.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0">
                        <div className="truncate text-xs">
                          {user.instagram 
                            ? (user.instagram.startsWith('@') ? user.instagram : `@${user.instagram}`)
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0 hidden lg:table-cell">
                        <div className="truncate text-xs">{user.phone || "—"}</div>
                      </TableCell>
                      <TableCell className="max-w-0 hidden lg:table-cell">
                        <div className="truncate">
                          <Badge variant="secondary" className="text-xs max-w-full truncate">
                            {user.followers_range || "Não informado"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0 hidden xl:table-cell">
                        <div className="truncate">
                          <Badge variant="outline" className="text-xs max-w-full truncate">
                            {user.gender || "—"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0">
                        <div className="truncate">
                          <Badge variant={getRoleBadgeVariant(user.roles)} className="text-xs max-w-full truncate">
                            {getUserRole(user.roles)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0 hidden lg:table-cell">
                        <div className="truncate text-xs" title={getAgencyName(user.agency_id)}>
                          {getAgencyName(user.agency_id)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {user.submission_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end flex-nowrap">
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
