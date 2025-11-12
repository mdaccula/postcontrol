import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Settings,
  ExternalLink,
  Copy,
  Calendar,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useUserRoleQuery } from "@/hooks/useUserRoleQuery";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// M2: Lazy loading de componentes pesados
const PlanManager = lazy(() => import("@/components/PlanManager").then((m) => ({ default: m.PlanManager })));
const AdminManager = lazy(() => import("@/components/AdminManager").then((m) => ({ default: m.AdminManager })));
const FinancialReports = lazy(() =>
  import("@/components/FinancialReports").then((m) => ({ default: m.FinancialReports })),
);
const EditAgencyDialog = lazy(() =>
  import("@/components/EditAgencyDialog").then((m) => ({ default: m.EditAgencyDialog })),
);
const AgencyAdminCard = lazy(() =>
  import("@/components/AgencyAdminCard").then((m) => ({ default: m.AgencyAdminCard })),
);
const AllUsersManagement = lazy(() =>
  import("@/components/AllUsersManagement").then((m) => ({ default: m.AllUsersManagement })),
);
const AdminSettings = lazy(() => import("@/components/AdminSettings").then((m) => ({ default: m.AdminSettings })));
const ChangelogManager = lazy(() =>
  import("@/components/ChangelogManager").then((m) => ({ default: m.ChangelogManager })),
);
const GuestManager = lazy(() => import("@/components/GuestManager").then((m) => ({ default: m.GuestManager })));
const MasterPostsManager = lazy(() =>
  import("@/components/MasterPostsManager").then((m) => ({ default: m.MasterPostsManager })),
);
const GTMDiagnostic = lazy(() => import("@/components/GTMDiagnostic").then((m) => ({ default: m.GTMDiagnostic })));
const PushNotificationTest = lazy(() =>
  import("@/components/PushNotificationTest").then((m) => ({ default: m.PushNotificationTest })),
);
import { AgencyRequestsManager } from "@/components/AgencyRequestsManager";
import { ConversionDashboard } from "@/components/ConversionDashboard";

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
  const { isMasterAdmin, loading: roleLoading } = useUserRoleQuery();
  const { toast } = useToast();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAgencyDialogOpen, setEditAgencyDialogOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [agencyStats, setAgencyStats] = useState<Record<string, AgencyStats>>({});
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedAgencyForEvents, setSelectedAgencyForEvents] = useState<string>("");
  const [agencyEvents, setAgencyEvents] = useState<any[]>([]);
  const [eventParticipants, setEventParticipants] = useState<Record<string, number>>({});
  const [eventSubmissions, setEventSubmissions] = useState<Record<string, number>>({});

  // Form state
  const [newAgency, setNewAgency] = useState({
    name: "",
    slug: "",
    subscription_plan: "basic",
    max_influencers: 100,
    max_events: 10, // Será atualizado baseado no plano
  });

  // 🆕 FASE 1: Debug mode
  const [debugMode] = useState(() => new URLSearchParams(window.location.search).has('debug'));
  const [isStabilizing, setIsStabilizing] = useState(true);

  // ✅ FASE 1: useEffect separado para autenticação/redirecionamento com guard de estabilização
  useEffect(() => {
    if (debugMode) {
      console.log('🔐 [MasterAdmin] Estado:', {
        user: !!user,
        isMasterAdmin,
        roleLoading,
        isStabilizing,
      });
    }

    // ✅ Guard: Dar 500ms para estabilizar antes de redirecionar
    if (isStabilizing) {
      const timer = setTimeout(() => setIsStabilizing(false), 500);
      return () => clearTimeout(timer);
    }

    // Enquanto estiver carregando, não faz nada
    if (roleLoading) {
      return;
    }

    // Redirect se não estiver autenticado
    if (!user) {
      if (debugMode) console.log('❌ [MasterAdmin] Redirecionando para /auth - sem user');
      navigate("/auth");
      return;
    }

    // Redirect se não for master admin
    if (!isMasterAdmin) {
      if (debugMode) console.log('❌ [MasterAdmin] Redirecionando para /dashboard - não é master admin');
      navigate("/dashboard");
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      return;
    }

    if (debugMode) console.log('✅ [MasterAdmin] Acesso autorizado');
  }, [user, isMasterAdmin, roleLoading, isStabilizing]);

  // ✅ SOLUÇÃO 2: useEffect separado para carregar dados (executa uma única vez quando autorizado)
  useEffect(() => {
    if (!roleLoading && user && isMasterAdmin) {
      loadAgencies();
      loadPlans();
    }
  }, [user, isMasterAdmin, roleLoading]);

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

  const loadEventStats = async (eventIds: string[]) => {
    const participants: Record<string, number> = {};
    const submissions: Record<string, number> = {};

    await Promise.all(
      eventIds.map(async (eventId) => {
        // Buscar todos os posts desse evento
        const { data: postsData } = await sb.from("posts").select("id").eq("event_id", eventId);

        const postIds = postsData?.map((p) => p.id) || [];

        if (postIds.length > 0) {
          // Contar usuários únicos que submeteram algo nesse evento
          const { data: submissionsData } = await sb.from("submissions").select("user_id").in("post_id", postIds);

          const uniqueUserIds = new Set(submissionsData?.map((s) => s.user_id) || []);
          participants[eventId] = uniqueUserIds.size;

          // Contar total de submissões
          const { count } = await sb
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .in("post_id", postIds);

          submissions[eventId] = count || 0;
        } else {
          participants[eventId] = 0;
          submissions[eventId] = 0;
        }
      }),
    );

    setEventParticipants(participants);
    setEventSubmissions(submissions);
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

        // Buscar influencers ativos (com submissões nos últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: activeUsers } = await sb
          .from("submissions")
          .select("user_id")
          .eq("agency_id", agency.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const [influencersRes, eventsRes, submissionsRes] = await Promise.all([
          influencersQuery,
          sb.from("events").select("id", { count: "exact", head: true }).eq("agency_id", agency.id),
          sb.from("submissions").select("id", { count: "exact", head: true }).eq("agency_id", agency.id),
        ]);

        const uniqueActiveUsers = new Set(activeUsers?.map((u) => u.user_id) || []);

        stats[agency.id] = {
          totalInfluencers: influencersRes.count || 0,
          totalEvents: eventsRes.count || 0,
          totalSubmissions: submissionsRes.count || 0,
          activeInfluencers: uniqueActiveUsers.size,
        };
      }

      setAgencyStats(stats);
    }

    setLoading(false);
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();

    // Buscar limites do plano selecionado
    const selectedPlan = plans.find((p) => p.plan_key === newAgency.subscription_plan);

    const { error } = await sb.from("agencies").insert({
      name: newAgency.name,
      slug: newAgency.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      subscription_plan: newAgency.subscription_plan,
      subscription_status: "trial",
      max_influencers: selectedPlan?.max_influencers || newAgency.max_influencers,
      max_events: selectedPlan?.max_events || newAgency.max_events,
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
    // Reset com valores do plano básico
    const basicPlan = plans.find((p) => p.plan_key === "basic");
    setNewAgency({
      name: "",
      slug: "",
      subscription_plan: "basic",
      max_influencers: basicPlan?.max_influencers || 100,
      max_events: basicPlan?.max_events || 10,
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
          <div className="space-y-2">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="conversion">Conversão</TabsTrigger>
              <TabsTrigger value="agencies">Agências</TabsTrigger>
              <TabsTrigger value="requests">Solicitações</TabsTrigger>
              <TabsTrigger value="events">Eventos</TabsTrigger>
              <TabsTrigger value="posts">Postagens</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="guests">Convidados</TabsTrigger>
              <TabsTrigger value="plans">Planos</TabsTrigger>
              <TabsTrigger value="reports">Relatórios</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
              <TabsTrigger value="changelog">Changelog</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="conversion" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ConversionDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="agencies" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AdminManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AgencyRequestsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Eventos por Agência
                </CardTitle>
                <CardDescription>Selecione uma agência para visualizar seus eventos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="agency-select">Agência:</Label>
                  <Select
                    value={selectedAgencyForEvents}
                    onValueChange={async (value) => {
                      setSelectedAgencyForEvents(value);
                      const { data } = await sb
                        .from("events")
                        .select("*")
                        .eq("agency_id", value)
                        .order("created_at", { ascending: false });
                      setAgencyEvents(data || []);
                      if (data && data.length > 0) {
                        await loadEventStats(data.map((e) => e.id));
                      }
                    }}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Selecione uma agência" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAgencyForEvents && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Usuários Participando</TableHead>
                        <TableHead>Total Submissões</TableHead>
                        <TableHead>Data do Evento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencyEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum evento encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        agencyEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.title}</TableCell>
                            <TableCell>
                              <Badge variant={event.is_active ? "default" : "secondary"}>
                                {event.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{eventParticipants[event.id] || 0} usuários</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{eventSubmissions[event.id] || 0} submissões</Badge>
                            </TableCell>
                            <TableCell>
                              {event.event_date
                                ? new Date(event.event_date).toLocaleDateString("pt-BR")
                                : "Não definida"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <MasterPostsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="users">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AllUsersManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            {/* Stripe Integration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Integração Stripe
                </CardTitle>
                <CardDescription>
                  Sincronize seus planos com a Stripe para habilitar pagamentos automáticos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    try {
                      toast({
                        title: "Sincronizando...",
                        description: "Criando produtos e preços na Stripe",
                      });

                      const { data, error } = await sb.functions.invoke("create-stripe-products");

                      if (error) {
                        throw error;
                      }

                      console.log("✅ Resultado da sincronização:", data);

                      const results = data?.results || [];
                      const successCount = results.filter((r: any) => r.success).length;
                      const totalCount = results.length;

                      if (successCount === totalCount) {
                        toast({
                          title: "Sincronização Completa!",
                          description: `${successCount} planos sincronizados com sucesso na Stripe`,
                        });
                      } else {
                        toast({
                          title: "Sincronização Parcial",
                          description: `${successCount} de ${totalCount} planos sincronizados. Verifique o console para detalhes.`,
                          variant: "destructive",
                        });
                      }

                      // Reload plans to show updated Stripe IDs
                      loadPlans();
                    } catch (error) {
                      console.error("❌ Erro ao sincronizar:", error);
                      toast({
                        title: "Erro na Sincronização",
                        description: error instanceof Error ? error.message : "Erro desconhecido",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="bg-gradient-primary"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Sincronizar Planos com Stripe
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Este botão criará produtos e preços na Stripe para todos os planos que ainda não possuem IDs Stripe.
                </p>
              </CardContent>
            </Card>

            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <PlanManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <FinancialReports />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AdminSettings isMasterAdmin={true} />
            </Suspense>

            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <GTMDiagnostic />
            </Suspense>

            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <PushNotificationTest />
            </Suspense>
          </TabsContent>

          <TabsContent value="guests">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <GuestManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="changelog">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ChangelogManager />
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
                onValueChange={(value) => {
                  const selectedPlan = plans.find((p) => p.plan_key === value);
                  setNewAgency({
                    ...newAgency,
                    subscription_plan: value,
                    max_influencers: selectedPlan?.max_influencers || 100,
                    max_events: selectedPlan?.max_events || 10,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.plan_key} value={plan.plan_key}>
                      {plan.plan_name} - R$ {plan.monthly_price}/mês
                    </SelectItem>
                  ))}
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

      {/* 🆕 FASE 1: Badge de Debug */}
      {debugMode && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-black p-3 rounded-md text-xs font-mono z-50 shadow-lg">
          <div className="font-bold mb-2">🐛 Debug Mode</div>
          <div>User: {user ? '✅' : '❌'}</div>
          <div>Master: {isMasterAdmin ? '✅' : '❌'}</div>
          <div>Loading: {roleLoading ? '⏳' : '✅'}</div>
          <div>Stabilizing: {isStabilizing ? '⏳' : '✅'}</div>
        </div>
      )}
    </div>
  );
};

export default MasterAdmin;
