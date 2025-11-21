import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Target, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface EventRequirementsDisplayProps {
  eventId: string;
  variant?: 'full' | 'compact';
}

interface Requirement {
  id: string;
  required_posts: number;
  required_sales: number;
  description: string | null;
  display_order: number;
  users_achieved?: number;
}

export const EventRequirementsDisplay = ({ 
  eventId, 
  variant = 'full' 
}: EventRequirementsDisplayProps) => {
  const { data: requirements, isLoading } = useQuery({
    queryKey: ['event-requirements', eventId],
    queryFn: async () => {
      // Buscar regras do evento
      const { data: reqs, error: reqError } = await supabase
        .from('event_requirements')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order');

      if (reqError) throw reqError;

      // Para cada regra, contar quantos usuários atingiram
      const requirementsWithCount = await Promise.all(
        (reqs || []).map(async (req) => {
          const { count } = await supabase
            .from('user_event_goals')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('achieved_requirement_id', req.id);

          return {
            ...req,
            users_achieved: count || 0,
          };
        })
      );

      return requirementsWithCount;
    },
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!requirements || requirements.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div
            key={req.id}
            className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span>
                Opção {index + 1}: {req.required_posts} posts + {req.required_sales} vendas
              </span>
            </div>
            {req.users_achieved > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {req.users_achieved}
              </Badge>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5" />
          Requisitos para Garantir Vaga
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Complete <strong>qualquer uma</strong> das opções abaixo para garantir sua vaga:
        </p>

        {requirements.map((req, index) => (
          <div
            key={req.id}
            className="p-4 border rounded-lg space-y-2 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-semibold">
                    Opção {index + 1}
                  </Badge>
                  {req.users_achieved > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {req.users_achieved} conquistaram
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="font-semibold">{req.required_posts} Posts</p>
                      <p className="text-xs text-muted-foreground">Divulgação</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="font-semibold">{req.required_sales} Vendas</p>
                      <p className="text-xs text-muted-foreground">Conversão</p>
                    </div>
                  </div>
                </div>

                {req.description && (
                  <p className="text-sm text-muted-foreground italic">
                    {req.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="p-3 bg-blue-500/10 rounded-md border border-blue-500/20">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 <strong>Dica:</strong> Você só precisa completar UMA das opções acima. 
            Escolha a que melhor se encaixa no seu perfil!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
