import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, AlertCircle, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const PushNotificationSettings = () => {
  const navigate = useNavigate();
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Notificações Push</CardTitle>
          </div>
          <CardDescription>
            Receba alertas instantâneos sobre aprovações e eventos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Seu navegador não suporta notificações push. 
              Tente usar Chrome, Firefox ou Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notificações Push</CardTitle>
              <CardDescription>
                Receba alertas instantâneos sobre aprovações e eventos
              </CardDescription>
            </div>
          </div>
          {isSubscribed && (
            <Badge variant="default" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Ativo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="push-notifications" className="text-base font-medium">
              Ativar Notificações Push
            </Label>
            <p className="text-sm text-muted-foreground">
              Notificações aparecem mesmo com o app fechado
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading || permission === 'denied'}
          />
        </div>

        {permission === 'denied' && (
          <Alert variant="destructive" className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="font-medium">Notificações Bloqueadas</p>
                <p className="text-sm">
                  Você bloqueou as notificações push para este site. Para ativar, siga as instruções abaixo:
                </p>
              </div>
            </div>
            
            <div className="pl-8 space-y-3 text-sm">
              {/* Chrome/Edge */}
              <details className="cursor-pointer group">
                <summary className="font-medium group-hover:text-destructive-foreground list-none flex items-center gap-2">
                  <span className="text-base">▶</span>
                  <span>🌐 Google Chrome / Microsoft Edge</span>
                </summary>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground pl-6">
                  <li>Clique no ícone de cadeado 🔒 na barra de endereço</li>
                  <li>Clique em "Permissões do site" ou "Site settings"</li>
                  <li>Encontre "Notificações" e altere para "Permitir"</li>
                  <li>Recarregue a página (F5)</li>
                </ol>
              </details>

              {/* Firefox */}
              <details className="cursor-pointer group">
                <summary className="font-medium group-hover:text-destructive-foreground list-none flex items-center gap-2">
                  <span className="text-base">▶</span>
                  <span>🦊 Mozilla Firefox</span>
                </summary>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground pl-6">
                  <li>Clique no ícone de cadeado 🔒 na barra de endereço</li>
                  <li>Clique em "Permissões" → "Notificações"</li>
                  <li>Desmarque "Bloquear" e marque "Permitir"</li>
                  <li>Recarregue a página (F5)</li>
                </ol>
              </details>

              {/* Safari */}
              <details className="cursor-pointer group">
                <summary className="font-medium group-hover:text-destructive-foreground list-none flex items-center gap-2">
                  <span className="text-base">▶</span>
                  <span>🧭 Safari (macOS)</span>
                </summary>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground pl-6">
                  <li>Menu Safari → Preferências (⌘,)</li>
                  <li>Aba "Sites" → "Notificações"</li>
                  <li>Encontre este site e altere para "Permitir"</li>
                  <li>Recarregue a página (⌘R)</li>
                </ol>
              </details>

              {/* Mobile */}
              <details className="cursor-pointer group">
                <summary className="font-medium group-hover:text-destructive-foreground list-none flex items-center gap-2">
                  <span className="text-base">▶</span>
                  <span>📱 Mobile (Android/iOS)</span>
                </summary>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground pl-6">
                  <li>Configurações do dispositivo → Apps → Navegador</li>
                  <li>Notificações → Permitir notificações</li>
                  <li>Volte ao app e recarregue</li>
                </ol>
              </details>
            </div>
          </Alert>
        )}

        <div className="pt-4 border-t space-y-3">
          <p className="text-sm font-medium">Você será notificado quando:</p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Sua submissão for aprovada</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">✓</span>
              <span>Sua submissão for rejeitada</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">✓</span>
              <span>Um novo evento for criado</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">✓</span>
              <span>Faltar 24h para um evento começar</span>
            </li>
          </ul>
        </div>
        
        {/* 🔴 FASE 2.1: Link para diagnóstico */}
        <Button 
          variant="outline" 
          onClick={() => navigate('/push-diagnostic')}
          className="w-full mt-4"
        >
          <Activity className="mr-2 h-4 w-4" />
          Ver Diagnóstico Completo
        </Button>
      </CardContent>
    </Card>
  );
};
