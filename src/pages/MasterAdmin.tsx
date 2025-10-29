import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp,
  Plus,
  Settings,
  ExternalLink,
  Copy
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanManager } from "@/components/PlanManager";
import { AdminManager } from "@/components/AdminManager";
import { FinancialReports } from "@/components/FinancialReports";
import { EditAgencyDialog } from "@/components/EditAgencyDialog";

interface Agency {
  id: string;
  name: string;
  slug: string;
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
  const { user, isMasterAdmin } = useAuthStore();
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
      navigate('/auth');
      return;
    }

    if (!isMasterAdmin) {
      navigate('/dashboard');
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
      .from('subscription_plans')
      .select('*')
      .eq('is_visible', true)
      .order('monthly_price', { ascending: true });
    
    if (data) {
      setPlans(data);
    }
  };

  const loadAgencies = async () => {
    setLoading(true);

    const { data, error } = await sb
      .from('agencies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading agencies:', error);
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
        const [influencersRes, eventsRes, submissionsRes] = await Promise.all([
          sb.from('profiles').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
          sb.from('events').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
          sb.from('submissions').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
        ]);

        stats[agency.id] = {
          totalInfluencers: influencersRes.count || 0,
          totalEvents: eventsRes.count || 0,
          totalSubmissions: submissionsRes.count || 0,
          activeInfluencers: influencersRes.count || 0, // Can be refined later
        };
      }

      setAgencyStats(stats);
    }

    setLoading(false);
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await sb
      .from('agencies')
      .insert({
        name: newAgency.name,
        slug: newAgency.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        subscription_plan: newAgency.subscription_plan,
        subscription_status: 'trial',
        max_influencers: newAgency.max_influencers,
        max_events: newAgency.max_events,
      });

    if (error) {
      console.error('Error creating agency:', error);
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
      .filter(a => a.subscription_status === 'active')
      .reduce((sum, a) => {
        const plan = plans.find(p => p.plan_key === a.subscription_plan);
        return sum + (plan?.monthly_price || 0);
      }, 0);
  };

  const getFullAgencyUrl = (slug: string) => {
    const baseDomain = window.location.origin;
    return `${baseDomain}/agency/${slug}`;
  };

  const handleCopyAgencyLink = (slug: string) => {
    const url = getFullAgencyUrl(slug);
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
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Painel Master Admin
          </h1>
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
                <p className="text-sm text-muted-foreground">Total Influencers</p>
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
                  {agencies.filter(a => a.subscription_status === 'active').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs com diferentes áreas */}
        <Tabs defaultValue="agencies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agencies">Agências</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="agencies" className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Agências Cadastradas</h2>
            </div>

            {/* Agencies List */}
            <div className="grid gap-6">
              {agencies.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">Nenhuma agência cadastrada</p>
                  <p className="text-sm text-muted-foreground">Vá para a aba "Admins" para criar uma nova agência com admin</p>
                </Card>
              ) : (
                agencies.map((agency) => (
                  <Card key={agency.id} className="p-6 border-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">{agency.name}</h3>
                          <Badge variant={
                            agency.subscription_status === 'active' ? 'default' :
                            agency.subscription_status === 'trial' ? 'secondary' :
                            'destructive'
                          }>
                            {agency.subscription_status === 'active' ? 'Ativo' :
                             agency.subscription_status === 'trial' ? 'Trial' :
                             agency.subscription_status === 'suspended' ? 'Suspenso' : 'Inativo'}
                          </Badge>
                          <Badge variant="outline">
                            {agency.subscription_plan === 'basic' ? 'Básico' :
                             agency.subscription_plan === 'pro' ? 'Pro' : 'Enterprise'}
                          </Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-4 gap-4 mt-4">
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">URL da Agência</p>
                            <p className="font-mono text-sm break-all">{getFullAgencyUrl(agency.slug)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Influencers</p>
                            <p className="text-lg font-bold">
                              {agencyStats[agency.id]?.totalInfluencers || 0} / {agency.max_influencers}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Eventos</p>
                            <p className="text-lg font-bold">
                              {agencyStats[agency.id]?.totalEvents || 0} / {agency.max_events}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Submissões</p>
                            <p className="text-lg font-bold">
                              {agencyStats[agency.id]?.totalSubmissions || 0}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCopyAgencyLink(agency.slug)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar Link
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedAgency(agency);
                              setEditAgencyDialogOpen(true);
                            }}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Configurar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/admin?agency=${agency.slug}`)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver Dashboard
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="admins">
            <AdminManager />
          </TabsContent>

          <TabsContent value="plans">
            <PlanManager />
          </TabsContent>

          <TabsContent value="reports">
            <FinancialReports />
          </TabsContent>
        </Tabs>
      </div>

      <EditAgencyDialog
        open={editAgencyDialogOpen}
        onOpenChange={setEditAgencyDialogOpen}
        agency={selectedAgency}
        onSuccess={loadAgencies}
      />

      {/* Create Agency Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Agência</DialogTitle>
            <DialogDescription>
              Cadastre uma nova agência no sistema
            </DialogDescription>
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
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens
              </p>
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
                <Label htmlFor="maxInfluencers">Máx. Influencers</Label>
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
