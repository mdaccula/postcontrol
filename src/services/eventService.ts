/**
 * Event Service
 * Handles all event-related data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Event,
  EventInsert,
  EventUpdate,
  EventWithRelations,
  EventFilters,
  ServiceResponse,
  Post,
  PostInsert,
  PostUpdate,
} from '@/types/api';

/**
 * Fetches events with optional filters
 * @param filters - Optional filters for events
 * @returns List of events
 */
export async function getEvents(
  filters: EventFilters = {}
): Promise<ServiceResponse<Event[]>> {
  try {
    const { agencyId, isActive, createdBy } = filters;

    let query = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }
    if (createdBy) {
      query = query.eq('created_by', createdBy);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches a single event by ID with relations
 * @param id - Event ID
 * @returns Event with posts and submissions
 */
export async function getEventById(
  id: string
): Promise<ServiceResponse<EventWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(
        `
        *,
        posts(*)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches event by slug
 * @param slug - Event slug
 * @returns Event
 */
export async function getEventBySlug(
  slug: string
): Promise<ServiceResponse<Event>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('event_slug', slug)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching event by slug:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a new event
 * @param event - Event data
 * @returns Created event
 */
export async function createEvent(
  event: EventInsert
): Promise<ServiceResponse<Event>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error creating event:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates an event
 * @param id - Event ID
 * @param updates - Partial event data
 * @returns Updated event
 */
export async function updateEvent(
  id: string,
  updates: EventUpdate
): Promise<ServiceResponse<Event>> {
  try {
    const { data, error } = await supabase
      .from('events')
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
    console.error('Error updating event:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Toggles event active status
 * @param id - Event ID
 * @param isActive - New active status
 * @returns Updated event
 */
export async function toggleEventStatus(
  id: string,
  isActive: boolean
): Promise<ServiceResponse<Event>> {
  try {
    return await updateEvent(id, { is_active: isActive });
  } catch (error) {
    console.error('Error toggling event status:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes an event
 * @param id - Event ID
 * @returns Success status
 */
export async function deleteEvent(id: string): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.from('events').delete().eq('id', id);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting event:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches posts for an event
 * @param eventId - Event ID
 * @returns List of posts
 */
export async function getEventPosts(
  eventId: string
): Promise<ServiceResponse<Post[]>> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('event_id', eventId)
      .order('post_number', { ascending: true })
      .limit(100); // ✅ CORREÇÃO #3: Limite de segurança para prevenir timeouts

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching event posts:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a new post for an event
 * @param post - Post data
 * @returns Created post
 */
export async function createPost(
  post: PostInsert
): Promise<ServiceResponse<Post>> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates a post
 * @param id - Post ID
 * @param updates - Partial post data
 * @returns Updated post
 */
export async function updatePost(
  id: string,
  updates: PostUpdate
): Promise<ServiceResponse<Post>> {
  try {
    const { data, error } = await supabase
      .from('posts')
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
    console.error('Error updating post:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes a post
 * @param id - Post ID
 * @returns Success status
 */
export async function deletePost(id: string): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting post:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets active events for a user's agency
 * @param agencyId - Agency ID
 * @returns List of active events
 */
export async function getActiveEventsByAgency(
  agencyId: string
): Promise<ServiceResponse<Event[]>> {
  try {
    return await getEvents({ agencyId, isActive: true });
  } catch (error) {
    console.error('Error fetching active events by agency:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets event statistics
 * @param eventId - Event ID
 * @returns Stats object
 */
export async function getEventStats(eventId: string): Promise<
  ServiceResponse<{
    totalPosts: number;
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
  }>
> {
  try {
    // Get posts count
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('event_id', eventId);

    if (postsError) throw postsError;

    // Get submissions for this event's posts
    const postIds = posts.map((p) => p.id);
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('status')
      .in('post_id', postIds);

    if (submissionsError) throw submissionsError;

    const stats = {
      totalPosts: posts.length,
      totalSubmissions: submissions.length,
      approvedSubmissions: submissions.filter((s) => s.status === 'approved')
        .length,
      pendingSubmissions: submissions.filter((s) => s.status === 'pending')
        .length,
      rejectedSubmissions: submissions.filter((s) => s.status === 'rejected')
        .length,
    };

    return {
      data: stats,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching event stats:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}
