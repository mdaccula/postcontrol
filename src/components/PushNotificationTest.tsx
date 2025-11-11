import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, TestTube2, Loader2, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export const PushNotificationTest = () => {
  const { user } = useAuthStore();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    serviceWorker: boolean;
    vapidKey: boolean;
    subscription: boolean;
    database: boolean;
  } | null>(null);

  const runTests = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para testar');
      return;
    }

    setTesting(true);
    const testResults = {
      serviceWorker: false,
      vapidKey: false,
      subscription: false,
      database: false,
    };

    try {
      // Teste 1: Service Worker registrado
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        testResults.serviceWorker = !!registration;
        console.log('✅ Service Worker:', registration);
      }

      // Teste 2: VAPID Key configurada
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      testResults.vapidKey = !!vapidKey && vapidKey.length > 0;
      console.log('✅ VAPID Key:', vapidKey ? 'Configurada' : 'Não configurada');

      // Teste 3: Inscrição push ativa
      if (testResults.serviceWorker) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        testResults.subscription = !!subscription;
        console.log('✅ Push Subscription:', subscription);
      }

      // Teste 4: Registro no banco de dados
      if (testResults.subscription) {
        const { data: subscriptions, error } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint')
          .eq('user_id', user.id);

        testResults.database = !error && (subscriptions?.length || 0) > 0;
        console.log('✅ Database subscriptions:', subscriptions);
      }

      setResults(testResults);

      // Toast de resultado
      const allPassed = Object.values(testResults).every(v => v === true);
      if (allPassed) {
        toast.success('✅ Todos os testes passaram! Notificações push funcionando.');
      } else {
        toast.warning('⚠️ Alguns testes falharam. Verifique os detalhes abaixo.');
      }
    } catch (error) {
      console.error('❌ Erro ao executar testes:', error);
      toast.error('Erro ao executar testes');
    } finally {
      setTesting(false);
    }
  };

  const TestResult = ({ label, status }: { label: string; status: boolean }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="text-sm">{label}</span>
      {status ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TestTube2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Teste de Notificações Push</CardTitle>
              <CardDescription>
                Verificar se as correções estão funcionando
              </CardDescription>
            </div>
          </div>
          {results && Object.values(results).every(v => v === true) && (
            <Badge variant="default" className="bg-green-500">
              ✓ Tudo OK
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Botão de Teste */}
        <Button 
          onClick={runTests} 
          disabled={testing || !user}
          className="w-full"
          size="lg"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executando Testes...
            </>
          ) : (
            <>
              <TestTube2 className="h-4 w-4 mr-2" />
              Executar Testes de Push
            </>
          )}
        </Button>

        {/* Resultados dos Testes */}
        {results && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">Resultados dos Testes:</p>
            
            <div className="space-y-2">
              <TestResult 
                label="1. Service Worker Registrado" 
                status={results.serviceWorker} 
              />
              <TestResult 
                label="2. VAPID Key Configurada" 
                status={results.vapidKey} 
              />
              <TestResult 
                label="3. Inscrição Push Ativa" 
                status={results.subscription} 
              />
              <TestResult 
                label="4. Registro no Banco de Dados" 
                status={results.database} 
              />
            </div>

            {/* Status Geral */}
            {Object.values(results).every(v => v === true) ? (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-sm">
                  ✅ Todas as verificações passaram! As correções do erro 406 e applicationServerKey 
                  estão funcionando corretamente.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm space-y-2">
                  <p>❌ Alguns testes falharam:</p>
                  {!results.serviceWorker && (
                    <p className="text-xs">• Service Worker não está registrado. Recarregue a página.</p>
                  )}
                  {!results.vapidKey && (
                    <p className="text-xs">• VAPID Key não está configurada nas variáveis de ambiente.</p>
                  )}
                  {!results.subscription && (
                    <p className="text-xs">• Não há inscrição push ativa. Clique em "Ativar Notificações Push" acima.</p>
                  )}
                  {!results.database && (
                    <p className="text-xs">• Inscrição não foi salva no banco. Verifique permissões RLS.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Checklist Manual */}
        <details className="pt-4 border-t">
          <summary className="cursor-pointer text-sm font-medium text-primary hover:underline mb-2">
            Checklist de Teste Manual Completo
          </summary>
          <div className="space-y-3 mt-3">
            <div>
              <p className="text-xs font-medium mb-2">Fase 1: Ativação (3 min)</p>
              <ol className="list-decimal list-inside text-xs space-y-1 text-muted-foreground pl-2">
                <li>Abra DevTools (F12) → Console</li>
                <li>Clique em "Ativar Notificações Push"</li>
                <li>Permita notificações no popup do navegador</li>
                <li>Verifique: ZERO erros 406 ou InvalidAccessError</li>
                <li>Verifique: toast "Notificações push ativadas!"</li>
              </ol>
            </div>

            <div>
              <p className="text-xs font-medium mb-2">Fase 2: Persistência (1 min)</p>
              <ol className="list-decimal list-inside text-xs space-y-1 text-muted-foreground pl-2">
                <li>Recarregue a página (F5)</li>
                <li>Verifique: switch continua ATIVADO</li>
                <li>Verifique: ZERO erros 406 no console</li>
              </ol>
            </div>

            <div>
              <p className="text-xs font-medium mb-2">Fase 3: Notificação Real (5 min)</p>
              <ol className="list-decimal list-inside text-xs space-y-1 text-muted-foreground pl-2">
                <li>Como admin, aprove/rejeite uma submissão</li>
                <li>Aguarde 5-10 segundos</li>
                <li>Verifique: notificação push recebida no navegador</li>
                <li>Clique na notificação: deve abrir /dashboard</li>
              </ol>
            </div>
          </div>
        </details>

        {/* Teste de Notificação Real */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-3">Testar Notificação Real:</p>
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Bell className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs space-y-2">
              <p>Para testar uma notificação real:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Vá para Admin Panel → Submissões</li>
                <li>Selecione uma submissão pendente</li>
                <li>Clique em "Aprovar" ou "Rejeitar"</li>
                <li>Uma notificação push deve aparecer em alguns segundos</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};
