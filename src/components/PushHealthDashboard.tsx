import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface HealthMetrics {
  activeSubscriptions: number;
  totalSent24h: number;
  deliveryRate: number;
  errorCount24h: number;
  avgDeliveryTime: number;
}

export const PushHealthDashboard = () => {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<HealthMetrics>({
    activeSubscriptions: 0,
    totalSent24h: 0,
    deliveryRate: 0,
    errorCount24h: 0,
    avgDeliveryTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadMetrics = async () => {
    if (!user) return;

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Active subscriptions
      const { count: activeCount } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .gte('last_used_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Notifications sent in last 24h
      const { data: logs, count: totalSent } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact' })
        .gte('sent_at', oneDayAgo);

      // Delivered notifications
      const delivered = logs?.filter(log => log.delivered).length || 0;
      const deliveryRate = totalSent ? (delivered / totalSent) * 100 : 0;

      // Error count (não entregues)
      const errorCount = totalSent ? totalSent - delivered : 0;

      setMetrics({
        activeSubscriptions: activeCount || 0,
        totalSent24h: totalSent || 0,
        deliveryRate: Math.round(deliveryRate),
        errorCount24h: errorCount,
        avgDeliveryTime: 0, // TODO: calcular tempo médio
      });
    } catch (error) {
      console.error('[PushHealth] Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = () => {
    if (metrics.deliveryRate >= 95) return { text: 'Excelente', color: 'bg-green-500' };
    if (metrics.deliveryRate >= 80) return { text: 'Bom', color: 'bg-blue-500' };
    if (metrics.deliveryRate >= 60) return { text: 'Regular', color: 'bg-yellow-500' };
    return { text: 'Crítico', color: 'bg-red-500' };
  };

  const health = getHealthStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Saúde do Sistema Push</CardTitle>
            <CardDescription>Métricas das últimas 24 horas</CardDescription>
          </div>
          <Badge className={health.color}>{health.text}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Subscriptions Ativas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Subscriptions Ativas</span>
            </div>
            <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
          </div>

          {/* Total Enviado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Notificações Enviadas</span>
            </div>
            <div className="text-2xl font-bold">{metrics.totalSent24h}</div>
          </div>

          {/* Taxa de Entrega */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Taxa de Entrega</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics.deliveryRate}%</span>
              {metrics.deliveryRate >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>

          {/* Erros */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Erros</span>
            </div>
            <div className="text-2xl font-bold text-red-500">{metrics.errorCount24h}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
