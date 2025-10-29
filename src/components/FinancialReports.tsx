import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { sb } from "@/lib/supabaseSafe";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Building2, Users, Calendar } from "lucide-react";

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
  const [stats, setStats] = useState<FinancialStats>({
    totalMonthlyRevenue: 0,
    totalAnnualRevenue: 0,
    activeAgencies: 0,
    trialAgencies: 0,
    suspendedAgencies: 0,
    conversionRate: 0,
  });
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    // Buscar todas as agências
    const { data: agencies } = await sb
      .from('agencies')
      .select('*, subscription_plans(plan_name, monthly_price)');

    if (!agencies) return;

    // Calcular estatísticas
    const active = agencies.filter(a => a.subscription_status === 'active');
    const trial = agencies.filter(a => a.subscription_status === 'trial');
    const suspended = agencies.filter(a => a.subscription_status === 'suspended');

    const monthlyRevenue = active.reduce((sum, a) => {
      return sum + (a.subscription_plans?.monthly_price || 0);
    }, 0);

    const conversion = trial.length > 0 ? (active.length / (active.length + trial.length)) * 100 : 0;

    setStats({
      totalMonthlyRevenue: monthlyRevenue,
      totalAnnualRevenue: monthlyRevenue * 12,
      activeAgencies: active.length,
      trialAgencies: trial.length,
      suspendedAgencies: suspended.length,
      conversionRate: conversion,
    });

    // Receita por plano
    const planRevenue: { [key: string]: { revenue: number; count: number } } = {};
    active.forEach(agency => {
      const planName = agency.subscription_plans?.plan_name || 'Desconhecido';
      const price = agency.subscription_plans?.monthly_price || 0;
      if (!planRevenue[planName]) {
        planRevenue[planName] = { revenue: 0, count: 0 };
      }
      planRevenue[planName].revenue += price;
      planRevenue[planName].count += 1;
    });

    const revenueData = Object.entries(planRevenue).map(([plan_name, data]) => ({
      plan_name,
      revenue: data.revenue,
      count: data.count,
    }));

    setRevenueByPlan(revenueData);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  const statusData = [
    { name: 'Ativas', value: stats.activeAgencies },
    { name: 'Trial', value: stats.trialAgencies },
    { name: 'Suspensas', value: stats.suspendedAgencies },
  ];

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
