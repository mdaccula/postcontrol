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
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";

interface Agency {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  trial_end_date?: string;
  plan_expiry_date?: string;
}

interface Admin {
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  instagram?: string;
  agency_id?: string;
  agency_name?: string;
  created_at: string;
}

interface EditAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: Admin | null;
  onSuccess: () => void;
}

export const EditAdminDialog = ({ open, onOpenChange, admin, onSuccess }: EditAdminDialogProps) => {
  const { toast } = useToast();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    instagram: "",
    agency_id: "",
    agency_plan: "",
    agency_status: "",
    trial_end_date: undefined as Date | undefined,
    plan_expiry_date: undefined as Date | undefined,
  });

  useEffect(() => {
    loadAgencies();
    loadPlans();
  }, []);

  useEffect(() => {
    if (admin) {
      loadAdminAgency(admin.user_id);
      setFormData({
        email: admin.email,
        full_name: admin.full_name,
        phone: admin.phone || "",
        instagram: admin.instagram || "",
        agency_id: admin.agency_id || "",
        agency_plan: "",
        agency_status: "",
        trial_end_date: undefined,
        plan_expiry_date: undefined,
      });
    }
  }, [admin]);

  const loadAgencies = async () => {
    const { data } = await sb.from("agencies").select("*").order("name");

    if (data) setAgencies(data);
  };

  const loadPlans = async () => {
    const { data } = await sb.from("subscription_plans").select("*").order("display_order", { ascending: true });

    if (data) setPlans(data);
  };

  const loadAdminAgency = async (userId: string) => {
    const { data } = await sb.from("agencies").select("*").eq("owner_id", userId).maybeSingle();

    if (data) {
      setFormData((prev) => ({
        ...prev,
        agency_id: data.id,
        agency_plan: data.subscription_plan,
        agency_status: data.subscription_status,
        trial_end_date: data.trial_end_date ? new Date(data.trial_end_date) : undefined,
        plan_expiry_date: data.plan_expiry_date ? new Date(data.plan_expiry_date) : undefined,
      }));
    }
  };

  const handleExtendTrial = () => {
    const currentDate = formData.trial_end_date || new Date();
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setFormData({ ...formData, trial_end_date: newDate });
  };

  const handleConvertToActive = () => {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    setFormData({
      ...formData,
      agency_status: "active",
      plan_expiry_date: expiryDate,
    });
  };

  const handleSave = async () => {
    if (!admin) return;

    try {
      // Atualizar perfil
      const { error: profileError } = await sb
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          instagram: formData.instagram,
        })
        .eq("id", admin.user_id);

      if (profileError) throw profileError;

      // Se mudou a agência vinculada
      if (formData.agency_id !== admin.agency_id) {
        // Remover owner_id da agência antiga
        if (admin.agency_id) {
          await sb.from("agencies").update({ owner_id: null }).eq("id", admin.agency_id);
        }

        // Vincular à nova agência
        if (formData.agency_id) {
          await sb.from("agencies").update({ owner_id: admin.user_id }).eq("id", formData.agency_id);
        }
      }

      // Atualizar dados da agência
      if (formData.agency_id) {
        const selectedPlan = plans.find((p) => p.plan_key === formData.agency_plan);

        const agencyUpdate: any = {
          subscription_plan: formData.agency_plan,
          subscription_status: formData.agency_status,
        };

        if (selectedPlan) {
          agencyUpdate.max_influencers = selectedPlan.max_influencers;
          agencyUpdate.max_events = selectedPlan.max_events;
        }

        if (formData.trial_end_date) {
          agencyUpdate.trial_end_date = formData.trial_end_date.toISOString();
        }

        if (formData.plan_expiry_date) {
          agencyUpdate.plan_expiry_date = formData.plan_expiry_date.toISOString();
        }

        const { error: agencyError } = await sb.from("agencies").update(agencyUpdate).eq("id", formData.agency_id);

        if (agencyError) throw agencyError;
      }

      toast({
        title: "Admin atualizado!",
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Agency Admin</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Dados Pessoais</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@usuario"
                />
              </div>
            </div>
          </div>

          {/* Agência Vinculada */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Agência Vinculada</h3>

            <div className="space-y-2">
              <Label htmlFor="agency">Agência</Label>
              <Select
                value={formData.agency_id}
                onValueChange={(value) => setFormData({ ...formData, agency_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma agência" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name} ({agency.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Configurações da Agência */}
          {formData.agency_id && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Configurações da Agência</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agency_plan">Plano</Label>
                  <Select
                    value={formData.agency_plan}
                    onValueChange={(value) => setFormData({ ...formData, agency_plan: value })}
                  >
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agency_status">Status</Label>
                  <Select
                    value={formData.agency_status}
                    onValueChange={(value) => setFormData({ ...formData, agency_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="suspended">Suspensa</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.agency_status === "trial" && (
                <div className="space-y-2">
                  <Label>Data de Fim do Trial</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start text-left font-normal">
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
                    <Button onClick={handleExtendTrial} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      +10 dias
                    </Button>
                  </div>
                </div>
              )}

              {formData.agency_status === "active" && (
                <div className="space-y-2">
                  <Label>Data de Vencimento do Plano</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.plan_expiry_date
                          ? format(formData.plan_expiry_date, "dd/MM/yyyy")
                          : "Selecione a data"}
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

              {formData.agency_status === "trial" && (
                <Button onClick={handleConvertToActive} variant="outline" className="w-full">
                  Converter Trial → Ativa (30 dias)
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
