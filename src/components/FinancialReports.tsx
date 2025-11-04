import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Building2, Users, Calendar } from "lucide-react";
import { useFinancialReports } from "@/hooks/useFinancialReports";

interface FinancialStats {
  totalMonthlyRevenue: number;
  totalAnnualRevenue: number;
  activeAgencies: number;
  trialAgencies: number;
  suspendedAgencies: number;
  conversionRate: number;
}

interface RevenueByPlan {
  plan_name: string;
  revenue: number;
  count: number;
}

export const FinancialReports = () => {
  // ✅ ITEM 6: Migração para React Query
  const { data, isLoading, error } = useFinancialReports();

  const stats = data?.stats || {
    totalMonthlyRevenue: 0,
    totalAnnualRevenue: 0,
    activeAgencies: 0,
    trialAgencies: 0,
    suspendedAgencies: 0,
    conversionRate: 0,
  };

  const revenueByPlan = data?.revenueByPlan || [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  const statusData = [
    { name: 'Ativas', value: stats.activeAgencies },
    { name: 'Trial', value: stats.trialAgencies },
    { name: 'Suspensas', value: stats.suspendedAgencies },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-muted rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <p className="text-destructive">Erro ao carregar relatórios financeiros. Tente novamente.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receita Mensal</p>
              <h3 className="text-2xl font-bold mt-2">
                R$ {stats.totalMonthlyRevenue.toFixed(2)}
              </h3>
            </div>
            <DollarSign className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receita Anual</p>
              <h3 className="text-2xl font-bold mt-2">
                R$ {stats.totalAnnualRevenue.toFixed(2)}
              </h3>
            </div>
            <Calendar className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Agências Ativas</p>
              <h3 className="text-2xl font-bold mt-2">{stats.activeAgencies}</h3>
            </div>
            <Building2 className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              <h3 className="text-2xl font-bold mt-2">
                {stats.conversionRate.toFixed(1)}%
              </h3>
            </div>
            <TrendingUp className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita por Plano */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Receita por Plano</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByPlan}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plan_name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Receita Mensal" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status das Agências */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status das Agências</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Resumo por Plano */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo por Plano</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Plano</th>
                <th className="text-left py-3 px-4">Agências</th>
                <th className="text-left py-3 px-4">Receita Mensal</th>
                <th className="text-left py-3 px-4">Receita Anual</th>
              </tr>
            </thead>
            <tbody>
              {revenueByPlan.map((plan) => (
                <tr key={plan.plan_name} className="border-b">
                  <td className="py-3 px-4 font-medium">{plan.plan_name}</td>
                  <td className="py-3 px-4">{plan.count}</td>
                  <td className="py-3 px-4">R$ {plan.revenue.toFixed(2)}</td>
                  <td className="py-3 px-4">R$ {(plan.revenue * 12).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-muted/50">
                <td className="py-3 px-4">TOTAL</td>
                <td className="py-3 px-4">{stats.activeAgencies}</td>
                <td className="py-3 px-4">R$ {stats.totalMonthlyRevenue.toFixed(2)}</td>
                <td className="py-3 px-4">R$ {stats.totalAnnualRevenue.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
