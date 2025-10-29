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
import { UserPlus, Building2, Link as LinkIcon } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  plan_key: string;
  plan_name: string;
  monthly_price: number;
  max_influencers: number;
  max_events: number;
}

export const AdminManager = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    agencyName: "",
    agencySlug: "",
    plan: "basic"
  });

  useEffect(() => {
    loadPlans();
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

      toast({
        title: "Admin criado!",
        description: `${newAdmin.agencyName} foi criado com sucesso. Envie o link de acesso para ${newAdmin.email}`,
      });

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

      <Card className="p-6">
        <div className="text-center py-8">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Gerencie suas agências</h3>
          <p className="text-muted-foreground mb-4">
            Crie uma nova agência e envie o convite para o administrador
          </p>
          <Button onClick={() => setDialogOpen(true)} variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Criar Primeira Agência
          </Button>
        </div>
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
                O convite será enviado para este email
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
    </>
  );
};
