import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SlotStats {
  event_id: string;
  event_title: string;
  total_slots: number;
  occupied_slots: number;
  available_slots: number;
  occupancy_percentage: number;
}

export const SlotExhaustionAlert = () => {
  const { data: alerts } = useQuery({
    queryKey: ['slot-exhaustion-alerts'],
    queryFn: async () => {
      // Buscar eventos ativos com vagas
      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, numero_de_vagas')
        .eq('is_active', true)
        .not('numero_de_vagas', 'is', null)
        .gt('numero_de_vagas', 0);

      if (error) throw error;

      // Buscar estatísticas de vagas para cada evento
      const alertsData: SlotStats[] = [];
      
      for (const event of events || []) {
        const { data: slots } = await supabase
          .rpc('get_event_available_slots', { p_event_id: event.id })
          .single();

        if (slots && slots.occupancy_percentage >= 80) {
          alertsData.push({
            event_id: event.id,
            event_title: event.title,
            total_slots: slots.total_slots,
            occupied_slots: slots.occupied_slots,
            available_slots: slots.available_slots,
            occupancy_percentage: slots.occupancy_percentage,
          });
        }
      }

      return alertsData.sort((a, b) => b.occupancy_percentage - a.occupancy_percentage);
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
    staleTime: 30000,
  });

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getAlertVariant = (percentage: number) => {
    if (percentage >= 95) return 'destructive';
    if (percentage >= 90) return 'default';
    return 'default';
  };

  const getAlertIcon = (percentage: number) => {
    if (percentage >= 95) return <AlertCircle className="h-5 w-5" />;
    if (percentage >= 90) return <AlertTriangle className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
  };

  const getAlertColor = (percentage: number) => {
    if (percentage >= 95) return 'border-red-500 bg-red-50 dark:bg-red-950/20';
    if (percentage >= 90) return 'border-orange-500 bg-orange-50 dark:bg-orange-950/20';
    return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
  };

  const getUrgencyText = (percentage: number) => {
    if (percentage >= 95) return 'URGENTE';
    if (percentage >= 90) return 'ATENÇÃO';
    return 'AVISO';
  };

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert) => (
        <Alert
          key={alert.event_id}
          variant={getAlertVariant(alert.occupancy_percentage)}
          className={`${getAlertColor(alert.occupancy_percentage)} border-l-4`}
        >
          <div className="flex items-start gap-3">
            {getAlertIcon(alert.occupancy_percentage)}
            <div className="flex-1">
              <AlertTitle className="flex items-center gap-2 mb-1">
                <Badge variant={alert.occupancy_percentage >= 95 ? 'destructive' : 'secondary'}>
                  {getUrgencyText(alert.occupancy_percentage)}
                </Badge>
                <span className="font-semibold">{alert.event_title}</span>
              </AlertTitle>
              <AlertDescription>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    Apenas {alert.available_slots} vaga{alert.available_slots !== 1 ? 's' : ''} restante{alert.available_slots !== 1 ? 's' : ''}
                  </span>
                  <span className="text-muted-foreground">
                    ({alert.occupancy_percentage.toFixed(1)}% ocupado)
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {alert.occupied_slots}/{alert.total_slots} vagas preenchidas
                  </span>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
};
