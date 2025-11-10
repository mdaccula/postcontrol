import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';

export const PushNotificationSettings = () => {
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você bloqueou as notificações. Para ativar, vá nas configurações do seu navegador e permita notificações para este site.
            </AlertDescription>
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
      </CardContent>
    </Card>
  );
};
