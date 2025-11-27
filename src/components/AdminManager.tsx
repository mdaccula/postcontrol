import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Building2, Link as LinkIcon, Copy } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditAdminDialog } from "./EditAdminDialog";
import { EditAgencyDialog } from "./EditAgencyDialog";
import { AgencyAdminCard } from "./AgencyAdminCard";

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

interface Agency {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  max_influencers: number;
  max_events: number;
  owner_id?: string;
  created_at: string;
  signup_token?: string;
  admin?: AdminData;
  plan?: Plan;
  stats?: {
    totalInfluencers: number;
    totalEvents: number;
    totalSubmissions: number;
  };
  fullUrl?: string; // Add this to store computed URL
  alternativeUrl?: string; // Alternative URL using token
}

export const AdminManager = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAgencyDialogOpen, setEditAgencyDialogOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "suspended">("all");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [customDomain, setCustomDomain] = useState<string>("");
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    fullName: "",
    agencyName: "",
    agencySlug: "",
    plan: "basic",
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [inviteLinkAgency, setInviteLinkAgency] = useState("");

  useEffect(() => {
    loadPlans();
    loadAdmins();
    loadCustomDomain();
  }, []);

  useEffect(() => {
    if (customDomain) {
      loadAgencies();
    }
  }, [customDomain]);

  const loadCustomDomain = async () => {
    const { data } = await sb
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "custom_domain")
      .maybeSingle();

    setCustomDomain(data?.setting_value || window.location.origin);
  };

  const loadPlans = async () => {
    const { data } = await sb
      .from("subscription_plans")
      .select("plan_key, plan_name, monthly_price, max_influencers, max_events")
      .order("display_order", { ascending: true });

    if (data) {
      setPlans(data);
    }
  };

  const loadAdmins = async () => {
    // ✅ Query 1: Buscar user_roles de agency_admin
    const { data: userRoles } = await sb.from("user_roles").select("user_id, created_at").eq("role", "agency_admin");

    if (!userRoles) {
      setAdmins([]);
      return;
    }

    // ✅ Query 2: Buscar profiles dos user_ids encontrados
    const userIds = userRoles.map((r) => r.user_id);

    if (userIds.length === 0) {
      setAdmins([]);
      return;
    }

    const { data: profilesData } = await sb
      .from("profiles")
      .select("id, email, full_name, phone, instagram")
      .in("id", userIds);

    // Criar map de profiles
    const profilesMap: Record<string, any> = {};
    (profilesData || []).forEach((profile) => {
      profilesMap[profile.id] = profile;
    });

    // ✅ Query 3: Buscar agências dos owners
    const adminsWithAgencies = await Promise.all(
      userRoles.map(async (role: any) => {
        const { data: agency } = await sb
          .from("agencies")
          .select("id, name, slug")
          .eq("owner_id", role.user_id)
          .maybeSingle();

        const profile = profilesMap[role.user_id] || {};

        return {
          user_id: role.user_id,
          email: profile.email || "",
          full_name: profile.full_name || "",
          phone: profile.phone,
          instagram: profile.instagram,
          agency_id: agency?.id,
          agency_name: agency?.name,
          agency_slug: agency?.slug,
          created_at: role.created_at,
        };
      }),
    );

    setAdmins(adminsWithAgencies);
  };

  const loadAgencies = async () => {
    const { data: agenciesData } = await sb.from("agencies").select("*").order("created_at", { ascending: false });

    if (agenciesData) {
      const enrichedAgencies = await Promise.all(
        agenciesData.map(async (agency: any) => {
          const [adminData, planData, influencersCount, eventsCount, submissionsCount] = await Promise.all([
            sb.from("profiles").select("*").eq("id", agency.owner_id).maybeSingle(),
            sb.from("subscription_plans").select("*").eq("plan_key", agency.subscription_plan).maybeSingle(),
            sb.from("profiles").select("id", { count: "exact", head: true }).eq("agency_id", agency.id),
            sb.from("events").select("id", { count: "exact", head: true }).eq("agency_id", agency.id),
            sb
              .from("submissions")
              .select("id", { count: "exact", head: true })
              .in(
                "post_id",
                (await sb.from("posts").select("id").eq("agency_id", agency.id)).data?.map((p) => p.id) || [],
              ),
          ]);

          const fullUrl = `${customDomain}/agencia/${agency.slug}`;
          const alternativeUrl = `${customDomain}/agency/${agency.signup_token}`;

          return {
            ...agency,
            admin: adminData.data,
            plan: planData.data,
            stats: {
              totalInfluencers: influencersCount.count || 0,
              totalEvents: eventsCount.count || 0,
              totalSubmissions: submissionsCount.count || 0,
            },
            fullUrl,
            alternativeUrl,
          };
        }),
      );

      setAgencies(enrichedAgencies);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAdmin(true);

    try {
      // Validações
      if (!newAdmin.email.includes("@")) {
        toast({
          title: "Erro",
          description: "Email inválido",
          variant: "destructive",
        });
        setIsCreatingAdmin(false);
        return;
      }

      if (!newAdmin.agencyName.trim()) {
        toast({
          title: "Erro",
          description: "Nome da agência é obrigatório",
          variant: "destructive",
        });
        setIsCreatingAdmin(false);
        return;
      }

      if (!newAdmin.fullName.trim()) {
        toast({
          title: "Erro",
          description: "Nome do admin é obrigatório",
          variant: "destructive",
        });
        setIsCreatingAdmin(false);
        return;
      }

      // Buscar limites do plano selecionado
      const selectedPlan = plans.find((p) => p.plan_key === newAdmin.plan);

      if (!selectedPlan) {
        toast({
          title: "Erro",
          description: "Plano selecionado não encontrado.",
          variant: "destructive",
        });
        setIsCreatingAdmin(false);
        return;
      }

      // Gerar slug único da agência se não fornecido
      let slug = newAdmin.agencySlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (!slug) {
        slug = newAdmin.agencyName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
      }

      console.log("Slug gerado:", slug);

      // Criar agência
      const { data: agency, error: agencyError } = await sb
        .from("agencies")
        .insert({
          name: newAdmin.agencyName,
          slug: slug,
          admin_email: newAdmin.email,
          subscription_plan: newAdmin.plan,
          subscription_status: "trial",
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          max_influencers: selectedPlan.max_influencers,
          max_events: selectedPlan.max_events,
        })
        .select()
        .single();

      if (agencyError) {
        if (agencyError.code === "23505") {
          toast({
            title: "Erro",
            description: "Este slug já está em uso. Escolha outro.",
            variant: "destructive",
          });
        } else {
          console.error("Erro ao criar agência:", agencyError);
          toast({
            title: "Erro",
            description: "Falha ao criar agência",
            variant: "destructive",
          });
        }
        setIsCreatingAdmin(false);
        return;
      }

      console.log("Agência criada:", agency);

      // Chamar edge function para criar o admin automaticamente
      const { data: adminResult, error: adminError } = await supabase.functions.invoke("create-agency-admin", {
        body: {
          agencyId: agency.id,
          agencyName: agency.name,
          email: newAdmin.email,
          fullName: newAdmin.fullName,
        },
      });

      if (adminError || !adminResult?.success) {
        console.error("Erro ao criar admin:", adminError || adminResult);
        toast({
          title: "Aviso",
          description: adminResult?.error || "Agência criada mas houve erro ao criar admin. Gere um novo convite.",
          variant: "destructive",
        });
        // Não retornar - continuar para mostrar agência criada
      } else {
        console.log("Admin criado com sucesso:", adminResult);
      }

      // Obter URL base para o link de convite
      const baseUrl = await getFullAgencyUrl("");
      const resetLink = adminResult?.resetLink || `${baseUrl}/agency/${agency.signup_token}`;

      setInviteLink(resetLink);
      setInviteLinkAgency(agency.name);

      toast({
        title: "Sucesso!",
        description: `Agência "${agency.name}" e admin criados com sucesso!`,
      });

      setDialogOpen(false);
      setNewAdmin({
        email: "",
        fullName: "",
        agencyName: "",
        agencySlug: "",
        plan: "basic",
      });

      await loadAdmins();
      await loadAgencies();
    } catch (error) {
      console.error("Erro ao criar admin:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar agência. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este admin? A agência não será excluída.")) return;

    try {
      const { error } = await sb.from("user_roles").delete().eq("user_id", userId).eq("role", "agency_admin");

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

  const handleDeleteAgency = async (agencyId: string, agencyName: string) => {
    // Check if agency has data
    const { count: eventsCount } = await sb
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId);

    const { count: postsCount } = await sb
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId);

    const hasData = (eventsCount || 0) > 0 || (postsCount || 0) > 0;

    let confirmed = false;
    if (hasData) {
      const userInput = prompt(
        `⚠️ ATENÇÃO: A agência "${agencyName}" possui ${eventsCount} eventos e ${postsCount} posts.\n\nTODOS OS DADOS SERÃO PERMANENTEMENTE EXCLUÍDOS (incluindo submissões).\n\nDigite "EXCLUIR" para confirmar:`,
      );
      confirmed = userInput === "EXCLUIR";
    } else {
      confirmed = window.confirm(`Tem certeza que deseja excluir a agência "${agencyName}"?`);
    }

    if (!confirmed) {
      toast({
        title: "Exclusão cancelada",
        variant: "default",
      });
      return;
    }

    try {
      // Delete related data in correct order to avoid foreign key constraints
      
      // 1. Delete submissions from agency
      await sb.from('submissions').delete().eq('agency_id', agencyId);
      
      // 2. Delete posts from agency
      await sb.from('posts').delete().eq('agency_id', agencyId);
      
      // 3. Delete events from agency
      await sb.from('events').delete().eq('agency_id', agencyId);
      
      // 4. Delete user_agencies associations
      await sb.from('user_agencies').delete().eq('agency_id', agencyId);
      
      // 5. Update profiles to remove agency_id
      await sb.from('profiles').update({ agency_id: null }).eq('agency_id', agencyId);
      
      // 6. Finally, delete the agency itself
      const { error } = await sb.from("agencies").delete().eq("id", agencyId);

      if (error) throw error;

      toast({
        title: "Agência excluída",
        description: "A agência e todos os seus dados foram removidos com sucesso.",
      });

      await loadAdmins();
      await loadAgencies();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir agência",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFullAgencyUrl = async (token: string) => {
    const { data } = await sb
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "custom_domain")
      .maybeSingle();

    const baseDomain = data?.setting_value || window.location.origin;
    return `${baseDomain}/agency/${token}`;
  };

  const handleCopyAgencyLink = async (token: string) => {
    const url = await getFullAgencyUrl(token);
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "Link de cadastro da agência copiado.",
    });
  };

  const filteredAgencies = agencies.filter((agency) => {
    if (statusFilter === "all") return true;
    return agency.subscription_status === statusFilter;
  });

  const getAgencyForAdmin = (userId: string) => {
    const admin = admins.find((a) => a.user_id === userId);
    return admin?.agency_id;
  };

  const handleEditAgency = (agency: Agency) => {
    setSelectedAgency(agency);
    setEditAgencyDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Agências e Administradores</h2>
          <p className="text-muted-foreground mt-1">Gerencie todas as agências cadastradas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
          <UserPlus className="mr-2 h-4 w-4" />
          Nova Agência + Admin
        </Button>
      </div>

      {/* Filtros de Status */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
          size="sm"
        >
          Todas ({agencies.length})
        </Button>
        <Button
          variant={statusFilter === "active" ? "default" : "outline"}
          onClick={() => setStatusFilter("active")}
          size="sm"
        >
          Ativas ({agencies.filter((a) => a.subscription_status === "active").length})
        </Button>
        <Button
          variant={statusFilter === "trial" ? "default" : "outline"}
          onClick={() => setStatusFilter("trial")}
          size="sm"
        >
          Trial ({agencies.filter((a) => a.subscription_status === "trial").length})
        </Button>
        <Button
          variant={statusFilter === "suspended" ? "default" : "outline"}
          onClick={() => setStatusFilter("suspended")}
          size="sm"
        >
          Suspensas ({agencies.filter((a) => a.subscription_status === "suspended").length})
        </Button>
      </div>

      {inviteLink && (
        <Card className="p-4 bg-primary/5 border-primary/20 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">✅ Link de Acesso Criado - {inviteLinkAgency}</p>
              <p className="text-xs text-muted-foreground mb-2">
                O admin receberá um email para criar sua senha. Link de redefinição:
              </p>
              <code className="text-xs bg-background p-2 rounded block overflow-x-auto">{inviteLink}</code>
            </div>
            <Button onClick={handleCopyInviteLink} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
        </Card>
      )}

      {/* Grid de Agências */}
      {filteredAgencies.length === 0 ? (
        <Card className="p-8">
          <div className="text-center py-8">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {statusFilter === "all"
                ? "Nenhuma agência cadastrada"
                : `Nenhuma agência ${statusFilter === "active" ? "ativa" : statusFilter === "trial" ? "em trial" : "suspensa"}`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === "all"
                ? "Crie uma nova agência e convide o primeiro administrador"
                : "Ajuste os filtros para ver outras agências"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredAgencies.map((agency) => (
            <AgencyAdminCard
              key={agency.id}
              agency={agency}
              admin={agency.admin || null}
              planDetails={agency.plan || null}
              stats={agency.stats}
              fullUrl={agency.fullUrl || ""}
              alternativeUrl={agency.alternativeUrl}
              onEdit={() => handleEditAgency(agency)}
              onDelete={() => handleDeleteAgency(agency.id, agency.name)}
              onViewDashboard={() => window.open(`/admin?agencyId=${agency.id}`, "_blank")}
              onCopyLink={() => handleCopyAgencyLink(agency.signup_token)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Admin de Agência</DialogTitle>
            <DialogDescription>Crie uma nova agência e convide o administrador responsável</DialogDescription>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo do Admin *</Label>
              <Input
                id="fullName"
                value={newAdmin.fullName}
                onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                placeholder="João Silva"
                required
              />
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
                <span>
                  URL de acesso: <strong>seuapp.com/{newAdmin.agencySlug || "slug"}</strong>
                </span>
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
                  <p className="font-semibold mb-1">✅ 10 dias de teste gratuito incluídos</p>
                  <p className="font-semibold mb-1">Limites do plano:</p>
                  {plans
                    .filter((p) => p.plan_key === newAdmin.plan)
                    .map((plan) => (
                      <ul key={plan.plan_key} className="list-disc list-inside text-muted-foreground">
                        <li>Até {plan.max_influencers === 99999 ? "ilimitados" : plan.max_influencers} divulgadores</li>
                        <li>Até {plan.max_events === 99999 ? "ilimitados" : plan.max_events} eventos</li>
                      </ul>
                    ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-primary" disabled={isCreatingAdmin}>
                {isCreatingAdmin ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Agência + Admin
                  </>
                )}
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

      <EditAgencyDialog
        open={editAgencyDialogOpen}
        onOpenChange={setEditAgencyDialogOpen}
        agency={selectedAgency}
        onSuccess={loadAgencies}
      />
    </>
  );
};
