import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useUserGoalProgress } from '@/hooks/useUserGoalProgress';

interface GoalProgressBadgeProps {
  eventId: string;
  userId: string;
  variant?: 'compact' | 'detailed';
}

export const GoalProgressBadge = ({ 
  eventId, 
  userId, 
  variant = 'compact' 
}: GoalProgressBadgeProps) => {
  const { data: progress, isLoading } = useUserGoalProgress(eventId, userId);

  if (isLoading || !progress) return null;

  if (variant === 'compact') {
    if (progress.goalAchieved) {
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0">
            <Trophy className="w-3 h-3 mr-1" />
            Meta Atingida!
          </Badge>
        </motion.div>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <Target className="w-3 h-3" />
        {progress.completionPercentage}%
      </Badge>
    );
  }

  // Variant: detailed
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {progress.goalAchieved ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-lg">Meta Conquistada!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Parabéns! Você garantiu sua vaga no evento 🎉
              </p>
              
              {/* Mostrar qual regra foi atingida */}
              {progress.achievedRequirementId && progress.allRequirements.length > 1 && (
                <div className="mt-3 p-2 bg-green-500/10 rounded-md">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ✅ Meta atingida: {progress.requiredPosts} posts + {progress.requiredSales} vendas
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Progresso da Meta
                </span>
                <span className="text-sm font-bold text-primary">
                  {progress.completionPercentage}%
                </span>
              </div>

              <Progress value={progress.completionPercentage} className="h-2" />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posts:</span>
                    <span className="font-medium">
                      {progress.currentPosts}/{progress.requiredPosts}
                    </span>
                  </div>
                  {progress.postsRemaining > 0 && (
                    <p className="text-muted-foreground italic">
                      Faltam {progress.postsRemaining} posts
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendas:</span>
                    <span className="font-medium">
                      {progress.currentSales}/{progress.requiredSales}
                    </span>
                  </div>
                  {progress.salesRemaining > 0 && (
                    <p className="text-muted-foreground italic">
                      Faltam {progress.salesRemaining} vendas
                    </p>
                  )}
                </div>
              </div>

              {/* Mostrar todas as regras alternativas se existirem */}
              {progress.allRequirements.length > 1 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Opções de meta:
                  </p>
                  {progress.allRequirements.map((req, index) => {
                    const reqTotal = req.required_posts + req.required_sales;
                    const reqCurrent = Math.min(progress.currentPosts, req.required_posts) + 
                                      Math.min(progress.currentSales, req.required_sales);
                    const reqPercentage = reqTotal > 0 ? Math.round((reqCurrent / reqTotal) * 100) : 0;
                    const isAchieved = progress.currentPosts >= req.required_posts && 
                                      progress.currentSales >= req.required_sales;

                    return (
                      <div 
                        key={req.id} 
                        className={`p-2 rounded-md text-xs ${
                          isAchieved 
                            ? 'bg-green-500/10 border border-green-500/20' 
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={isAchieved ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}>
                            {isAchieved && '✅ '}{req.required_posts} posts + {req.required_sales} vendas
                          </span>
                          <span className="font-bold">{reqPercentage}%</span>
                        </div>
                        {req.description && (
                          <p className="text-muted-foreground italic">{req.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
