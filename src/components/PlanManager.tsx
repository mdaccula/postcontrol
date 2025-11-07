import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Edit, Save, X } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  plan_key: string;
  plan_name: string;
  monthly_price: number;
  max_influencers: number;
  max_events: number;
  features: string[];
  is_visible: boolean;
  is_popular: boolean;
  display_order: number;
}

export const PlanManager = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Plan>>({});

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data, error } = await sb
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setPlans(data);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setEditData(plan);
  };

const handleSave = async () => {
  if (!editingId) return;

  const { error } = await sb
    .from('subscription_plans')
    .update(editData)
    .eq('id', editingId);

  if (error) {
    toast({
      title: "Erro ao salvar",
      description: "Não foi possível atualizar o plano.",
      variant: "destructive",
    });
    return;
  }

  // 🆕 ATUALIZAR todas as agências que usam este plano
  const plan = plans.find(p => p.id === editingId);
  if (plan && editData.max_influencers !== undefined && editData.max_events !== undefined) {
    const { error: agencyUpdateError } = await sb
      .from('agencies')
      .update({
        max_influencers: editData.max_influencers,
        max_events: editData.max_events
      })
      .eq('subscription_plan', plan.plan_key);

    if (agencyUpdateError) {
      console.error('Erro ao atualizar agências:', agencyUpdateError);
      toast({
        title: "Aviso",
        description: "Plano atualizado, mas algumas agências podem não ter sido atualizadas.",
        variant: "destructive",
      });
    }
  }

  toast({
    title: "Plano atualizado!",
    description: "As alterações foram salvas com sucesso e aplicadas a todas as agências.",
  });

  setEditingId(null);
  setEditData({});
  loadPlans();
};


  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciar Planos</h2>
      </div>

      <div className="grid gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-6 border-2">
            {editingId === plan.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Plano</Label>
                    <Input
                      value={editData.plan_name || ''}
                      onChange={(e) => setEditData({ ...editData, plan_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Preço Mensal (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editData.monthly_price || 0}
                      onChange={(e) => setEditData({ ...editData, monthly_price: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Máx. Divulgadores</Label>
                    <Input
                      type="number"
                      value={editData.max_influencers || 0}
                      onChange={(e) => setEditData({ ...editData, max_influencers: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Máx. Eventos</Label>
                    <Input
                      type="number"
                      value={editData.max_events || 0}
                      onChange={(e) => setEditData({ ...editData, max_events: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Features (um por linha)</Label>
                  <Textarea
                    value={Array.isArray(editData.features) ? editData.features.join('\n') : ''}
                    onChange={(e) => {
                      const features = e.target.value.split('\n').filter(f => f.trim());
                      setEditData({ ...editData, features });
                    }}
                    rows={5}
                    placeholder="Digite cada feature em uma linha"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editData.is_visible}
                    onCheckedChange={(checked) => setEditData({ ...editData, is_visible: checked })}
                  />
                  <Label>Visível na página inicial</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editData.is_popular}
                    onCheckedChange={(checked) => setEditData({ ...editData, is_popular: checked })}
                  />
                  <Label>Plano Popular (destaque na home)</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-gradient-primary">
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{plan.plan_name}</h3>
                    <p className="text-2xl font-bold text-primary mt-2">
                      R$ {plan.monthly_price.toFixed(2)}/mês
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(plan)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Divulgadores</p>
                    <p className="font-semibold">{plan.max_influencers === 99999 ? 'Ilimitado' : plan.max_influencers}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Eventos</p>
                    <p className="font-semibold">{plan.max_events === 99999 ? 'Ilimitado' : plan.max_events}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Features:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${plan.is_visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {plan.is_visible ? 'Visível' : 'Oculto'}
                  </span>
                  {plan.is_popular && (
                    <span className="text-xs px-2 py-1 rounded bg-gradient-primary text-white">
                      ⭐ Popular
                    </span>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
