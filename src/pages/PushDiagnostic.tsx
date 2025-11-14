import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface DiagnosticCheck {
  id: string;
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function PushDiagnostic() {
  const { user } = useAuthStore();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    { id: 'browser', name: 'Suporte do Navegador', status: 'pending', message: '' },
    { id: 'sw', name: 'Service Worker', status: 'pending', message: '' },
    { id: 'vapid', name: 'VAPID Key', status: 'pending', message: '' },
    { id: 'permission', name: 'Permissão de Notificações', status: 'pending', message: '' },
    { id: 'subscription', name: 'Subscription Ativa', status: 'pending', message: '' },
    { id: 'platform', name: 'Detecção de Plataforma', status: 'pending', message: '' },
    { id: 'pwa', name: 'PWA Status', status: 'pending', message: '' },
    { id: 'database', name: 'Registro no Banco', status: 'pending', message: '' },
  ]);
  
  const [isRunning, setIsRunning] = useState(false);

  const updateCheck = (id: string, updates: Partial<DiagnosticCheck>) => {
    setChecks(prev => prev.map(check => 
      check.id === id ? { ...check, ...updates } : check
    ));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    
    // 1. Verificar suporte do navegador
    const browserSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    updateCheck('browser', {
      status: browserSupported ? 'success' : 'error',
      message: browserSupported 
        ? '✅ Navegador suporta Push Notifications' 
        : '❌ Navegador não suporta Push Notifications',
      details: `serviceWorker: ${'serviceWorker' in navigator}, PushManager: ${'PushManager' in window}, Notification: ${'Notification' in window}`
    });
    
    // 2. Verificar Service Worker
    try {
      const registration = await navigator.serviceWorker.ready;
      updateCheck('sw', {
        status: registration.active ? 'success' : 'error',
        message: registration.active 
          ? `✅ Service Worker ativo`
          : '❌ Service Worker não está ativo',
        details: `Scope: ${registration.scope}\nScript: ${registration.active?.scriptURL || 'N/A'}\nState: ${registration.active?.state || 'N/A'}`
      });
    } catch (error) {
      updateCheck('sw', {
        status: 'error',
        message: '❌ Erro ao acessar Service Worker',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    // 3. Verificar VAPID Key
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const vapidValid = vapidKey && (vapidKey.length === 87 || vapidKey.length === 88);
    updateCheck('vapid', {
      status: vapidValid ? 'success' : 'error',
      message: vapidKey 
        ? vapidValid 
          ? `✅ VAPID Key configurada (${vapidKey.length} caracteres)`
          : `⚠️ VAPID Key com tamanho incorreto (${vapidKey.length} caracteres, esperado: 87-88)`
        : '❌ VAPID Key não configurada',
      details: vapidKey ? `Primeiros 20 caracteres: ${vapidKey.substring(0, 20)}...` : 'Variável VITE_VAPID_PUBLIC_KEY não encontrada'
    });
    
    // 4. Verificar permissão
    const permission = Notification.permission;
    updateCheck('permission', {
      status: permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'warning',
      message: permission === 'granted' 
        ? '✅ Permissão concedida'
        : permission === 'denied'
        ? '❌ Permissão negada - Verifique configurações do navegador'
        : '⚠️ Permissão não solicitada ainda',
      details: `Notification.permission: ${permission}`
    });
    
    // 5. Verificar subscription
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      updateCheck('subscription', {
        status: subscription ? 'success' : 'warning',
        message: subscription 
          ? '✅ Subscription ativa no navegador'
          : '⚠️ Nenhuma subscription encontrada no navegador',
        details: subscription ? `Endpoint: ${subscription.endpoint.substring(0, 80)}...` : 'PushManager.getSubscription() retornou null'
      });
    } catch (error) {
      updateCheck('subscription', {
        status: 'error',
        message: '❌ Erro ao verificar subscription',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    // 6. Detecção de plataforma
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    
    updateCheck('platform', {
      status: 'success',
      message: `📱 Plataforma: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}`,
      details: `Mobile: ${isMobile}\niOS: ${isIOS}\nAndroid: ${isAndroid}\nUser-Agent: ${navigator.userAgent.substring(0, 80)}...`
    });
    
    // 7. Verificar PWA
    if (isIOS) {
      updateCheck('pwa', {
        status: isPWA ? 'success' : 'warning',
        message: isPWA 
          ? '✅ App instalado como PWA (via Home Screen)'
          : '⚠️ App NÃO está instalado como PWA - Notificações NÃO funcionarão no iOS',
        details: isPWA 
          ? 'Aberto via tela inicial - Push notifications suportado'
          : 'Abra via Safari, toque em "Compartilhar" → "Adicionar à Tela Inicial"'
      });
    } else {
      updateCheck('pwa', {
        status: 'success',
        message: isPWA 
          ? '✅ App instalado como PWA'
          : '✅ PWA não é requisito (não é iOS)',
        details: isPWA
          ? 'App aberto via tela inicial'
          : 'Notificações funcionam direto no navegador'
      });
    }

    // 8. Verificar registro no banco de dados
    if (user) {
      try {
        const { data: subscriptions, error } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, created_at, last_used_at')
          .eq('user_id', user.id);

        if (error) throw error;

        updateCheck('database', {
          status: subscriptions && subscriptions.length > 0 ? 'success' : 'warning',
          message: subscriptions && subscriptions.length > 0
            ? `✅ ${subscriptions.length} subscription(s) registrada(s) no banco`
            : '⚠️ Nenhuma subscription encontrada no banco de dados',
          details: subscriptions && subscriptions.length > 0
            ? `Última atualização: ${new Date(subscriptions[0].last_used_at).toLocaleString('pt-BR')}\nEndpoint: ${subscriptions[0].endpoint.substring(0, 60)}...`
            : 'Usuário não possui subscriptions ativas no banco push_subscriptions'
        });
      } catch (error) {
        updateCheck('database', {
          status: 'error',
          message: '❌ Erro ao verificar banco de dados',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    } else {
      updateCheck('database', {
        status: 'warning',
        message: '⚠️ Usuário não autenticado',
        details: 'Faça login para verificar registros no banco'
      });
    }
    
    setIsRunning(false);
  };
  
  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'pending':
        return <Loader2 className="h-6 w-6 animate-spin text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Aviso</Badge>;
      case 'pending':
        return <Badge variant="outline">Aguardando</Badge>;
    }
  };

  const errorChecks = checks.filter(c => c.status === 'error');
  const warningChecks = checks.filter(c => c.status === 'warning');
  const allSuccess = checks.every(c => c.status === 'success');

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Diagnóstico de Push Notifications</h1>
        <p className="text-muted-foreground">
          Verifique automaticamente o status e configuração das notificações push
        </p>
      </div>
      
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Verificações Automáticas</h2>
          <Button onClick={runDiagnostics} disabled={isRunning}>
            {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Executar Novamente
          </Button>
        </div>
        
        <div className="space-y-4">
          {checks.map(check => (
            <div key={check.id} className="flex items-start gap-3 p-4 border rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(check.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold">{check.name}</h3>
                  {getStatusBadge(check.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{check.message}</p>
                {check.details && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Ver detalhes</summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap">
                      {check.details}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Resumo e Recomendações */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Resumo e Recomendações</h2>
        
        {errorChecks.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
              ⚠️ Problemas Críticos Encontrados ({errorChecks.length}):
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
              {errorChecks.map(c => (
                <li key={c.id}><strong>{c.name}:</strong> {c.message}</li>
              ))}
            </ul>
          </div>
        )}
        
        {warningChecks.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ Avisos ({warningChecks.length}):
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              {warningChecks.map(c => (
                <li key={c.id}><strong>{c.name}:</strong> {c.message}</li>
              ))}
            </ul>
          </div>
        )}
        
        {allSuccess && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
              ✅ Todos os testes passaram!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Push Notifications estão configuradas corretamente e devem funcionar sem problemas.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">📋 Checklist Rápido:</h3>
          <ul className="text-sm space-y-1">
            <li>✓ Service Worker deve estar ativo</li>
            <li>✓ VAPID Key deve ter 87-88 caracteres</li>
            <li>✓ Permissão deve estar "granted"</li>
            <li>✓ iOS precisa de PWA instalado (Add to Home Screen)</li>
            <li>✓ Deve haver subscription no banco de dados</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
