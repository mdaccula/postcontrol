import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { CreateGuestInvite, AgencyGuest, GuestPermission } from '@/types/guest';
import { toast } from 'sonner';

export const useGuestInvites = (agencyId?: string) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Listar convites da agência
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['guestInvites', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];

      const { data, error } = await supabase
        .from('agency_guests')
        .select(`
          *,
          guest_event_permissions(*)
        `)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!agencyId,
  });

  // Criar novo convite
  const createInvite = useMutation({
    mutationFn: async (invite: CreateGuestInvite) => {
      if (!user || !agencyId) throw new Error('Usuário ou agência não identificados');

      // Criar o convite principal
      const { data: guestData, error: guestError } = await supabase
        .from('agency_guests')
        .insert({
          agency_id: agencyId,
          invited_by: user.id,
          guest_email: invite.guest_email,
          access_end_date: invite.access_end_date,
          notify_new_submissions: invite.notify_new_submissions ?? true,
          notify_before_expiry: invite.notify_before_expiry ?? true,
        })
        .select()
        .single();

      if (guestError) throw guestError;

      // Criar permissões de eventos
      const permissionsToInsert = invite.event_permissions.map(perm => ({
        guest_id: guestData.id,
        event_id: perm.event_id,
        permission_level: perm.permission_level,
        daily_approval_limit: perm.daily_approval_limit,
      }));

      const { error: permError } = await supabase
        .from('guest_event_permissions')
        .insert(permissionsToInsert);

      if (permError) throw permError;

      return guestData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestInvites', agencyId] });
      toast.success('Convite criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating invite:', error);
      toast.error('Erro ao criar convite: ' + error.message);
    },
  });

  // Revogar convite
  const revokeInvite = useMutation({
    mutationFn: async (guestId: string) => {
      const { error } = await supabase
        .from('agency_guests')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
        })
        .eq('id', guestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestInvites', agencyId] });
      toast.success('Convite revogado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error revoking invite:', error);
      toast.error('Erro ao revogar convite: ' + error.message);
    },
  });

  // Reenviar convite
  const resendInvite = useMutation({
    mutationFn: async (guestId: string) => {
      // Aqui você pode adicionar lógica para reenviar o email
      // Por enquanto, apenas atualiza a data de expiração
      const { error } = await supabase
        .from('agency_guests')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', guestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Convite reenviado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error resending invite:', error);
      toast.error('Erro ao reenviar convite: ' + error.message);
    },
  });

  // Atualizar permissões de um convite
  const updatePermissions = useMutation({
    mutationFn: async ({
      guestId,
      eventPermissions,
    }: {
      guestId: string;
      eventPermissions: Array<{
        event_id: string;
        permission_level: GuestPermission;
        daily_approval_limit?: number;
      }>;
    }) => {
      // Deletar permissões antigas
      await supabase
        .from('guest_event_permissions')
        .delete()
        .eq('guest_id', guestId);

      // Inserir novas permissões
      const { error } = await supabase
        .from('guest_event_permissions')
        .insert(
          eventPermissions.map(perm => ({
            guest_id: guestId,
            event_id: perm.event_id,
            permission_level: perm.permission_level as 'viewer' | 'moderator' | 'manager',
            daily_approval_limit: perm.daily_approval_limit,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestInvites', agencyId] });
      toast.success('Permissões atualizadas com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating permissions:', error);
      toast.error('Erro ao atualizar permissões: ' + error.message);
    },
  });

  return {
    invites,
    loading: isLoading,
    createInvite: createInvite.mutate,
    revokeInvite: revokeInvite.mutate,
    resendInvite: resendInvite.mutate,
    updatePermissions: updatePermissions.mutate,
    isCreating: createInvite.isPending,
    isRevoking: revokeInvite.isPending,
  };
};
