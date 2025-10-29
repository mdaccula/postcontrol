import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { UserPlus, Building2, Link as LinkIcon, Edit, Trash2, ExternalLink, Copy } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { EditAdminDialog } from "./EditAdminDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Plan {
  plan_key: string;
  plan_name: string;
  monthly_price: number;
  max_influencers: number;
  max_events: number;
}

interface AdminData {
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  instagram?: string;
  agency_id?: string;
  agency_name?: string;
  agency_slug?: string;
  created_at: string;
}

export const AdminManager = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    agencyName: "",
    agencySlug: "",
    plan: "basic"
  });

  useEffect(() => {
    loadPlans();
    loadAdmins();
  }, []);

  const loadPlans = async () => {
    const { data } = await sb
      .from('subscription_plans')
      .select('plan_key, plan_name, monthly_price, max_influencers, max_events')
      .order('display_order', { ascending: true });
    
    if (data) {
      setPlans(data);
    }
  };

  const loadAdmins = async () => {
    const { data: userRoles } = await sb
      .from('user_roles')
      .select(`
        user_id,
        created_at,
        profiles:user_id (
          email,
          full_name,
          phone,
          instagram
        )
      `)
      .eq('role', 'agency_admin');

    if (userRoles) {
      const adminsWithAgencies = await Promise.all(
        userRoles.map(async (role: any) => {
          const { data: agency } = await sb
            .from('agencies')
            .select('id, name, slug')
            .eq('owner_id', role.user_id)
            .maybeSingle();

          return {
            user_id: role.user_id,
            email: role.profiles?.email || '',
            full_name: role.profiles?.full_name || '',
            phone: role.profiles?.phone,
            instagram: role.profiles?.instagram,
            agency_id: agency?.id,
            agency_name: agency?.name,
            agency_slug: agency?.slug,
            created_at: role.created_at,
          };
        })
      );

      setAdmins(adminsWithAgencies);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Buscar limites do plano selecionado
      const selectedPlan = plans.find(p => p.plan_key === newAdmin.plan);
      
      if (!selectedPlan) {
        toast({
          title: "Erro",
          description: "Plano selecionado não encontrado.",
          variant: "destructive",
        });
        return;
      }

      // Criar agência
      const { data: agency, error: agencyError } = await sb
        .from('agencies')
        .insert({
          name: newAdmin.agencyName,
          slug: newAdmin.agencySlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          subscription_plan: newAdmin.plan,
          subscription_status: 'trial',
          max_influencers: selectedPlan.max_influencers,
          max_events: selectedPlan.max_events,
        })
        .select()
        .single();

      if (agencyError) {
        if (agencyError.code === '23505') {
          toast({
            title: "Erro",
            description: "Este slug já está em uso. Escolha outro.",
            variant: "destructive",
          });
        } else {
          throw agencyError;
        }
        return;
      }

      // Gerar link de convite
      const link = `${window.location.origin}/auth?agency=${agency.slug}&email=${encodeURIComponent(newAdmin.email)}&mode=signup`;
      setInviteLink(link);

      toast({
        title: "Agência e Admin criados!",
        description: `${newAdmin.agencyName} foi criado com sucesso. Link de convite gerado!`,
      });

      await loadAdmins();
      setDialogOpen(false);
      setNewAdmin({ email: "", agencyName: "", agencySlug: "", plan: "basic" });
    } catch (error: any) {
      toast({
        title: "Erro ao criar admin",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este admin? A agência não será excluída.')) return;

    try {
      const { error } = await sb
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'agency_admin');

      if (error) throw error;

      toast({
        title: "Admin excluído",
        description: "O admin foi removido com sucesso.",
      });

      await loadAdmins();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Link copiado!",
        description: "Envie este link para o admin se cadastrar.",
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Admins</h2>
          <p className="text-muted-foreground mt-1">
            Crie novas agências e convide administradores
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Admin
        </Button>
      </div>

      {inviteLink && (
        <Card className="p-4 bg-primary/5 border-primary/20 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Link de Convite Gerado:</p>
              <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
                {inviteLink}
              </code>
            </div>
            <Button onClick={handleCopyInviteLink} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        {admins.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum admin cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie uma nova agência e convide o primeiro administrador
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.user_id}>
                    <TableCell className="font-medium">{admin.full_name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.phone || '-'}</TableCell>
                    <TableCell>
                      {admin.agency_name ? (
                        <div>
                          <div className="font-medium">{admin.agency_name}</div>
                          <div className="text-xs text-muted-foreground">/{admin.agency_slug}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sem agência</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {admin.agency_slug && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/admin?agency=${admin.agency_slug}`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.user_id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Admin de Agência</DialogTitle>
            <DialogDescription>
              Crie uma nova agência e convide o administrador responsável
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do Admin *</Label>
              <Input
                id="email"
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                placeholder="admin@agencia.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Um link de convite será gerado após a criação
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencyName">Nome da Agência *</Label>
              <Input
                id="agencyName"
                value={newAdmin.agencyName}
                onChange={(e) => setNewAdmin({ ...newAdmin, agencyName: e.target.value })}
                placeholder="Minha Agência Digital"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencySlug">Slug (URL única) *</Label>
              <Input
                id="agencySlug"
                value={newAdmin.agencySlug}
                onChange={(e) => setNewAdmin({ ...newAdmin, agencySlug: e.target.value.toLowerCase() })}
                placeholder="minha-agencia"
                required
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LinkIcon className="w-3 h-3" />
                <span>URL de acesso: <strong>seuapp.com/{newAdmin.agencySlug || 'slug'}</strong></span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plano Inicial *</Label>
              <Select value={newAdmin.plan} onValueChange={(value) => setNewAdmin({ ...newAdmin, plan: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.plan_key} value={plan.plan_key}>
                      {plan.plan_name} - R$ {plan.monthly_price.toFixed(0)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newAdmin.plan && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-semibold mb-1">✅ 7 dias de teste gratuito incluídos</p>
                  <p className="font-semibold mb-1">Limites do plano:</p>
                  {plans.filter(p => p.plan_key === newAdmin.plan).map((plan) => (
                    <ul key={plan.plan_key} className="list-disc list-inside text-muted-foreground">
                      <li>Até {plan.max_influencers === 99999 ? 'ilimitados' : plan.max_influencers} influencers</li>
                      <li>Até {plan.max_events === 99999 ? 'ilimitados' : plan.max_events} eventos</li>
                    </ul>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-primary">
                <UserPlus className="mr-2 h-4 w-4" />
                Criar Admin
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EditAdminDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        admin={selectedAdmin}
        onSuccess={loadAdmins}
      />
    </>
  );
};
