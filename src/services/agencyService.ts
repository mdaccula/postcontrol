/**
 * Agency Service
 * Handles all agency-related data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Agency,
  AgencyInsert,
  AgencyUpdate,
  ServiceResponse,
} from '@/types/api';

/**
 * Fetches all agencies
 * @returns List of agencies
 */
export async function getAgencies(): Promise<ServiceResponse<Agency[]>> {
  try {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching agencies:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches a single agency by ID
 * @param id - Agency ID
 * @returns Agency
 */
export async function getAgencyById(
  id: string
): Promise<ServiceResponse<Agency>> {
  try {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching agency:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches agency by slug
 * @param slug - Agency slug
 * @returns Agency
 */
export async function getAgencyBySlug(
  slug: string
): Promise<ServiceResponse<Agency>> {
  try {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching agency by slug:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches agency by signup token
 * @param token - Signup token
 * @returns Agency
 */
export async function getAgencyBySignupToken(
  token: string
): Promise<ServiceResponse<Agency>> {
  try {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .eq('signup_token', token)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching agency by token:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a new agency
 * @param agency - Agency data
 * @returns Created agency
 */
export async function createAgency(
  agency: AgencyInsert
): Promise<ServiceResponse<Agency>> {
  try {
    const { data, error } = await supabase
      .from('agencies')
      .insert(agency)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error creating agency:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates an agency
 * @param id - Agency ID
 * @param updates - Partial agency data
 * @returns Updated agency
 */
export async function updateAgency(
  id: string,
  updates: AgencyUpdate
): Promise<ServiceResponse<Agency>> {
  try {
    const { data, error } = await supabase
      .from('agencies')
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
    console.error('Error updating agency:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes an agency
 * @param id - Agency ID
 * @returns Success status
 */
export async function deleteAgency(
  id: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.from('agencies').delete().eq('id', id);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting agency:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates agency subscription status
 * @param id - Agency ID
 * @param status - New subscription status
 * @returns Updated agency
 */
export async function updateAgencySubscriptionStatus(
  id: string,
  status: string
): Promise<ServiceResponse<Agency>> {
  try {
    return await updateAgency(id, { subscription_status: status });
  } catch (error) {
    console.error('Error updating agency subscription status:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Extends agency trial period
 * @param id - Agency ID
 * @param newEndDate - New trial end date
 * @returns Updated agency
 */
export async function extendAgencyTrial(
  id: string,
  newEndDate: string
): Promise<ServiceResponse<Agency>> {
  try {
    return await updateAgency(id, {
      trial_end_date: newEndDate,
      trial_extended: true,
    });
  } catch (error) {
    console.error('Error extending agency trial:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Checks if agency is in trial period
 * @param id - Agency ID
 * @returns Boolean indicating trial status
 */
export async function isAgencyInTrial(
  id: string
): Promise<ServiceResponse<boolean>> {
  try {
    const { data, error } = await supabase.rpc('is_agency_in_trial', {
      agency_uuid: id,
    });

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error checking agency trial status:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Checks if agency trial is expired
 * @param id - Agency ID
 * @returns Boolean indicating expiration status
 */
export async function isAgencyTrialExpired(
  id: string
): Promise<ServiceResponse<boolean>> {
  try {
    const { data, error } = await supabase.rpc('is_agency_trial_expired', {
      agency_uuid: id,
    });

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error checking agency trial expiration:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets agency statistics
 * @param id - Agency ID
 * @returns Stats object
 */
export async function getAgencyStats(id: string): Promise<
  ServiceResponse<{
    totalUsers: number;
    totalEvents: number;
    activeEvents: number;
    totalSubmissions: number;
  }>
> {
  try {
    // Get users count
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('agency_id', id);

    if (usersError) throw usersError;

    // Get events count
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, is_active')
      .eq('agency_id', id);

    if (eventsError) throw eventsError;

    // Get submissions count
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id')
      .eq('agency_id', id);

    if (submissionsError) throw submissionsError;

    const stats = {
      totalUsers: users.length,
      totalEvents: events.length,
      activeEvents: events.filter((e) => e.is_active).length,
      totalSubmissions: submissions.length,
    };

    return {
      data: stats,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching agency stats:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets agencies with subscription details
 * @returns List of agencies with subscription info
 */
export async function getAgenciesWithSubscriptions(): Promise<
  ServiceResponse<Agency[]>
> {
  try {
    const { data, error } = await supabase
      .from('agencies')
      .select(
        `
        *,
        subscriptions(*)
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching agencies with subscriptions:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}
