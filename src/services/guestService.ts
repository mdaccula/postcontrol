/**
 * Guest Service
 * Handles all guest-related data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  AgencyGuest,
  AgencyGuestInsert,
  AgencyGuestUpdate,
  AgencyGuestWithRelations,
  GuestEventPermission,
  GuestEventPermissionInsert,
  GuestEventPermissionUpdate,
  ServiceResponse,
} from '@/types/api';

/**
 * Fetches all guests for an agency
 * @param agencyId - Agency ID
 * @returns List of guests with permissions
 */
export async function getAgencyGuests(
  agencyId: string
): Promise<ServiceResponse<AgencyGuestWithRelations[]>> {
  try {
    const { data, error } = await supabase
      .from('agency_guests')
      .select(
        `
        *,
        guest_event_permissions(*)
      `
      )
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data as AgencyGuestWithRelations[],
      error: null,
    };
  } catch (error) {
    console.error('Error fetching agency guests:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches a single guest by ID
 * @param id - Guest ID
 * @returns Guest with permissions
 */
export async function getGuestById(
  id: string
): Promise<ServiceResponse<AgencyGuestWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('agency_guests')
      .select(
        `
        *,
        guest_event_permissions(*)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      data: data as AgencyGuestWithRelations,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching guest:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches guest by invite token
 * @param token - Invite token
 * @returns Guest
 */
export async function getGuestByToken(
  token: string
): Promise<ServiceResponse<AgencyGuest>> {
  try {
    const { data, error } = await supabase
      .from('agency_guests')
      .select('*')
      .eq('invite_token', token)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching guest by token:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches guest by user ID
 * @param userId - User ID
 * @returns Guest with permissions
 */
export async function getGuestByUserId(
  userId: string
): Promise<ServiceResponse<AgencyGuestWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('agency_guests')
      .select(
        `
        *,
        guest_event_permissions(*)
      `
      )
      .eq('guest_user_id', userId)
      .eq('status', 'accepted')
      .single();

    if (error) throw error;

    return {
      data: data as AgencyGuestWithRelations,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching guest by user ID:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a new guest invite
 * @param guest - Guest data
 * @returns Created guest
 */
export async function createGuestInvite(
  guest: AgencyGuestInsert
): Promise<ServiceResponse<AgencyGuest>> {
  try {
    const { data, error } = await supabase
      .from('agency_guests')
      .insert(guest)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error creating guest invite:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates a guest
 * @param id - Guest ID
 * @param updates - Partial guest data
 * @returns Updated guest
 */
export async function updateGuest(
  id: string,
  updates: AgencyGuestUpdate
): Promise<ServiceResponse<AgencyGuest>> {
  try {
    const { data, error } = await supabase
      .from('agency_guests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error updating guest:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Accepts a guest invite
 * @param token - Invite token
 * @param userId - User ID accepting the invite
 * @returns Updated guest
 */
export async function acceptGuestInvite(
  token: string,
  userId: string
): Promise<ServiceResponse<AgencyGuest>> {
  try {
    const { data, error } = await supabase
      .from('agency_guests')
      .update({
        status: 'accepted',
        guest_user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('invite_token', token)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error accepting guest invite:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Revokes a guest's access
 * @param id - Guest ID
 * @param revokedBy - User ID who revoked access
 * @returns Updated guest
 */
export async function revokeGuestAccess(
  id: string,
  revokedBy: string
): Promise<ServiceResponse<AgencyGuest>> {
  try {
    return await updateGuest(id, {
      status: 'revoked',
      revoked_by: revokedBy,
      revoked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error revoking guest access:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes a guest
 * @param id - Guest ID
 * @returns Success status
 */
export async function deleteGuest(id: string): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.from('agency_guests').delete().eq('id', id);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting guest:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches guest event permissions
 * @param guestId - Guest ID
 * @returns List of event permissions
 */
export async function getGuestEventPermissions(
  guestId: string
): Promise<ServiceResponse<GuestEventPermission[]>> {
  try {
    const { data, error } = await supabase
      .from('guest_event_permissions')
      .select('*')
      .eq('guest_id', guestId);

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching guest event permissions:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a guest event permission
 * @param permission - Permission data
 * @returns Created permission
 */
export async function createGuestEventPermission(
  permission: GuestEventPermissionInsert
): Promise<ServiceResponse<GuestEventPermission>> {
  try {
    const { data, error } = await supabase
      .from('guest_event_permissions')
      .insert(permission)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error creating guest event permission:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates a guest event permission
 * @param id - Permission ID
 * @param updates - Partial permission data
 * @returns Updated permission
 */
export async function updateGuestEventPermission(
  id: string,
  updates: GuestEventPermissionUpdate
): Promise<ServiceResponse<GuestEventPermission>> {
  try {
    const { data, error } = await supabase
      .from('guest_event_permissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error updating guest event permission:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes a guest event permission
 * @param id - Permission ID
 * @returns Success status
 */
export async function deleteGuestEventPermission(
  id: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase
      .from('guest_event_permissions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting guest event permission:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Checks if a user has guest permission for an event
 * @param userId - User ID
 * @param eventId - Event ID
 * @param requiredPermission - Required permission level
 * @returns Boolean indicating permission status
 */
export async function checkGuestPermission(
  userId: string,
  eventId: string,
  requiredPermission: 'viewer' | 'moderator' | 'manager'
): Promise<ServiceResponse<boolean>> {
  try {
    const { data, error } = await supabase.rpc(
      'is_guest_with_permission',
      {
        _user_id: userId,
        _event_id: eventId,
        _required_permission: requiredPermission,
      }
    );

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error checking guest permission:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets active guests for an agency (within access period)
 * @param agencyId - Agency ID
 * @returns List of active guests
 */
export async function getActiveAgencyGuests(
  agencyId: string
): Promise<ServiceResponse<AgencyGuestWithRelations[]>> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('agency_guests')
      .select(
        `
        *,
        guest_event_permissions(*)
      `
      )
      .eq('agency_id', agencyId)
      .eq('status', 'accepted')
      .lte('access_start_date', now)
      .gte('access_end_date', now)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data as AgencyGuestWithRelations[],
      error: null,
    };
  } catch (error) {
    console.error('Error fetching active agency guests:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}
