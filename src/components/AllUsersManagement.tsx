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

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  instagram?: string;
  agency_id?: string;
  created_at: string;
  roles?: string[];
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
  });
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('🔄 Carregando usuários...');
    
    // Load users first
const { data: usersData, error: usersError } = await sb
  .from('profiles')
  .select('*, gender')
  .order('created_at', { ascending: false });


    console.log('📊 Usuários carregados:', usersData?.length, 'Error:', usersError);

    if (usersData) {
      // Load roles separately for each user
      const usersWithRoles = await Promise.all(usersData.map(async (user: any) => {
        const { data: rolesData } = await sb
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        return {
          ...user,
          roles: rolesData?.map((ur: any) => ur.role) || []
        };
      }));
      
      console.log('✅ Usuários com roles:', usersWithRoles.length);
      
      setUsers(usersWithRoles);

      // Load submission counts for each user
      const counts: Record<string, number> = {};
      await Promise.all(
        usersWithRoles.map(async (user) => {
          const { count } = await sb
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          counts[user.id] = count || 0;
        })
      );
      setSubmissionCounts(counts);
    }

    // Load agencies
    const { data: agenciesData } = await sb
      .from('agencies')
      .select('id, name, slug')
      .order('name', { ascending: true });

    if (agenciesData) {
      setAgencies(agenciesData);
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
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await sb
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone || null,
          instagram: editForm.instagram || null,
          agency_id: editForm.agency_id || null,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Usuário atualizado",
        description: "As informações foram salvas com sucesso.",
      });

      setEditDialogOpen(false);
      await loadData();
    } catch (error: any) {
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
      // Chamar edge function que tem permissão para deletar usuários
      const { data, error } = await sb.functions.invoke('delete-user', {
        body: { userId }
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
          {filteredUsers.length} usuários
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
      <Card className="p-6">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de busca
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
<TableHeader>
  <TableRow>
    <TableHead>Nome</TableHead>
    <TableHead>Email</TableHead>
    <TableHead>Instagram</TableHead>
    <TableHead>Telefone</TableHead>
    <TableHead>Sexo</TableHead>
    <TableHead>Nível de Acesso</TableHead>
    <TableHead>Agência</TableHead>
    <TableHead className="text-center">Submissões</TableHead>
    <TableHead className="text-right">Ações</TableHead>
  </TableRow>
</TableHeader>

              <TableBody>
          {filteredUsers.map((user) => (
  <TableRow key={user.id}>
    <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
    <TableCell>{user.email || "—"}</TableCell>
    <TableCell>
      {user.instagram ? `@${user.instagram}` : "—"}
    </TableCell>
    <TableCell>{user.phone || "—"}</TableCell>
    <TableCell>
      <Badge variant="outline">
        {user.gender || "Não informado"}
      </Badge>
    </TableCell>
    <TableCell>
      <Badge variant={getRoleBadgeVariant(user.roles)}>
        {getUserRole(user.roles)}
      </Badge>
    </TableCell>
    <TableCell>{getAgencyName(user.agency_id)}</TableCell>
    <TableCell className="text-center">
      <Badge variant="secondary">
        {submissionCounts[user.id] || 0}
      </Badge>
    </TableCell>

                <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDeleteUser(user.id, user.full_name || user.email)
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
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
              <Label htmlFor="agency">Agência Vinculada</Label>
              <Select
                value={editForm.agency_id || "none"}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, agency_id: value === "none" ? null : value })
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
