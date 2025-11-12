import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, Calendar, Shield, MoreVertical, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useGuestInvites } from '@/hooks/useGuestInvites';
import { GuestInviteDialog } from './GuestInviteDialog';
import { GuestPermissionEditor } from './GuestPermissionEditor';
import { STATUS_LABELS, PERMISSION_LABELS } from '@/types/guest';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GuestManagerProps {
  agencyId?: string; // ✅ ITEM 4: Tornar opcional para Master Admin
}

export const GuestManager = ({ agencyId }: GuestManagerProps) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isPermissionEditorOpen, setIsPermissionEditorOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // 🆕 FASE 5

  // ✅ ITEM 4: Se não houver agencyId, buscar de todas as agências (Master Admin)
  const effectiveAgencyId = agencyId || '';
  const { invites, loading, revokeInvite, resendInvite, deleteInvite } = useGuestInvites(effectiveAgencyId);

  const handleEditPermissions = (guest: any) => {
    setSelectedGuest(guest);
    setIsPermissionEditorOpen(true);
  };

  const handleRevokeClick = (guest: any) => {
    setSelectedGuest(guest);
    setIsRevokeDialogOpen(true);
  };

  const confirmRevoke = () => {
    if (selectedGuest) {
      revokeInvite(selectedGuest.id);
      setIsRevokeDialogOpen(false);
      setSelectedGuest(null);
    }
  };

  // 🆕 FASE 5: Handler para deletar
  const handleDeleteClick = (guest: any) => {
    setSelectedGuest(guest);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedGuest) {
      deleteInvite(selectedGuest.id);
      setIsDeleteDialogOpen(false);
      setSelectedGuest(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'expired':
        return 'destructive';
      case 'revoked':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Carregando convidados...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Convidados</h2>
          <p className="text-muted-foreground">
            Convide pessoas para visualizar ou gerenciar eventos específicos
          </p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Convite
        </Button>
      </div>

      {invites.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhum convidado ainda</h3>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro convite para dar acesso a eventos específicos
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invites.map((guest: any) => (
            <Card key={guest.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{guest.guest_email}</span>
                    <Badge variant={getStatusColor(guest.status)}>
                      {STATUS_LABELS[guest.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Válido até {format(new Date(guest.access_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>
                        {guest.guest_event_permissions?.length || 0} evento(s)
                      </span>
                    </div>
                  </div>

                  {guest.guest_event_permissions && guest.guest_event_permissions.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {guest.guest_event_permissions.map((perm: any) => (
                        <Badge key={perm.id} variant="outline" className="text-xs">
                          {PERMISSION_LABELS[perm.permission_level as keyof typeof PERMISSION_LABELS]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditPermissions(guest)}>
                      Editar Permissões
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        const inviteUrl = `${window.location.origin}/accept-invite?token=${guest.invite_token}`;
                        navigator.clipboard.writeText(inviteUrl);
                        toast.success('Link de convite copiado!');
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Link de Convite
                    </DropdownMenuItem>
                    {guest.status === 'pending' && (
                      <DropdownMenuItem onClick={() => resendInvite(guest.id)}>
                        Reenviar Convite
                      </DropdownMenuItem>
                    )}
                    {guest.status !== 'revoked' && (
                      <DropdownMenuItem
                        onClick={() => handleRevokeClick(guest)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Revogar Acesso
                      </DropdownMenuItem>
                    )}
                    {/* 🆕 FASE 5: Opção de deletar para convites não aceitos */}
                    {(guest.status === 'pending' || guest.status === 'expired' || guest.status === 'revoked') && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(guest)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar Convite
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      <GuestInviteDialog
        agencyId={agencyId}
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />

      {selectedGuest && (
        <GuestPermissionEditor
          guest={selectedGuest}
          agencyId={agencyId}
          open={isPermissionEditorOpen}
          onOpenChange={setIsPermissionEditorOpen}
        />
      )}

      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar o acesso de {selectedGuest?.guest_email}? 
              Esta ação não pode ser desfeita e o convidado perderá todo o acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} className="bg-destructive text-destructive-foreground">
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🆕 FASE 5: AlertDialog para deletar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar permanentemente o convite de {selectedGuest?.guest_email}? 
              Esta ação não pode ser desfeita e o convite será removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
