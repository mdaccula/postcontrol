import { useEventAvailableSlots } from '@/hooks/useEventAvailableSlots';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Users, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EventSlotsCounterProps {
  eventId: string;
  eventTitle?: string;
  variant?: 'compact' | 'detailed';
}

export const EventSlotsCounter = ({ eventId, eventTitle, variant = 'compact' }: EventSlotsCounterProps) => {
  const { data: slots, isLoading } = useEventAvailableSlots(eventId);

  if (isLoading || !slots) {
    return null;
  }

  if (slots.total_slots === 0) {
    return null;
  }

  const availablePercentage = 100 - slots.occupancy_percentage;
  
  // Determinar cor e status baseado na % disponível
  const getStatusColor = () => {
    if (availablePercentage > 50) return 'text-green-600 dark:text-green-400';
    if (availablePercentage > 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBadgeVariant = () => {
    if (availablePercentage > 50) return 'default';
    if (availablePercentage > 20) return 'secondary';
    return 'destructive';
  };

  const getStatusText = () => {
    if (availablePercentage > 50) return 'Muitas vagas';
    if (availablePercentage > 20) return 'Vagas limitadas';
    return 'Últimas vagas!';
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className={`font-semibold ${getStatusColor()}`}>
          {slots.available_slots}/{slots.total_slots}
        </span>
        <span className="text-muted-foreground">vagas disponíveis</span>
        {availablePercentage <= 20 && (
          <Badge variant={getStatusBadgeVariant()} className="ml-1">
            {getStatusText()}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {eventTitle && (
          <div className="pb-2 border-b">
            <h3 className="font-bold text-lg">{eventTitle}</h3>
          </div>
        )}
        
        {/* 🆕 Participantes Totais */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-lg">{slots.total_participants}</p>
              <p className="text-xs text-muted-foreground">Participantes totais</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-green-600 dark:text-green-400">
              {slots.occupied_slots} ✅
            </p>
            <p className="text-xs text-muted-foreground">Bateram meta</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Vagas Disponíveis</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Contabiliza divulgadoras que completaram qualquer uma das metas disponíveis para o evento.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant={getStatusBadgeVariant()}>
            {getStatusText()}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ocupadas</span>
            <span className="font-medium">{slots.occupied_slots}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Disponíveis</span>
            <span className={`font-bold ${getStatusColor()}`}>
              {slots.available_slots}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">{slots.total_slots}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{slots.occupancy_percentage.toFixed(1)}% ocupado</span>
          </div>
          <Progress value={slots.occupancy_percentage} className="h-2" />
        </div>

        {availablePercentage <= 20 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-xs text-destructive">
              <p className="font-semibold">Atenção!</p>
              <p className="text-muted-foreground">
                Restam apenas {slots.available_slots} vagas. 
                As cortesias estão acabando rapidamente!
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <TrendingUp className="h-3 w-3" />
          <span>Atualizado em tempo real</span>
        </div>
      </div>
    </Card>
  );
};
