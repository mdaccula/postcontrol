import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useEventsQuery } from '@/hooks/consolidated';
import { toast } from 'sonner';
import { Bell, CheckCircle, XCircle, Calendar, Clock } from 'lucide-react';

export const NotificationPreferences = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    notify_submission_approved: true,
    notify_submission_rejected: true,
    notify_new_events: true,
    notify_event_reminders: true,
    deadline_24h: true,
    deadline_3days: true,
    deadline_7days: true,
    event_filter_type: 'all' as 'all' | 'participating' | 'selected',
    selected_event_ids: [] as string[],
  });

  // 🆕 CORREÇÃO #5: Filtrar apenas eventos ativos
  const { data: eventsData } = useEventsQuery({ 
    isActive: true,
    enabled: preferences.event_filter_type === 'selected' 
  });
  const events = eventsData?.events || [];

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading preferences:', error);
      return;
    }

    if (data) {
      setPreferences({
        notify_submission_approved: data.notify_submission_approved ?? true,
        notify_submission_rejected: data.notify_submission_rejected ?? true,
        notify_new_events: data.notify_new_events ?? true,
        notify_event_reminders: data.notify_event_reminders ?? true,
        deadline_24h: data.deadline_24h ?? true,
        deadline_3days: data.deadline_3days ?? true,
        deadline_7days: data.deadline_7days ?? true,
        event_filter_type: (data.event_filter_type || 'all') as 'all' | 'participating' | 'selected',
        selected_event_ids: data.selected_event_ids || [],
      });
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Preferências salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast.error('Erro ao salvar preferências');
    } finally {
      setLoading(false);
    }
  };

  const toggleEventSelection = (eventId: string) => {
    setPreferences(prev => ({
      ...prev,
      selected_event_ids: prev.selected_event_ids.includes(eventId)
        ? prev.selected_event_ids.filter(id => id !== eventId)
        : [...prev.selected_event_ids, eventId]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Preferências de Notificações</CardTitle>
            <CardDescription>
              Personalize quais notificações você deseja receber
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Notificações de Submissões */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h3 className="font-semibold">Submissões</h3>
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notify-approved" className="text-base">
                  Submissões Aprovadas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber quando suas submissões forem aprovadas
                </p>
              </div>
              <Switch
                id="notify-approved"
                checked={preferences.notify_submission_approved}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, notify_submission_approved: checked }))}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notify-rejected" className="text-base">
                  Submissões Rejeitadas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber quando suas submissões forem rejeitadas
                </p>
              </div>
              <Switch
                id="notify-rejected"
                checked={preferences.notify_submission_rejected}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, notify_submission_rejected: checked }))}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Notificações de Eventos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold">Eventos</h3>
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notify-new-events" className="text-base">
                  Novos Eventos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber quando novos eventos forem criados
                </p>
              </div>
              <Switch
                id="notify-new-events"
                checked={preferences.notify_new_events}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, notify_new_events: checked }))}
                disabled={loading}
              />
            </div>

            {preferences.notify_new_events && (
              <div className="pl-4 space-y-3">
                <Label>Filtrar Eventos</Label>
                <Select
                  value={preferences.event_filter_type}
                  onValueChange={(value: 'all' | 'participating' | 'selected') => 
                    setPreferences(prev => ({ ...prev, event_filter_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Eventos</SelectItem>
                    <SelectItem value="participating">Apenas Eventos que Estou Participando</SelectItem>
                    <SelectItem value="selected">Eventos Específicos (Selecionar)</SelectItem>
                  </SelectContent>
                </Select>

                {preferences.event_filter_type === 'selected' && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm text-muted-foreground">
                      Selecione os eventos ({preferences.selected_event_ids.length} selecionados):
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {events.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum evento disponível
                        </p>
                      ) : (
                        events.map((event: any) => (
                          <div key={event.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`event-${event.id}`}
                              checked={preferences.selected_event_ids.includes(event.id)}
                              onCheckedChange={() => toggleEventSelection(event.id)}
                            />
                            <Label 
                              htmlFor={`event-${event.id}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {event.title}
                              {event.is_active && (
                                <Badge variant="secondary" className="ml-2">Ativo</Badge>
                              )}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Lembretes de Prazos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold">Lembretes de Prazos</h3>
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notify-reminders" className="text-base">
                  Ativar Lembretes
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber lembretes de prazos de postagens
                </p>
              </div>
              <Switch
                id="notify-reminders"
                checked={preferences.notify_event_reminders}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, notify_event_reminders: checked }))}
                disabled={loading}
              />
            </div>

            {preferences.notify_event_reminders && (
              <div className="pl-4 space-y-3">
                <Label className="text-sm text-muted-foreground">
                  Receber lembretes quando faltar:
                </Label>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="deadline-7days"
                      checked={preferences.deadline_7days}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, deadline_7days: checked as boolean }))}
                    />
                    <Label htmlFor="deadline-7days" className="text-sm font-normal cursor-pointer">
                      7 dias para o prazo
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="deadline-3days"
                      checked={preferences.deadline_3days}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, deadline_3days: checked as boolean }))}
                    />
                    <Label htmlFor="deadline-3days" className="text-sm font-normal cursor-pointer">
                      3 dias para o prazo
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="deadline-24h"
                      checked={preferences.deadline_24h}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, deadline_24h: checked as boolean }))}
                    />
                    <Label htmlFor="deadline-24h" className="text-sm font-normal cursor-pointer">
                      24 horas para o prazo
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="pt-4">
          <Button 
            onClick={savePreferences} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Salvando...' : 'Salvar Preferências'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
