/**
 * API Types - Strong typing for service layer
 * These types extend and complement Supabase auto-generated types
 */

import { Database } from '@/integrations/supabase/types';

// Supabase table types
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type SubmissionInsert = Database['public']['Tables']['submissions']['Insert'];
export type SubmissionUpdate = Database['public']['Tables']['submissions']['Update'];

export type Event = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type EventUpdate = Database['public']['Tables']['events']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Agency = Database['public']['Tables']['agencies']['Row'];
export type AgencyInsert = Database['public']['Tables']['agencies']['Insert'];
export type AgencyUpdate = Database['public']['Tables']['agencies']['Update'];

export type Post = Database['public']['Tables']['posts']['Row'];
export type PostInsert = Database['public']['Tables']['posts']['Insert'];
export type PostUpdate = Database['public']['Tables']['posts']['Update'];

export type AgencyGuest = Database['public']['Tables']['agency_guests']['Row'];
export type AgencyGuestInsert = Database['public']['Tables']['agency_guests']['Insert'];
export type AgencyGuestUpdate = Database['public']['Tables']['agency_guests']['Update'];

export type GuestEventPermission = Database['public']['Tables']['guest_event_permissions']['Row'];
export type GuestEventPermissionInsert = Database['public']['Tables']['guest_event_permissions']['Insert'];
export type GuestEventPermissionUpdate = Database['public']['Tables']['guest_event_permissions']['Update'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type SubmissionComment = Database['public']['Tables']['submission_comments']['Row'];
export type SubmissionCommentInsert = Database['public']['Tables']['submission_comments']['Insert'];

export type SubmissionTag = Database['public']['Tables']['submission_tags']['Row'];
export type SubmissionTagInsert = Database['public']['Tables']['submission_tags']['Insert'];

// Extended types with relations
export interface SubmissionWithRelations extends Submission {
  profiles?: Partial<Profile>;
  posts?: Partial<Post>;
  events?: Partial<Event>;
}

export interface EventWithRelations extends Event {
  posts?: Partial<Post>[];
  submissions?: Partial<Submission>[];
}

export interface AgencyGuestWithRelations extends AgencyGuest {
  guest_event_permissions?: GuestEventPermission[];
}

// Service response types
export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number | null;
  error: Error | null;
}

// Filter and query types
export interface SubmissionFilters {
  eventId?: string;
  status?: string;
  userId?: string;
  agencyId?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface EventFilters {
  agencyId?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface ProfileFilters {
  agencyId?: string;
  email?: string;
}

// Storage types
export interface SignedUrlResponse {
  url: string;
  path: string;
}

export interface UploadResponse {
  path: string;
  url: string;
}
