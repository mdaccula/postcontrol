import { useState, useEffect, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Users, DollarSign, TrendingUp, Plus, Settings, ExternalLink, Copy } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useUserRole } from "@/hooks/useUserRole";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// M2: Lazy loading de componentes pesados
const PlanManager = lazy(() => import("@/components/PlanManager").then(m => ({ default: m.PlanManager })));
const AdminManager = lazy(() => import("@/components/AdminManager").then(m => ({ default: m.AdminManager })));
const FinancialReports = lazy(() => import("@/components/FinancialReports").then(m => ({ default: m.FinancialReports })));
const EditAgencyDialog = lazy(() => import("@/components/EditAgencyDialog").then(m => ({ default: m.EditAgencyDialog })));
const AgencyAdminCard = lazy(() => import("@/components/AgencyAdminCard").then(m => ({ default: m.AgencyAdminCard })));
const AllUsersManagement = lazy(() => import("@/components/AllUsersManagement").then(m => ({ default: m.AllUsersManagement })));
const AdminSettings = lazy(() => import("@/components/AdminSettings").then(m => ({ default: m.AdminSettings })));

interface Agency {
  id: string;
  name: string;
  slug: string;
  signup_token: string;
  owner_id: string;
  subscription_status: string;
  subscription_plan: string;
  max_influencers: number;
  max_events: number;
  created_at: string;
}

interface AgencyStats {
  totalInfluencers: number;
  totalEvents: number;
  totalSubmissions: number;
  activeInfluencers: number;
}

const MasterAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isMasterAdmin } = useUserRole();
  const { toast } = useToast();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAgencyDialogOpen, setEditAgencyDialogOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [agencyStats, setAgencyStats] = useState<Record<string, AgencyStats>>({});
  const [plans, setPlans] = useState<any[]>([]);

  // Form state
  const [newAgency, setNewAgency] = useState({
    name: "",
    slug: "",
    subscription_plan: "basic",
    max_influencers: 100,
    max_events: 50,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isMasterAdmin) {
      navigate("/dashboard");
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      return;
    }

    loadAgencies();
    loadPlans();
  }, [user, isMasterAdmin, navigate]);

  const loadPlans = async () => {
    const { data } = await sb
      .from("subscription_plans")
      .select("*")
      .eq("is_visible", true)
      .order("monthly_price", { ascending: true });

    if (data) {
      setPlans(data);
    }
  };

  const loadAgencies = async () => {
    setLoading(true);

    const { data, error } = await sb.from("agencies").select("*").order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading agencies:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as agências.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setAgencies(data || []);

    // Load stats for each agency
    if (data) {
      const stats: Record<string, AgencyStats> = {};

      for (const agency of data) {
        // Buscar IDs de admins para excluir da contagem
        const { data: adminRoles } = await sb
          .from("user_roles")
          .select("user_id")
          .in("role", ["agency_admin", "master_admin"]);

        const adminIds = adminRoles?.map((r) => r.user_id) || [];

        // Contar profiles excluindo admins
        let influencersQuery = sb
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id);

        if (adminIds.length > 0) {
          influencersQuery = influencersQuery.not("id", "in", `(${adminIds.join(",")})`);
        }

        const [influencersRes, eventsRes, submissionsRes] = await Promise.all([
          influencersQuery,
          sb.from("events").select("id", { count: "exact", head: true }).eq("agency_id", agency.id),
          sb.from("submissions").select("id", { count: "exact", head: true }).eq("agency_id", agency.id),
        ]);

        stats[agency.id] = {
          totalInfluencers: influencersRes.count || 0,
          totalEvents: eventsRes.count || 0,
          totalSubmissions: submissionsRes.count || 0,
          activeInfluencers: influencersRes.count || 0,
        };
      }

      setAgencyStats(stats);
    }

    setLoading(false);
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await sb.from("agencies").insert({
      name: newAgency.name,
      slug: newAgency.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      subscription_plan: newAgency.subscription_plan,
      subscription_status: "trial",
      max_influencers: newAgency.max_influencers,
      max_events: newAgency.max_events,
    });

    if (error) {
      console.error("Error creating agency:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a agência. Verifique se o slug já não existe.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Agência Criada!",
      description: `A agência ${newAgency.name} foi criada com sucesso.`,
    });

    setDialogOpen(false);
    setNewAgency({
      name: "",
      slug: "",
      subscription_plan: "basic",
      max_influencers: 100,
      max_events: 50,
    });

    loadAgencies();
  };

  const getTotalRevenue = () => {
    return agencies
      .filter((a) => a.subscription_status === "active")
      .reduce((sum, a) => {
        const plan = plans.find((p) => p.plan_key === a.subscription_plan);
        return sum + (plan?.monthly_price || 0);
      }, 0);
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

  const getAgencyUrl = (agency: Agency) => {
    return `${window.location.origin}/agency/signup/${agency.slug}`;
  };

  const copyAgencyUrl = (agency: Agency) => {
    const url = getAgencyUrl(agency);
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "URL de cadastro copiada para a área de transferência",
    });
  };

  const handleCopyAgencyLink = async (agency: Agency) => {
    const url = await getFullAgencyUrl(agency.signup_token);
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copiado!",
      description: "O link da agência foi copiado para a área de transferência.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Dashboard
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                Painel Agência
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Painel Master</h1>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Agências</p>
                <p className="text-3xl font-bold">{agencies.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Divulgadores</p>
                <p className="text-3xl font-bold">
                  {Object.values(agencyStats).reduce((sum, s) => sum + s.totalInfluencers, 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-3xl font-bold">R$ {getTotalRevenue().toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agências Ativas</p>
                <p className="text-3xl font-bold">
                  {agencies.filter((a) => a.subscription_status === "active").length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs com diferentes áreas */}
        <Tabs defaultValue="agencies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="agencies">Agências e Administradores</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="agencies" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AdminManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="users">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AllUsersManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="plans">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <PlanManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <FinancialReports />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AdminSettings isMasterAdmin={true} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <Suspense fallback={null}>
        <EditAgencyDialog
          open={editAgencyDialogOpen}
          onOpenChange={setEditAgencyDialogOpen}
          agency={selectedAgency}
          onSuccess={loadAgencies}
        />
      </Suspense>

      {/* Create Agency Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Agência</DialogTitle>
            <DialogDescription>Cadastre uma nova agência no sistema</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAgency} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Agência *</Label>
              <Input
                id="name"
                value={newAgency.name}
                onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                placeholder="Agência Marketing Digital"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={newAgency.slug}
                onChange={(e) => setNewAgency({ ...newAgency, slug: e.target.value.toLowerCase() })}
                placeholder="marketing-digital"
                required
              />
              <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e hífens</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plano *</Label>
              <Select
                value={newAgency.subscription_plan}
                onValueChange={(value) => setNewAgency({ ...newAgency, subscription_plan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Básico - R$ 299/mês</SelectItem>
                  <SelectItem value="pro">Pro - R$ 599/mês</SelectItem>
                  <SelectItem value="enterprise">Enterprise - R$ 1.499/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxInfluencers">Máx. Divulgadores</Label>
                <Input
                  id="maxInfluencers"
                  type="number"
                  value={newAgency.max_influencers}
                  onChange={(e) => setNewAgency({ ...newAgency, max_influencers: parseInt(e.target.value) })}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxEvents">Máx. Eventos</Label>
                <Input
                  id="maxEvents"
                  type="number"
                  value={newAgency.max_events}
                  onChange={(e) => setNewAgency({ ...newAgency, max_events: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-primary">
                Criar Agência
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterAdmin;
