import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PromoterGoalData {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  instagram: string | null;
  goalAchievedAt: string;
  currentPosts: number;
  currentSales: number;
  requiredPosts: number;
  requiredSales: number;
}

interface GoalAchievedReportProps {
  agencyId: string;
}

export const GoalAchievedReport = ({ agencyId }: GoalAchievedReportProps) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Buscar eventos da agência
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events-for-goal-report', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Buscar promotores que atingiram a meta
  const { data: promoters, isLoading: promotersLoading } = useQuery({
    queryKey: ['goal-achieved-promoters', selectedEventId],
    enabled: !!selectedEventId,
    queryFn: async () => {
      // Buscar metas atingidas
      const { data: goals, error: goalsError } = await supabase
        .from('user_event_goals')
        .select('user_id, goal_achieved_at, current_posts, current_sales, required_posts, required_sales')
        .eq('event_id', selectedEventId)
        .eq('goal_achieved', true)
        .order('goal_achieved_at', { ascending: false });

      if (goalsError) throw goalsError;
      if (!goals || goals.length === 0) return [];

      // Buscar perfis dos usuários
      const userIds = goals.map(g => g.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, instagram')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Mapear e combinar dados
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return goals.map(goal => {
        const profile = profileMap.get(goal.user_id);
        return {
          userId: goal.user_id,
          fullName: profile?.full_name || 'Sem nome',
          avatarUrl: profile?.avatar_url || null,
          instagram: profile?.instagram || null,
          goalAchievedAt: goal.goal_achieved_at,
          currentPosts: goal.current_posts || 0,
          currentSales: goal.current_sales || 0,
          requiredPosts: goal.required_posts || 0,
          requiredSales: goal.required_sales || 0,
        } as PromoterGoalData;
      });
    },
  });

  if (eventsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Divulgadoras que Bateram a Meta
        </CardTitle>
        <CardDescription>
          Lista completa de todas as divulgadoras que atingiram suas metas, ordenadas por data de conquista
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              {events?.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEventId && (
          <>
            {promotersLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : promoters && promoters.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-bold text-foreground">{promoters.length}</span> divulgadora(s) com meta atingida
                  </p>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Divulgadora</TableHead>
                        <TableHead>Instagram</TableHead>
                        <TableHead className="text-center">Data/Hora da Meta</TableHead>
                        <TableHead className="text-center">Posts Feitos</TableHead>
                        <TableHead className="text-center">Vendas Feitas</TableHead>
                        <TableHead className="text-center">Meta Exigida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promoters.map((promoter) => (
                        <TableRow key={promoter.userId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={promoter.avatarUrl || undefined} />
                                <AvatarFallback>
                                  {promoter.fullName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{promoter.fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {promoter.instagram ? (
                              <a
                                href={`https://instagram.com/${promoter.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                @{promoter.instagram.replace('@', '')}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(promoter.goalAchievedAt), 'dd/MM/yyyy', { locale: ptBR })}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(promoter.goalAchievedAt), 'HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                              {promoter.currentPosts}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
                              {promoter.currentSales}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {promoter.requiredPosts > 0 && `${promoter.requiredPosts} posts`}
                            {promoter.requiredPosts > 0 && promoter.requiredSales > 0 && ' + '}
                            {promoter.requiredSales > 0 && `${promoter.requiredSales} vendas`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma divulgadora atingiu a meta neste evento ainda
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
