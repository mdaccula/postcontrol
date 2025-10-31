import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEvents } from '@/hooks/useReactQuery';
import { useGuestInvites } from '@/hooks/useGuestInvites';
import { PERMISSION_LABELS, PERMISSION_DESCRIPTIONS, GuestPermission } from '@/types/guest';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  guest_email: z.string().email('Email inválido'),
  access_end_date: z.date({
    required_error: 'Selecione uma data de expiração',
  }),
  event_permissions: z.array(
    z.object({
      event_id: z.string(),
      permission_level: z.enum(['viewer', 'moderator', 'manager']),
      daily_approval_limit: z.number().optional(),
    })
  ).min(1, 'Selecione pelo menos um evento'),
  notify_new_submissions: z.boolean().default(true),
  notify_before_expiry: z.boolean().default(true),
});

interface GuestInviteDialogProps {
  agencyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GuestInviteDialog = ({ agencyId, open, onOpenChange }: GuestInviteDialogProps) => {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const { data: events = [] } = useEvents(agencyId);
  const { createInvite, isCreating } = useGuestInvites(agencyId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guest_email: '',
      event_permissions: [],
      notify_new_submissions: true,
      notify_before_expiry: true,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const eventPermissions: Array<{
      event_id: string;
      permission_level: GuestPermission;
      daily_approval_limit?: number;
    }> = values.event_permissions.map(p => ({
      event_id: p.event_id,
      permission_level: p.permission_level as GuestPermission,
      daily_approval_limit: p.daily_approval_limit,
    }));

    createInvite({
      guest_email: values.guest_email,
      access_end_date: values.access_end_date.toISOString(),
      event_permissions: eventPermissions,
      notify_new_submissions: values.notify_new_submissions,
      notify_before_expiry: values.notify_before_expiry,
    });
    onOpenChange(false);
    form.reset();
    setSelectedEvents(new Set());
  };

  const toggleEvent = (eventId: string, checked: boolean) => {
    const newSelected = new Set(selectedEvents);
    if (checked) {
      newSelected.add(eventId);
    } else {
      newSelected.delete(eventId);
    }
    setSelectedEvents(newSelected);

    // Atualizar form
    const currentPermissions = form.getValues('event_permissions');
    if (checked) {
      const newPermission: { event_id: string; permission_level: GuestPermission; daily_approval_limit?: number } = {
        event_id: eventId,
        permission_level: 'viewer' as GuestPermission,
      };
      form.setValue('event_permissions', [...currentPermissions, newPermission]);
    } else {
      form.setValue(
        'event_permissions',
        currentPermissions.filter(p => p.event_id !== eventId)
      );
    }
  };

  const updatePermissionLevel = (eventId: string, level: GuestPermission) => {
    const currentPermissions = form.getValues('event_permissions');
    const updated = currentPermissions.map(p => {
      if (p.event_id === eventId) {
        return {
          event_id: p.event_id,
          permission_level: level,
          daily_approval_limit: p.daily_approval_limit,
        } as { event_id: string; permission_level: GuestPermission; daily_approval_limit?: number };
      }
      return p;
    });
    form.setValue('event_permissions', updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Convite</DialogTitle>
          <DialogDescription>
            Convide alguém para visualizar ou gerenciar eventos específicos da sua agência
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="guest_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Convidado</FormLabel>
                  <FormControl>
                    <Input placeholder="usuario@exemplo.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    O convidado receberá um email com link para aceitar o convite
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="access_end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Expiração</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Acesso será revogado automaticamente após esta data
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Eventos e Permissões</FormLabel>
              <FormDescription>
                Selecione os eventos e defina o nível de acesso para cada um
              </FormDescription>
              
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento disponível</p>
              ) : (
                <div className="space-y-3 border rounded-lg p-4">
                  {events.map((event: any) => {
                    const isSelected = selectedEvents.has(event.id);
                    return (
                      <div key={event.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={event.id}
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleEvent(event.id, checked as boolean)}
                          />
                          <label
                            htmlFor={event.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                          >
                            {event.title}
                          </label>
                        </div>

                        {isSelected && (
                          <div className="ml-6 space-y-2">
                            <Select
                              defaultValue="viewer"
                              onValueChange={(value) => updatePermissionLevel(event.id, value as GuestPermission)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="space-y-1">
                                      <div className="font-medium">{label}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {PERMISSION_DESCRIPTIONS[key as GuestPermission]}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="notify_new_submissions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Notificar sobre novas submissões</FormLabel>
                      <FormDescription>
                        Enviar email quando houver novas submissões nos eventos permitidos
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notify_before_expiry"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Notificar antes da expiração</FormLabel>
                      <FormDescription>
                        Enviar lembrete 7 dias antes do acesso expirar
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Criando...' : 'Criar Convite'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
