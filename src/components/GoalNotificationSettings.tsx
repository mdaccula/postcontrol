import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Bell, Mail, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface GoalNotificationSettingsProps {
  agencyId: string;
}

interface ConfigData {
  send_push_notification: boolean;
  send_email_notification: boolean;
  custom_message: string;
}

export const GoalNotificationSettings = ({ agencyId }: GoalNotificationSettingsProps) => {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ConfigData>({
    send_push_notification: true,
    send_email_notification: false,
    custom_message: '🎉 Parabéns! Você garantiu sua vaga no grupo do evento!',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['goal-notification-config', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_goal_notifications_config')
        .select('*')
        .eq('agency_id', agencyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!agencyId,
  });

  useEffect(() => {
    if (data) {
      setConfig({
        send_push_notification: data.send_push_notification,
        send_email_notification: data.send_email_notification,
        custom_message: data.custom_message,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig: ConfigData) => {
      const { error } = await supabase
        .from('agency_goal_notifications_config')
        .upsert({
          agency_id: agencyId,
          ...newConfig,
        }, {
          onConflict: 'agency_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-notification-config', agencyId] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificações de Meta Atingida
        </CardTitle>
        <CardDescription>
          Configure como os divulgadores serão notificados quando atingirem a meta de posts e vendas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="push"
              checked={config.send_push_notification}
              onCheckedChange={(checked) =>
                setConfig({ ...config, send_push_notification: checked as boolean })
              }
            />
            <Label htmlFor="push" className="flex items-center gap-2 cursor-pointer">
              <Bell className="w-4 h-4" />
              Enviar notificação push
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="email"
              checked={config.send_email_notification}
              onCheckedChange={(checked) =>
                setConfig({ ...config, send_email_notification: checked as boolean })
              }
            />
            <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
              <Mail className="w-4 h-4" />
              Enviar email
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Mensagem personalizada</Label>
          <Textarea
            id="message"
            value={config.custom_message}
            onChange={(e) => setConfig({ ...config, custom_message: e.target.value })}
            placeholder="Digite a mensagem que será enviada..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Esta mensagem será enviada aos divulgadores quando atingirem a meta
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
};
