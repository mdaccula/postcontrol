import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface PromoterStats {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  divulgacaoCount: number;
  selecaoPerfilCount: number;
  salesCount: number;
  totalPosts: number;
  goalAchieved: boolean;
  requiredPosts: number;
  requiredSales: number;
}

interface DetailedGoalsReportProps {
  agencyId: string;
  eventId: string;
}

export const DetailedGoalsReport = ({ agencyId, eventId }: DetailedGoalsReportProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Buscar estatísticas detalhadas por promotor
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['detailed-goals-report', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      // Buscar submissões aprovadas
      const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('user_id, submission_type, status')
        .eq('event_id', eventId)
        .eq('status', 'approved');

      if (subError) throw subError;
      if (!submissions || submissions.length === 0) return [];

      // Buscar perfis dos usuários únicos
      const uniqueUserIds = [...new Set(submissions.map(s => s.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', uniqueUserIds);

      if (profilesError) throw profilesError;

      // Buscar metas dos usuários
      const { data: goals, error: goalsError } = await supabase
        .from('user_event_goals')
        .select('user_id, goal_achieved, required_posts, required_sales')
        .eq('event_id', eventId);

      if (goalsError) throw goalsError;

      // Criar mapa de perfis para lookup rápido
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Agrupar por usuário
      const userMap = new Map<string, PromoterStats>();

      submissions.forEach((sub) => {
        const userId = sub.user_id;
        const profile = profileMap.get(userId);
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            fullName: profile?.full_name || 'Sem nome',
            avatarUrl: profile?.avatar_url || null,
            divulgacaoCount: 0,
            selecaoPerfilCount: 0,
            salesCount: 0,
            totalPosts: 0,
            goalAchieved: false,
            requiredPosts: 0,
            requiredSales: 0,
          });
        }

        const stats = userMap.get(userId)!;

        if (sub.submission_type === 'divulgacao') {
          stats.divulgacaoCount++;
        } else if (sub.submission_type === 'selecao_perfil') {
          stats.selecaoPerfilCount++;
        } else if (sub.submission_type === 'sale') {
          stats.salesCount++;
        }
      });

      // Adicionar informações de metas
      goals?.forEach((goal) => {
        const stats = userMap.get(goal.user_id);
        if (stats) {
          stats.goalAchieved = goal.goal_achieved;
          stats.requiredPosts = goal.required_posts || 0;
          stats.requiredSales = goal.required_sales || 0;
          stats.totalPosts = stats.divulgacaoCount; // Apenas divulgacao conta como post
        }
      });

      return Array.from(userMap.values()).sort((a, b) => {
        if (a.goalAchieved !== b.goalAchieved) {
          return a.goalAchieved ? -1 : 1;
        }
        return b.totalPosts - a.totalPosts;
      });
    },
  });

  // Paginação
  const totalPages = Math.ceil((stats?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStats = stats?.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Relatório Detalhado de Metas
        </CardTitle>
        <CardDescription>
          Visualize quantos posts de cada tipo (divulgação, seleção de perfil, venda) cada promotor possui
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statsLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : stats && stats.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">{stats.length}</span> promotor(es)
              </p>
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promotor</TableHead>
                    <TableHead className="text-center">Divulgação</TableHead>
                    <TableHead className="text-center">Seleção Perfil</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-center">Total Posts</TableHead>
                    <TableHead className="text-center">Meta</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStats?.map((promoter) => (
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
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                            {promoter.divulgacaoCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300">
                            {promoter.selecaoPerfilCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
                            {promoter.salesCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-semibold">
                            {promoter.totalPosts}
                            {promoter.requiredPosts > 0 && (
                              <span className="text-muted-foreground ml-1">
                                / {promoter.requiredPosts}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {promoter.requiredPosts > 0 || promoter.requiredSales > 0 ? (
                            <>
                              {promoter.requiredPosts > 0 && `${promoter.requiredPosts} posts`}
                              {promoter.requiredPosts > 0 && promoter.requiredSales > 0 && ' + '}
                              {promoter.requiredSales > 0 && `${promoter.requiredSales} vendas`}
                            </>
                          ) : (
                            'Sem meta'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {promoter.goalAchieved ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Atingiu
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {promoter.requiredPosts > 0 && promoter.totalPosts < promoter.requiredPosts ? (
                                <>
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Faltam {promoter.requiredPosts - promoter.totalPosts} posts
                                </>
                              ) : promoter.requiredSales > 0 && promoter.salesCount < promoter.requiredSales ? (
                                <>
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Faltam {promoter.requiredSales - promoter.salesCount} vendas
                                </>
                              ) : (
                                'Em progresso'
                              )}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Controles de paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum promotor com submissões aprovadas neste evento
            </div>
          )}
      </CardContent>
    </Card>
  );
};
