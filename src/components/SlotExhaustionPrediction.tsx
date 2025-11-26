import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Clock, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PredictionData {
  predicted_exhaustion_date: string;
  confidence_level: 'baixa' | 'média' | 'alta';
  confidence_percentage: number;
  hours_until_exhaustion: number;
  factors: string[];
  recommendations: string[];
  analysis: string;
}

interface SlotExhaustionPredictionProps {
  eventId: string;
  eventTitle: string;
}

export const SlotExhaustionPrediction = ({ eventId, eventTitle }: SlotExhaustionPredictionProps) => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePrediction = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado');
        toast.error('Usuário não autenticado');
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke(
        'ai-goal-prediction',
        {
          body: { eventId, userId: user.id },
        }
      );

      if (invokeError) throw invokeError;

      if (!data.success) {
        setError(data.message || 'Não foi possível gerar a previsão');
        toast.error(data.message || 'Erro ao gerar previsão');
        return;
      }

      setPrediction(data.prediction);
      toast.success('Previsão gerada com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar previsão:', err);
      setError('Erro ao gerar previsão. Tente novamente.');
      toast.error('Erro ao gerar previsão');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'alta': return 'bg-green-500';
      case 'média': return 'bg-yellow-500';
      case 'baixa': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Previsão de Esgotamento</h3>
              <p className="text-sm text-muted-foreground">Previsão por IA</p>
            </div>
          </div>
          <Button
            onClick={generatePrediction}
            disabled={loading}
            size="sm"
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? 'Gerando...' : 'Gerar Previsão'}
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {prediction && (
          <div className="space-y-4 pt-4 border-t">
            {/* Resultado Principal */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Previsão de Esgotamento</span>
                </div>
                <Badge className={getConfidenceColor(prediction.confidence_level)}>
                  {prediction.confidence_level} confiança ({prediction.confidence_percentage}%)
                </Badge>
              </div>
              
              <p className="text-2xl font-bold text-primary mb-1">
                {formatDate(prediction.predicted_exhaustion_date)}
              </p>
              <p className="text-sm text-muted-foreground">
                Em aproximadamente {prediction.hours_until_exhaustion.toFixed(1)} horas
              </p>
            </div>

            {/* Análise */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Análise
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {prediction.analysis}
              </p>
            </div>

            {/* Fatores */}
            {prediction.factors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Fatores Considerados</h4>
                <ul className="space-y-1">
                  {prediction.factors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recomendações */}
            {prediction.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recomendações</h4>
                <ul className="space-y-1">
                  {prediction.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
