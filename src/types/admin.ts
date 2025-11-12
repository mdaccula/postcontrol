/**
 * Types for Admin components and hooks
 * @module types/admin
 */

import { Database } from '@/integrations/supabase/types';

/**
 * Submission data structure from database
 */
export type Submission = Database['public']['Tables']['submissions']['Row'];

/**
 * Event data structure from database
 */
export type Event = Database['public']['Tables']['events']['Row'];

/**
 * Post data structure from database
 */
export type Post = Database['public']['Tables']['posts']['Row'];

/**
 * Profile data structure from database
 */
export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Admin filter state managed via URL params
 */
export interface AdminFilters {
  /** Selected event ID or 'all' */
  submissionEventFilter: string;
  /** Selected post number or 'all' */
  submissionPostFilter: string;
  /** Submission status filter */
  submissionStatusFilter: 'all' | 'pending' | 'approved' | 'rejected';
  /** Post type filter */
  postTypeFilter: 'all' | 'divulgacao' | 'sale' | 'selecao_perfil';
  /** Search term for user filtering */
  searchTerm: string;
  /** Start date for date range filter */
  dateFilterStart: string;
  /** End date for date range filter */
  dateFilterEnd: string;
  /** Current pagination page */
  currentPage: number;
  /** Items per page for pagination */
  itemsPerPage: number;
  /** Kanban view toggle state */
  kanbanView: boolean;
  /** Selected event in events tab */
  selectedEvent: string;
}

/**
 * Submission with enriched profile and post data
 */
export interface EnrichedSubmission extends Omit<Submission, 'screenshot_path' | 'screenshot_url'> {
  /** User profile data */
  profiles?: Profile;
  /** Associated post data */
  posts?: {
    post_number: number;
    post_type?: string | null;
    event_id?: string;
    /** Event data for the post */
    events?: Event;
  };
  /** Signed URL for screenshot */
  screenshot_url?: string;
  /** Optional screenshot path */
  screenshot_path?: string | null;
}

/**
 * Image URL cache for signed URLs
 */
export interface ImageUrlCache {
  [submissionId: string]: string;
}

/**
 * Bulk operation context
 */
export interface BulkOperationContext {
  /** Set of selected submission IDs */
  selectedSubmissions: Set<string>;
  /** Total number of items selected */
  selectedCount: number;
  /** Whether all items on page are selected */
  allSelected: boolean;
}
