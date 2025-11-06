import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { TrendingUp, Send, Calendar, Award } from 'lucide-react';

/**
 * Componente de estatísticas do Dashboard
 * Memoizado para performance
 */

interface EventStat {
  eventId: string;
  eventTitle: string;
  submitted: number;
  totalRequired: number;
  percentage: number;
  isApproximate: boolean;
}

interface DashboardStatsProps {
  approvedCount: number;
  totalSubmissions: number;
  activeEventsCount: number;
  lastSubmissionDate: string | null;
  eventStats: EventStat[];
}

const DashboardStatsComponent = ({
  approvedCount,
  totalSubmissions,
  activeEventsCount,
  lastSubmissionDate,
  eventStats,
}: DashboardStatsProps) => {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6 hover:shadow-lg transition-all duration-300 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Postagens Aprovadas</p>
                <h3 className="text-3xl font-bold mt-2">{approvedCount}</h3>
              </div>
              <div className="p-4 bg-green-500/10 rounded-full">
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="p-6 hover:shadow-lg transition-all duration-300 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Submissões</p>
                <h3 className="text-3xl font-bold mt-2">{totalSubmissions}</h3>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-full">
                <Send className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-6 hover:shadow-lg transition-all duration-300 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eventos Ativos</p>
                <h3 className="text-3xl font-bold mt-2">{activeEventsCount}</h3>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-full">
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="p-6 hover:shadow-lg transition-all duration-300 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Última Submissão</p>
                <h3 className="text-lg font-bold mt-2">
                  {lastSubmissionDate ? new Date(lastSubmissionDate).toLocaleDateString('pt-BR') : 'Nenhuma'}
                </h3>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-full">
                <Award className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Event Progress Section */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Progresso dos Eventos</h2>
        <div className="space-y-6">
          {eventStats.length > 0 ? (
            eventStats.map((stat) => (
              <div key={stat.eventId} className="space-y-3 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{stat.eventTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      {stat.submitted} de {stat.isApproximate ? '~' : ''}
                      {stat.totalRequired} posts aprovados
                    </p>
                  </div>
                  <Badge variant={stat.percentage >= 100 ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                    {stat.percentage.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={stat.percentage} className="h-3" />
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum evento ativo no momento</p>
          )}
        </div>
      </Card>
    </>
  );
};

export const DashboardStats = memo(DashboardStatsComponent);
