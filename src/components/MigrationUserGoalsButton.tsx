import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MigrationResult {
  eventsProcessed: number;
  totalUsers: number;
  usersWithGoals: number;
  totalErrors: number;
}

export const MigrationUserGoalsButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const runMigration = async () => {
    try {
      setIsRunning(true);
      setResult(null);

      toast.info('🔄 Iniciando migração de metas...', {
        description: 'Isso pode levar alguns minutos'
      });

      const { data, error } = await supabase.functions.invoke('populate-user-goals-multi-requirements');

      if (error) throw error;

      if (data?.success) {
        setResult(data.summary);
        toast.success('✅ Migração concluída com sucesso!', {
          description: `${data.summary.usersWithGoals} divulgadoras com metas atingidas encontradas`
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido na migração');
      }
    } catch (error) {
      console.error('Erro ao executar migração:', error);
      toast.error('❌ Erro ao executar migração', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-orange-500" />
          <CardTitle>Migração de Metas (Fase 1)</CardTitle>
        </div>
        <CardDescription>
          Recalcular metas de todos os eventos com múltiplas regras
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta migração irá processar todos os eventos e usuários para atualizar o sistema de metas.
            Execute apenas uma vez após atualizar as regras dos eventos.
          </AlertDescription>
        </Alert>

        <Button
          onClick={runMigration}
          disabled={isRunning}
          className="w-full"
          variant="outline"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Executar Migração
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-2 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Resumo da Migração
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Eventos processados:</span>
                <span className="ml-2 font-bold">{result.eventsProcessed}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Usuários processados:</span>
                <span className="ml-2 font-bold">{result.totalUsers}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Metas atingidas:</span>
                <span className="ml-2 font-bold text-green-600 dark:text-green-400">
                  {result.usersWithGoals}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Erros:</span>
                <span className="ml-2 font-bold">{result.totalErrors}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
