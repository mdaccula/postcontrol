import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface GuestPermissionEditorProps {
  guest: any;
  agencyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GuestPermissionEditor = ({ guest, agencyId, open, onOpenChange }: GuestPermissionEditorProps) => {
  const [permissions, setPermissions] = useState<Map<string, { level: GuestPermission; limit?: number }>>(new Map());
  const { data: events = [] } = useEvents(agencyId);
  const { updatePermissions } = useGuestInvites(agencyId);

  useEffect(() => {
    if (guest?.guest_event_permissions) {
      const permMap = new Map();
      guest.guest_event_permissions.forEach((perm: any) => {
        permMap.set(perm.event_id, {
          level: perm.permission_level,
          limit: perm.daily_approval_limit,
        });
      });
      setPermissions(permMap);
    }
  }, [guest]);

  const toggleEvent = (eventId: string, checked: boolean) => {
    const newPermissions = new Map(permissions);
    if (checked) {
      newPermissions.set(eventId, { level: 'viewer' });
    } else {
      newPermissions.delete(eventId);
    }
    setPermissions(newPermissions);
  };

  const updatePermissionLevel = (eventId: string, level: GuestPermission) => {
    const newPermissions = new Map(permissions);
    const current = newPermissions.get(eventId);
    if (current) {
      newPermissions.set(eventId, { ...current, level });
    }
    setPermissions(newPermissions);
  };

  const handleSave = () => {
    const eventPermissions = Array.from(permissions.entries()).map(([event_id, { level, limit }]) => ({
      event_id,
      permission_level: level,
      daily_approval_limit: limit,
    }));

    updatePermissions({
      guestId: guest.id,
      eventPermissions,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Permissões</DialogTitle>
          <DialogDescription>
            Atualize os eventos e permissões de {guest?.guest_email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento disponível</p>
          ) : (
            <div className="space-y-3 border rounded-lg p-4">
              {events.map((event: any) => {
                const isSelected = permissions.has(event.id);
                const currentLevel = permissions.get(event.id)?.level || 'viewer';

                return (
                  <div key={event.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${event.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleEvent(event.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`edit-${event.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                      >
                        {event.title}
                      </label>
                    </div>

                    {isSelected && (
                      <div className="ml-6 space-y-2">
                        <Select
                          value={currentLevel}
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

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
