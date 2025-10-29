import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface Plan {
  plan_key: string;
  plan_name: string;
  monthly_price: number;
  max_influencers: number;
  max_events: number;
}

interface Agency {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  max_influencers: number;
  max_events: number;
  trial_start_date?: string;
  trial_end_date?: string;
  plan_expiry_date?: string;
  owner_id?: string;
  admin_email?: string;
}

interface EditAgencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency: Agency | null;
  onSuccess: () => void;
}

export const EditAgencyDialog = ({ open, onOpenChange, agency, onSuccess }: EditAgencyDialogProps) => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    subscription_plan: "",
    subscription_status: "",
    trial_end_date: undefined as Date | undefined,
    plan_expiry_date: undefined as Date | undefined,
    admin_email: "",
  });

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (agency) {
      setFormData({
        name: agency.name,
        slug: agency.slug,
        subscription_plan: agency.subscription_plan,
        subscription_status: agency.subscription_status,
        trial_end_date: agency.trial_end_date ? new Date(agency.trial_end_date) : undefined,
        plan_expiry_date: agency.plan_expiry_date ? new Date(agency.plan_expiry_date) : undefined,
        admin_email: agency.admin_email || "",
      });
    }
  }, [agency]);

  const loadPlans = async () => {
    const { data } = await sb
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (data) setPlans(data);
  };

  const selectedPlan = plans.find(p => p.plan_key === formData.subscription_plan);

  const handleSave = async () => {
    if (!agency) return;

    try {
      const updateData: any = {
        name: formData.name,
        slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        subscription_plan: formData.subscription_plan,
        subscription_status: formData.subscription_status,
        max_influencers: selectedPlan?.max_influencers || agency.max_influencers,
        max_events: selectedPlan?.max_events || agency.max_events,
        admin_email: formData.admin_email,
      };

      if (formData.trial_end_date) {
        updateData.trial_end_date = formData.trial_end_date.toISOString();
      }

      if (formData.plan_expiry_date) {
        updateData.plan_expiry_date = formData.plan_expiry_date.toISOString();
      }

      const { error } = await sb
        .from('agencies')
        .update(updateData)
        .eq('id', agency.id);

      if (error) throw error;

      toast({
        title: "Agência atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Agência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Agência</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
            />
            <p className="text-xs text-muted-foreground">
              URL: seuapp.com/agency/{formData.slug || 'slug'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_email">Email do Admin</Label>
            <Input
              id="admin_email"
              type="email"
              value={formData.admin_email}
              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Plano</Label>
            <Select value={formData.subscription_plan} onValueChange={(value) => setFormData({ ...formData, subscription_plan: value })}>
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
            {selectedPlan && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-semibold mb-1">Limites do plano:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Até {selectedPlan.max_influencers === 99999 ? 'ilimitados' : selectedPlan.max_influencers} influencers</li>
                  <li>Até {selectedPlan.max_events === 99999 ? 'ilimitados' : selectedPlan.max_events} eventos</li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status da Assinatura</Label>
            <Select value={formData.subscription_status} onValueChange={(value) => setFormData({ ...formData, subscription_status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial (Teste Gratuito)</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="suspended">Suspensa</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.subscription_status === 'trial' && (
            <div className="space-y-2">
              <Label>Data de Fim do Trial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.trial_end_date ? format(formData.trial_end_date, "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.trial_end_date}
                    onSelect={(date) => setFormData({ ...formData, trial_end_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {formData.subscription_status === 'active' && (
            <div className="space-y-2">
              <Label>Data de Vencimento do Plano</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.plan_expiry_date ? format(formData.plan_expiry_date, "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.plan_expiry_date}
                    onSelect={(date) => setFormData({ ...formData, plan_expiry_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
