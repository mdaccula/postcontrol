import { useQuery } from '@tanstack/react-query';
import { sb } from '@/lib/supabaseSafe';

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

interface FinancialReportsData {
  stats: FinancialStats;
  revenueByPlan: RevenueByPlan[];
}

/**
 * Hook React Query para relatórios financeiros
 * ✅ Item 6: Migração para React Query
 * ✅ Item 8: SELECT específico de colunas
 */
export const useFinancialReports = () => {
  return useQuery({
    queryKey: ['financialReports'],
    queryFn: async (): Promise<FinancialReportsData> => {
      console.log('💰 [useFinancialReports] Iniciando carregamento...');
      
      // ✅ ITEM 8: SELECT específico (não usar *)
      const { data: agenciesData, error: agenciesError } = await sb
        .from('agencies')
        .select('id, name, subscription_plan, subscription_status');

      console.log('📊 [useFinancialReports] Agências carregadas:', agenciesData?.length, 'Erro:', agenciesError);

      const { data: plansData, error: plansError } = await sb
        .from('subscription_plans')
        .select('plan_key, plan_name, monthly_price');

      console.log('📋 [useFinancialReports] Planos carregados:', plansData?.length, 'Erro:', plansError);

      if (agenciesError) throw agenciesError;
      if (plansError) throw plansError;
      if (!agenciesData || !plansData) {
        console.error('❌ [useFinancialReports] Dados não carregados');
        throw new Error('Falha ao carregar dados financeiros');
      }

      // Mapear agências com seus planos
      const agencies = agenciesData.map(agency => {
        const plan = plansData.find(p => p.plan_key === agency.subscription_plan);
        console.log(`📦 [useFinancialReports] Agência: ${agency.name} | Plan: ${agency.subscription_plan} | Preço: ${plan?.monthly_price || 0}`);
        return {
          ...agency,
          subscription_plans: plan
        };
      });

      // Calcular estatísticas
      const active = agencies.filter(a => a.subscription_status === 'active');
      const trial = agencies.filter(a => a.subscription_status === 'trial');
      const suspended = agencies.filter(a => a.subscription_status === 'suspended');

      console.log('📈 [useFinancialReports] Status:', { 
        total: agencies.length, 
        active: active.length, 
        trial: trial.length, 
        suspended: suspended.length 
      });

      const monthlyRevenue = active.reduce((sum, a) => {
        const price = a.subscription_plans?.monthly_price || 0;
        console.log(`💵 [useFinancialReports] ${a.name}: R$ ${price}`);
        return sum + price;
      }, 0);

      console.log('💰 [useFinancialReports] Receita mensal total: R$', monthlyRevenue);

      const conversion = trial.length > 0 ? (active.length / (active.length + trial.length)) * 100 : 0;

      const stats: FinancialStats = {
        totalMonthlyRevenue: monthlyRevenue,
        totalAnnualRevenue: monthlyRevenue * 12,
        activeAgencies: active.length,
        trialAgencies: trial.length,
        suspendedAgencies: suspended.length,
        conversionRate: conversion,
      };

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

      const revenueByPlan = Object.entries(planRevenue).map(([plan_name, data]) => ({
        plan_name,
        revenue: data.revenue,
        count: data.count,
      }));

      console.log('✅ [useFinancialReports] Dados processados com sucesso');

      return { stats, revenueByPlan };
    },
    staleTime: 60000, // 1 minuto
    refetchOnWindowFocus: false
  });
};
