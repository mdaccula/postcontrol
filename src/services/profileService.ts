/**
 * Profile Service
 * Handles all profile-related data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Profile,
  ProfileUpdate,
  ProfileFilters,
  ServiceResponse,
} from '@/types/api';

/**
 * Fetches profiles with optional filters
 * @param filters - Optional filters for profiles
 * @returns List of profiles
 */
export async function getProfiles(
  filters: ProfileFilters = {}
): Promise<ServiceResponse<Profile[]>> {
  try {
    const { agencyId, email } = filters;

    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    if (email) {
      query = query.eq('email', email);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches a single profile by ID
 * @param id - Profile/User ID
 * @returns Profile
 */
export async function getProfileById(
  id: string
): Promise<ServiceResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches the current user's profile
 * @returns Current user's profile
 */
export async function getCurrentUserProfile(): Promise<
  ServiceResponse<Profile>
> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('No authenticated user');

    return await getProfileById(user.id);
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates a profile
 * @param id - Profile/User ID
 * @param updates - Partial profile data
 * @returns Updated profile
 */
export async function updateProfile(
  id: string,
  updates: ProfileUpdate
): Promise<ServiceResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
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
    console.error('Error updating profile:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates the current user's profile
 * @param updates - Partial profile data
 * @returns Updated profile
 */
export async function updateCurrentUserProfile(
  updates: ProfileUpdate
): Promise<ServiceResponse<Profile>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('No authenticated user');

    return await updateProfile(user.id, updates);
  } catch (error) {
    console.error('Error updating current user profile:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates user avatar
 * @param userId - User ID
 * @param avatarUrl - New avatar URL
 * @returns Updated profile
 */
export async function updateUserAvatar(
  userId: string,
  avatarUrl: string
): Promise<ServiceResponse<Profile>> {
  try {
    return await updateProfile(userId, { avatar_url: avatarUrl });
  } catch (error) {
    console.error('Error updating user avatar:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates user theme preference
 * @param userId - User ID
 * @param theme - Theme preference ('light' | 'dark' | 'system')
 * @returns Updated profile
 */
export async function updateUserTheme(
  userId: string,
  theme: string
): Promise<ServiceResponse<Profile>> {
  try {
    return await updateProfile(userId, { theme_preference: theme });
  } catch (error) {
    console.error('Error updating user theme:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Marks tutorial as completed for a user
 * @param userId - User ID
 * @returns Updated profile
 */
export async function markTutorialCompleted(
  userId: string
): Promise<ServiceResponse<Profile>> {
  try {
    return await updateProfile(userId, { tutorial_completed: true });
  } catch (error) {
    console.error('Error marking tutorial completed:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets profiles by agency with role information
 * @param agencyId - Agency ID
 * @returns List of profiles with roles
 */
export async function getAgencyProfiles(
  agencyId: string
): Promise<ServiceResponse<Profile[]>> {
  try {
    return await getProfiles({ agencyId });
  } catch (error) {
    console.error('Error fetching agency profiles:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Searches profiles by name or email
 * @param searchTerm - Search term
 * @param agencyId - Optional agency ID filter
 * @returns List of matching profiles
 */
export async function searchProfiles(
  searchTerm: string,
  agencyId?: string
): Promise<ServiceResponse<Profile[]>> {
  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error searching profiles:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets user statistics (submissions, badges, etc.)
 * @param userId - User ID
 * @returns User stats
 */
export async function getUserStats(userId: string): Promise<
  ServiceResponse<{
    totalSubmissions: number;
    approvedSubmissions: number;
    totalBadges: number;
  }>
> {
  try {
    // Get submissions count
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('status')
      .eq('user_id', userId);

    if (subError) throw subError;

    // Get badges count
    const { data: badges, error: badgesError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId);

    if (badgesError) throw badgesError;

    const stats = {
      totalSubmissions: submissions.length,
      approvedSubmissions: submissions.filter((s) => s.status === 'approved')
        .length,
      totalBadges: badges.length,
    };

    return {
      data: stats,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}
