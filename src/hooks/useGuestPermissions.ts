import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { GuestPermission } from '@/types/guest';

interface UseGuestPermissionsReturn {
  hasPermission: (eventId: string, requiredPermission: GuestPermission) => boolean;
  getPermissionLevel: (eventId: string) => GuestPermission | null;
  allowedEvents: string[];
  loading: boolean;
}

export const useGuestPermissions = (): UseGuestPermissionsReturn => {
  const { user } = useAuthStore();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['guestPermissions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('guest_event_permissions')
        .select(`
          *,
          guest:agency_guests!inner(
            guest_user_id,
            status,
            access_start_date,
            access_end_date
          )
        `)
        .eq('guest.guest_user_id', user.id)
        .eq('guest.status', 'accepted');

      if (error) {
        console.error('Error fetching guest permissions:', error);
        return [];
      }

      // Filtrar apenas permissões dentro do período de acesso
      const now = new Date();
      return data.filter((perm: any) => {
        const startDate = new Date(perm.guest.access_start_date);
        const endDate = new Date(perm.guest.access_end_date);
        return now >= startDate && now <= endDate;
      });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const hasPermission = (eventId: string, requiredPermission: GuestPermission): boolean => {
    const permission = permissions.find((p: any) => p.event_id === eventId);
    if (!permission) return false;

    const level = permission.permission_level as GuestPermission;

    // Hierarquia: manager > moderator > viewer
    if (level === 'manager') return true;
    if (level === 'moderator' && ['moderator', 'viewer'].includes(requiredPermission)) return true;
    if (level === 'viewer' && requiredPermission === 'viewer') return true;

    return false;
  };

  const getPermissionLevel = (eventId: string): GuestPermission | null => {
    const permission = permissions.find((p: any) => p.event_id === eventId);
    return permission ? (permission.permission_level as GuestPermission) : null;
  };

  const allowedEvents = permissions.map((p: any) => p.event_id);

  return {
    hasPermission,
    getPermissionLevel,
    allowedEvents,
    loading: isLoading,
  };
};
