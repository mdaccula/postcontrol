import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Bell,
  Clock,
  Activity,
  RefreshCw,
  Database,
  Wifi,
  Smartphone,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PushNotificationTest } from '@/components/PushNotificationTest';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DiagnosticCheck {
  id: string;
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

interface NotificationHistory {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  type: string;
  clicked: boolean;
}

export const PWADiagnosticDashboard = () => {
  const { user } = useAuthStore();
  const { forceResubscribe, loading: pushLoading } = usePushNotifications();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    { id: 'browser', name: 'Suporte do Navegador', status: 'pending', message: '' },
    { id: 'sw', name: 'Service Worker', status: 'pending', message: '' },
    { id: 'vapid', name: 'VAPID Key', status: 'pending', message: '' },
    { id: 'permission', name: 'Permissão', status: 'pending', message: '' },
    { id: 'subscription', name: 'Subscription', status: 'pending', message: '' },
    { id: 'database', name: 'Banco de Dados', status: 'pending', message: '' },
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [swStatus, setSwStatus] = useState<{
    state: string;
    scope: string;
    scriptURL: string;
  } | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const updateCheck = (id: string, updates: Partial<DiagnosticCheck>) => {
    setChecks(prev => prev.map(check => 
      check.id === id ? { ...check, ...updates } : check
    ));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    
    // 1. Browser Support
    const browserSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    updateCheck('browser', {
      status: browserSupported ? 'success' : 'error',
      message: browserSupported 
        ? 'Navegador compatível' 
        : 'Navegador não suporta PWA',
      details: `SW: ${'serviceWorker' in navigator}, Push: ${'PushManager' in window}, Notif: ${'Notification' in window}`
    });
    
    // 2. Service Worker
    try {
      const registration = await navigator.serviceWorker.ready;
      const active = registration.active;
      
      if (active) {
        setSwStatus({
          state: active.state,
          scope: registration.scope,
          scriptURL: active.scriptURL
        });
        
        updateCheck('sw', {
          status: 'success',
          message: `Service Worker ativo (${active.state})`,
          details: `Scope: ${registration.scope}\nScript: ${active.scriptURL}`
        });
      } else {
        updateCheck('sw', {
          status: 'error',
          message: 'Service Worker não está ativo',
          details: 'Nenhum SW ativo encontrado'
        });
      }
    } catch (error) {
      updateCheck('sw', {
        status: 'error',
        message: 'Erro ao acessar Service Worker',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    // 3. VAPID Key
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const vapidConfigured = !!vapidKey;
    const vapidKeyLength = vapidKey?.length || 0;
    const vapidValid = vapidKeyLength > 80; // Chaves válidas têm ~87 chars
    
    console.log('🔑 VAPID Check:', {
      configured: vapidConfigured,
      keyLength: vapidKeyLength,
      isValid: vapidValid,
      preview: vapidKey?.substring(0, 20)
    });
    
    updateCheck('vapid', {
      status: vapidValid ? 'success' : (vapidConfigured ? 'warning' : 'error'),
      message: vapidValid 
        ? 'VAPID Key válida' 
        : vapidConfigured 
          ? 'VAPID Key configurada mas parece inválida' 
          : 'VAPID Key não encontrada',
      details: vapidValid 
        ? `Key (${vapidKeyLength} chars): ${vapidKey.substring(0, 20)}...` 
        : vapidConfigured 
          ? `Key muito curta (${vapidKeyLength} chars, esperado ~87)`
          : 'Chave não configurada no .env'
    });
    
    // 4. Permission
    const permission = Notification.permission;
    updateCheck('permission', {
      status: permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'warning',
      message: permission === 'granted' 
        ? 'Permissão concedida'
        : permission === 'denied'
        ? 'Permissão negada'
        : 'Permissão não solicitada',
      details: `Status: ${permission}`
    });
    
    // 5. Subscription
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setSubscriptionInfo({
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh?.substring(0, 30) + '...',
            auth: subscription.toJSON().keys?.auth?.substring(0, 20) + '...'
          }
        });
        
        updateCheck('subscription', {
          status: 'success',
          message: 'Subscription ativa',
          details: `Endpoint: ${subscription.endpoint.substring(0, 50)}...\nExpira: ${subscription.expirationTime || 'Nunca'}`
        });
      } else {
        updateCheck('subscription', {
          status: 'warning',
          message: 'Nenhuma subscription ativa',
          details: 'Ative as notificações push nas configurações'
        });
      }
    } catch (error) {
      updateCheck('subscription', {
        status: 'error',
        message: 'Erro ao verificar subscription',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    // 6. Database
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
            ? `${subscriptions.length} subscription(s) registrada(s)`
            : 'Nenhuma subscription no banco',
          details: subscriptions && subscriptions.length > 0
            ? `Última atualização: ${new Date(subscriptions[0].last_used_at).toLocaleString('pt-BR')}`
            : 'Faça login e ative as notificações'
        });
      } catch (error) {
        updateCheck('database', {
          status: 'error',
          message: 'Erro ao consultar banco',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    } else {
      updateCheck('database', {
        status: 'warning',
        message: 'Usuário não autenticado',
        details: 'Faça login para verificar o banco'
      });
    }
    
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
    loadNotificationHistory();
  }, [user]);

  const loadNotificationHistory = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      const { data: logs, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (logs) {
        setNotificationHistory(
          logs.map(log => ({
            id: log.id,
            timestamp: log.sent_at,
            title: log.title,
            body: log.body,
            type: log.type || 'general',
            clicked: log.clicked || false,
          }))
        );
      }
    } catch (error) {
      console.error('[PWADiagnostic] Erro ao carregar histórico:', error);
      // Fallback para mock se houver erro
      setNotificationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendTestNotification = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado',
        variant: 'destructive'
      });
      return;
    }

    setSendingTest(true);
    
    try {
      console.log('🧪 [TESTE] Enviando notificação teste...');
      
      // Chamar Edge Function
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: '🧪 Notificação de Teste',
          body: 'Se você viu isso, o sistema está funcionando! 🎉',
          data: {
            type: 'test',
            timestamp: new Date().toISOString(),
            url: '/push-diagnostic'
          },
          notificationType: 'test'
        }
      });

      if (error) throw error;

      console.log('✅ [TESTE] Resposta:', data);
      
      toast({
        title: '✅ Notificação enviada!',
        description: `${data.sent || 0} dispositivo(s) notificado(s)`,
      });
      
      // Recarregar histórico após 2 segundos
      setTimeout(() => loadNotificationHistory(), 2000);
      
    } catch (error: any) {
      console.error('❌ [TESTE] Erro:', error);
      toast({
        title: 'Erro ao enviar notificação',
        description: error.message || 'Verifique os logs',
        variant: 'destructive'
      });
    } finally {
      setSendingTest(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Atenção</Badge>;
      default:
        return <Badge variant="outline">Verificando...</Badge>;
    }
  };

  const criticalIssues = checks.filter(c => c.status === 'error').length;
  const warnings = checks.filter(c => c.status === 'warning').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button 
        asChild 
        variant="ghost" 
        className="mb-4"
      >
        <Link to="/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Diagnóstico PWA
          </h1>
          <p className="text-muted-foreground mt-1">
            Status completo do sistema de notificações push
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </>
            )}
          </Button>
          
          <Button 
            onClick={async () => {
              const success = await forceResubscribe();
              if (success) {
                setTimeout(() => runDiagnostics(), 1000);
              }
            }}
            disabled={pushLoading || isRunning}
            variant="outline"
            size="lg"
          >
            {pushLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resincronizar Subscription
              </>
            )}
          </Button>
          
          <Button 
            onClick={sendTestNotification} 
            disabled={sendingTest || !user}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            {sendingTest && <Loader2 className="h-4 w-4 animate-spin" />}
            <Bell className="h-4 w-4" />
            {sendingTest ? 'Enviando...' : 'Enviar Teste Real'}
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {criticalIssues === 0 && warnings === 0 ? (
                <span className="text-green-500">Operacional</span>
              ) : criticalIssues > 0 ? (
                <span className="text-red-500">Com problemas</span>
              ) : (
                <span className="text-yellow-500">Atenção</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {criticalIssues} erros, {warnings} avisos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Worker</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {swStatus ? swStatus.state : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {swStatus ? 'Ativo e funcionando' : 'Verificando...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Notification.permission === 'granted' ? 'Ativas' : 'Inativas'}
            </div>
            <p className="text-xs text-muted-foreground">
              {notificationHistory.length} recebidas
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="checks">Verificações</TabsTrigger>
          <TabsTrigger value="test">Teste</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verificações do Sistema</CardTitle>
              <CardDescription>
                Status detalhado de cada componente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checks.map((check) => (
                <div key={check.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <h3 className="font-semibold">{check.name}</h3>
                        <p className="text-sm text-muted-foreground">{check.message}</p>
                      </div>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                  {check.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                        {check.details}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testar Notificações</CardTitle>
              <CardDescription>
                Envie uma notificação de teste para verificar o funcionamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  Esta notificação será enviada apenas para você e aparecerá nos logs do sistema.
                  Verifique se a notificação chega e confira os detalhes na aba "Histórico".
                </AlertDescription>
              </Alert>
              
              <PushNotificationTest />
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">O que verificar:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-6">
                  <li>A notificação deve aparecer em até 5 segundos</li>
                  <li>Ao clicar, deve abrir a página de diagnóstico</li>
                  <li>Os logs devem aparecer no console do navegador</li>
                  <li>O histórico deve ser atualizado na aba "Histórico"</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Subscription</CardTitle>
              <CardDescription>
                Informações técnicas da inscrição push
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Endpoint</label>
                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                      {subscriptionInfo.endpoint}
                    </pre>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Keys</label>
                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(subscriptionInfo.keys, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expiration</label>
                    <p className="mt-1 text-sm">
                      {subscriptionInfo.expirationTime || 'Nunca expira'}
                    </p>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma subscription ativa. Ative as notificações para ver os detalhes.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Notificações</CardTitle>
              <CardDescription>
                Últimas notificações recebidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {notificationHistory.length > 0 ? (
                    notificationHistory.map((notif) => (
                      <div key={notif.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{notif.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={notif.clicked ? 'default' : 'outline'}>
                              {notif.clicked ? 'Clicada' : 'Não clicada'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(notif.timestamp).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{notif.body}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {notif.type}
                          </Badge>
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(notif.timestamp).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma notificação recebida ainda
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs do Service Worker</CardTitle>
              <CardDescription>
                Abra o DevTools Console para ver logs detalhados em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como ver os logs:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Pressione F12 ou Cmd+Opt+I (Mac)</li>
                    <li>Vá para a aba "Console"</li>
                    <li>Filtre por "[SW]" para ver apenas logs do Service Worker</li>
                    <li>Envie uma notificação de teste</li>
                    <li>Observe os logs detalhados de cada etapa</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-sm">Eventos monitorados:</h4>
                <div className="grid gap-2">
                  <Badge variant="outline" className="justify-start">
                    🔔 [SW PUSH] Push Recebido - Dados e timestamp
                  </Badge>
                  <Badge variant="outline" className="justify-start">
                    👆 [SW CLICK] Notificação Clicada - Navegação
                  </Badge>
                  <Badge variant="outline" className="justify-start">
                    ❌ [SW CLOSE] Notificação Fechada - Dismissed
                  </Badge>
                  <Badge variant="outline" className="justify-start">
                    ✅ [Push] Subscription/Permission - Estados
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Problemas Comuns e Soluções</CardTitle>
              <CardDescription>
                Guia rápido para resolver problemas de notificações push
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Sintoma</TableHead>
                    <TableHead className="w-[200px]">Causa Provável</TableHead>
                    <TableHead>Solução</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Notificações não chegam
                      </div>
                    </TableCell>
                    <TableCell>Subscription não ativa</TableCell>
                    <TableCell className="text-sm">
                      Vá para Configurações → Notificações e clique em "Ativar Notificações"
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Erro "Permission denied"
                      </div>
                    </TableCell>
                    <TableCell>Permissão bloqueada</TableCell>
                    <TableCell className="text-sm">
                      Clique no cadeado na barra de endereços → Notificações → Permitir
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        "Subscription null"
                      </div>
                    </TableCell>
                    <TableCell>Service Worker desregistrado</TableCell>
                    <TableCell className="text-sm">
                      Reinstale o PWA ou limpe o cache e recarregue a página (Ctrl+Shift+R)
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Erro "410 Gone"
                      </div>
                    </TableCell>
                    <TableCell>Endpoint expirado</TableCell>
                    <TableCell className="text-sm">
                      Sistema fará re-subscribing automático. Aguarde 5 segundos ou clique novamente em "Ativar"
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        iOS: Notificações não funcionam
                      </div>
                    </TableCell>
                    <TableCell>PWA não instalado</TableCell>
                    <TableCell className="text-sm">
                      No Safari: toque em Compartilhar → "Adicionar à Tela de Início". Notificações só funcionam no app instalado.
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Notificação chega mas não abre o app
                      </div>
                    </TableCell>
                    <TableCell>URL inválida no payload</TableCell>
                    <TableCell className="text-sm">
                      Verifique os logs do console para ver o erro. Pode ser problema de permissão de popup.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Ainda com problemas?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Execute os seguintes passos de diagnóstico:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Vá para a aba "Verificações" e clique em "Atualizar"</li>
                  <li>Verifique se todos os itens estão com status "OK"</li>
                  <li>Vá para a aba "Teste" e envie uma notificação de teste</li>
                  <li>Abra o Console (F12) e procure por erros em vermelho</li>
                  <li>Se o problema persistir, limpe o cache e reinstale o PWA</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
