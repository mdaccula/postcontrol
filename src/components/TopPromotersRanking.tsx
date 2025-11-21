import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TopPromotersRankingProps {
  eventId: string;
  limit?: number;
}

interface PromoterRank {
  user_id: string;
  full_name: string;
  avatar_url: string;
  current_posts: number;
  current_sales: number;
  required_posts: number;
  required_sales: number;
  completion_percentage: number;
  goal_achieved: boolean;
  rank: number;
}

export const TopPromotersRanking = ({ eventId, limit = 10 }: TopPromotersRankingProps) => {
  const { data: ranking, isLoading } = useQuery({
    queryKey: ['top-promoters', eventId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_promoters_ranking', {
        p_event_id: eventId,
        p_limit: limit,
      });

      if (error) throw error;
      return data as PromoterRank[];
    },
    enabled: !!eventId,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-700" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏆 Ranking de Divulgadoras</CardTitle>
          <CardDescription>Top performers do evento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!ranking || ranking.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏆 Ranking de Divulgadoras</CardTitle>
          <CardDescription>Nenhuma submissão ainda</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏆 Ranking de Divulgadoras</CardTitle>
        <CardDescription>
          Top {limit} performers do evento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ranking.map((promoter) => (
            <div
              key={promoter.user_id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                promoter.goal_achieved 
                  ? 'bg-yellow-500/10 border border-yellow-500/20' 
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 w-12">
                {getRankIcon(promoter.rank)}
                <span className="font-bold text-muted-foreground">
                  {promoter.rank}º
                </span>
              </div>

              <Avatar className="h-10 w-10">
                <AvatarImage src={promoter.avatar_url} />
                <AvatarFallback>
                  {promoter.full_name?.slice(0, 2).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{promoter.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {promoter.current_posts}P + {promoter.current_sales}V
                </p>
              </div>

              <div className="flex items-center gap-2">
                {promoter.goal_achieved ? (
                  <Badge className="bg-yellow-500 text-white">
                    Meta OK
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {promoter.completion_percentage}%
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
