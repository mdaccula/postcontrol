export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          agency_id: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agency_id?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agency_id?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          admin_email: string | null
          created_at: string
          custom_domain: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          max_events: number | null
          max_influencers: number | null
          name: string
          og_image_url: string | null
          owner_id: string | null
          plan_expiry_date: string | null
          signup_token: string | null
          slug: string
          subscription_plan: string | null
          subscription_status: string | null
          tickets_group_url: string | null
          trial_end_date: string | null
          trial_extended: boolean | null
          trial_start_date: string | null
          updated_at: string
          website_url: string | null
          whatsapp_group_url: string | null
        }
        Insert: {
          admin_email?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          max_events?: number | null
          max_influencers?: number | null
          name: string
          og_image_url?: string | null
          owner_id?: string | null
          plan_expiry_date?: string | null
          signup_token?: string | null
          slug: string
          subscription_plan?: string | null
          subscription_status?: string | null
          tickets_group_url?: string | null
          trial_end_date?: string | null
          trial_extended?: boolean | null
          trial_start_date?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp_group_url?: string | null
        }
        Update: {
          admin_email?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          max_events?: number | null
          max_influencers?: number | null
          name?: string
          og_image_url?: string | null
          owner_id?: string | null
          plan_expiry_date?: string | null
          signup_token?: string | null
          slug?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          tickets_group_url?: string | null
          trial_end_date?: string | null
          trial_extended?: boolean | null
          trial_start_date?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp_group_url?: string | null
        }
        Relationships: []
      }
      agency_goal_notifications_config: {
        Row: {
          agency_id: string
          created_at: string | null
          custom_message: string | null
          id: string
          send_email_notification: boolean | null
          send_push_notification: boolean | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          custom_message?: string | null
          id?: string
          send_email_notification?: boolean | null
          send_push_notification?: boolean | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          custom_message?: string | null
          id?: string
          send_email_notification?: boolean | null
          send_push_notification?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_goal_notifications_config_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_guests: {
        Row: {
          accepted_at: string | null
          access_end_date: string
          access_start_date: string
          agency_id: string
          created_at: string
          guest_email: string
          guest_user_id: string | null
          id: string
          invite_token: string | null
          invited_by: string
          last_accessed_at: string | null
          notify_before_expiry: boolean | null
          notify_new_submissions: boolean | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          access_end_date: string
          access_start_date?: string
          agency_id: string
          created_at?: string
          guest_email: string
          guest_user_id?: string | null
          id?: string
          invite_token?: string | null
          invited_by: string
          last_accessed_at?: string | null
          notify_before_expiry?: boolean | null
          notify_new_submissions?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          access_end_date?: string
          access_start_date?: string
          agency_id?: string
          created_at?: string
          guest_email?: string
          guest_user_id?: string | null
          id?: string
          invite_token?: string | null
          invited_by?: string
          last_accessed_at?: string | null
          notify_before_expiry?: boolean | null
          notify_new_submissions?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_guests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_requests: {
        Row: {
          agency_name: string
          agency_slug: string
          created_at: string
          id: string
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_name: string
          agency_slug: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_name?: string
          agency_slug?: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auto_approval_rules: {
        Row: {
          auto_approve_after_x_approvals: number | null
          created_at: string | null
          enabled: boolean | null
          event_id: string | null
          id: string
          trusted_users: string[] | null
          updated_at: string | null
        }
        Insert: {
          auto_approve_after_x_approvals?: number | null
          created_at?: string | null
          enabled?: boolean | null
          event_id?: string | null
          id?: string
          trusted_users?: string[] | null
          updated_at?: string | null
        }
        Update: {
          auto_approve_after_x_approvals?: number | null
          created_at?: string | null
          enabled?: boolean | null
          event_id?: string | null
          id?: string
          trusted_users?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_approval_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_faqs: {
        Row: {
          answer: string
          created_at: string
          display_order: number
          event_id: string
          id: string
          is_visible: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          display_order?: number
          event_id: string
          id?: string
          is_visible?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          is_visible?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_faqs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_requirements: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          event_id: string
          id: string
          required_posts: number
          required_sales: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          event_id: string
          id?: string
          required_posts?: number
          required_sales?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          event_id?: string
          id?: string
          required_posts?: number
          required_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_requirements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_slots_history: {
        Row: {
          available_slots: number
          created_at: string | null
          event_id: string
          id: string
          occupancy_percentage: number
          occupied_slots: number
          recorded_at: string
          total_slots: number
        }
        Insert: {
          available_slots: number
          created_at?: string | null
          event_id: string
          id?: string
          occupancy_percentage: number
          occupied_slots: number
          recorded_at?: string
          total_slots: number
        }
        Update: {
          available_slots?: number
          created_at?: string | null
          event_id?: string
          id?: string
          occupancy_percentage?: number
          occupied_slots?: number
          recorded_at?: string
          total_slots?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_slots_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          template_data: Json
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          template_data: Json
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          template_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accept_posts: boolean | null
          accept_sales: boolean | null
          agency_id: string | null
          auto_activate_at: string | null
          auto_deactivate_at: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string | null
          event_image_url: string | null
          event_purpose: string | null
          event_slug: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          is_approximate_total: boolean | null
          location: string | null
          numero_de_vagas: number | null
          require_instagram_link: boolean | null
          require_post_screenshot: boolean | null
          require_profile_screenshot: boolean | null
          required_posts: number | null
          required_sales: number | null
          setor: string | null
          target_gender: string[] | null
          ticketer_email: string | null
          title: string
          total_required_posts: number | null
          updated_at: string
          whatsapp_group_title: string | null
          whatsapp_group_url: string | null
        }
        Insert: {
          accept_posts?: boolean | null
          accept_sales?: boolean | null
          agency_id?: string | null
          auto_activate_at?: string | null
          auto_deactivate_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date?: string | null
          event_image_url?: string | null
          event_purpose?: string | null
          event_slug?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          is_approximate_total?: boolean | null
          location?: string | null
          numero_de_vagas?: number | null
          require_instagram_link?: boolean | null
          require_post_screenshot?: boolean | null
          require_profile_screenshot?: boolean | null
          required_posts?: number | null
          required_sales?: number | null
          setor?: string | null
          target_gender?: string[] | null
          ticketer_email?: string | null
          title: string
          total_required_posts?: number | null
          updated_at?: string
          whatsapp_group_title?: string | null
          whatsapp_group_url?: string | null
        }
        Update: {
          accept_posts?: boolean | null
          accept_sales?: boolean | null
          agency_id?: string | null
          auto_activate_at?: string | null
          auto_deactivate_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string | null
          event_image_url?: string | null
          event_purpose?: string | null
          event_slug?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          is_approximate_total?: boolean | null
          location?: string | null
          numero_de_vagas?: number | null
          require_instagram_link?: boolean | null
          require_post_screenshot?: boolean | null
          require_profile_screenshot?: boolean | null
          required_posts?: number | null
          required_sales?: number | null
          setor?: string | null
          target_gender?: string[] | null
          ticketer_email?: string | null
          title?: string
          total_required_posts?: number | null
          updated_at?: string
          whatsapp_group_title?: string | null
          whatsapp_group_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_audit_log: {
        Row: {
          action: string
          action_data: Json | null
          created_at: string
          event_id: string | null
          guest_id: string
          id: string
          ip_address: unknown
          submission_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_data?: Json | null
          created_at?: string
          event_id?: string | null
          guest_id: string
          id?: string
          ip_address?: unknown
          submission_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_data?: Json | null
          created_at?: string
          event_id?: string | null
          guest_id?: string
          id?: string
          ip_address?: unknown
          submission_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_audit_log_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "agency_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_audit_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_event_permissions: {
        Row: {
          created_at: string
          daily_approval_limit: number | null
          event_id: string
          guest_id: string
          id: string
          permission_level: Database["public"]["Enums"]["guest_permission"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_approval_limit?: number | null
          event_id: string
          guest_id: string
          id?: string
          permission_level?: Database["public"]["Enums"]["guest_permission"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_approval_limit?: number | null
          event_id?: string
          guest_id?: string
          id?: string
          permission_level?: Database["public"]["Enums"]["guest_permission"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_event_permissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_event_permissions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "agency_guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list_analytics: {
        Row: {
          created_at: string | null
          date_id: string | null
          event_id: string
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          utm_params: Json | null
        }
        Insert: {
          created_at?: string | null
          date_id?: string | null
          event_id: string
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          utm_params?: Json | null
        }
        Update: {
          created_at?: string | null
          date_id?: string | null
          event_id?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          utm_params?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_analytics_date_id_fkey"
            columns: ["date_id"]
            isOneToOne: false
            referencedRelation: "guest_list_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_list_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "guest_list_events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list_dates: {
        Row: {
          alternative_link_female: string | null
          alternative_link_male: string | null
          auto_deactivate_after_start: boolean | null
          created_at: string | null
          end_time: string | null
          event_date: string
          event_id: string
          female_price: number
          id: string
          image_url: string | null
          important_info: string | null
          is_active: boolean | null
          male_price: number
          max_capacity: number | null
          name: string | null
          price_type: string | null
          show_alternative_after_start: boolean | null
          start_time: string | null
        }
        Insert: {
          alternative_link_female?: string | null
          alternative_link_male?: string | null
          auto_deactivate_after_start?: boolean | null
          created_at?: string | null
          end_time?: string | null
          event_date: string
          event_id: string
          female_price: number
          id?: string
          image_url?: string | null
          important_info?: string | null
          is_active?: boolean | null
          male_price: number
          max_capacity?: number | null
          name?: string | null
          price_type?: string | null
          show_alternative_after_start?: boolean | null
          start_time?: string | null
        }
        Update: {
          alternative_link_female?: string | null
          alternative_link_male?: string | null
          auto_deactivate_after_start?: boolean | null
          created_at?: string | null
          end_time?: string | null
          event_date?: string
          event_id?: string
          female_price?: number
          id?: string
          image_url?: string | null
          important_info?: string | null
          is_active?: boolean | null
          male_price?: number
          max_capacity?: number | null
          name?: string | null
          price_type?: string | null
          show_alternative_after_start?: boolean | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "guest_list_events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list_events: {
        Row: {
          agency_id: string
          agency_phone: string | null
          created_at: string | null
          event_image_url: string | null
          extra_info: string | null
          id: string
          is_active: boolean | null
          location: string
          name: string
          no_dates_message: string | null
          no_dates_show_social: boolean | null
          no_dates_show_tickets: boolean | null
          no_dates_show_whatsapp: boolean | null
          slug: string
          updated_at: string | null
          whatsapp_link: string | null
        }
        Insert: {
          agency_id: string
          agency_phone?: string | null
          created_at?: string | null
          event_image_url?: string | null
          extra_info?: string | null
          id?: string
          is_active?: boolean | null
          location: string
          name: string
          no_dates_message?: string | null
          no_dates_show_social?: boolean | null
          no_dates_show_tickets?: boolean | null
          no_dates_show_whatsapp?: boolean | null
          slug: string
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          agency_id?: string
          agency_phone?: string | null
          created_at?: string | null
          event_image_url?: string | null
          extra_info?: string | null
          id?: string
          is_active?: boolean | null
          location?: string
          name?: string
          no_dates_message?: string | null
          no_dates_show_social?: boolean | null
          no_dates_show_tickets?: boolean | null
          no_dates_show_whatsapp?: boolean | null
          slug?: string
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list_registrations: {
        Row: {
          date_id: string
          email: string
          event_id: string
          full_name: string
          gender: string
          id: string
          ip_address: unknown
          is_bot_suspected: boolean | null
          registered_at: string | null
          shared_via_whatsapp: boolean | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          date_id: string
          email: string
          event_id: string
          full_name: string
          gender: string
          id?: string
          ip_address?: unknown
          is_bot_suspected?: boolean | null
          registered_at?: string | null
          shared_via_whatsapp?: boolean | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          date_id?: string
          email?: string
          event_id?: string
          full_name?: string
          gender?: string
          id?: string
          ip_address?: unknown
          is_bot_suspected?: boolean | null
          registered_at?: string | null
          shared_via_whatsapp?: boolean | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_registrations_date_id_fkey"
            columns: ["date_id"]
            isOneToOne: false
            referencedRelation: "guest_list_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_list_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "guest_list_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          clicked: boolean | null
          clicked_at: string | null
          created_at: string | null
          data: Json | null
          delivered: boolean | null
          id: string
          sent_at: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body: string
          clicked?: boolean | null
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered?: boolean | null
          id?: string
          sent_at?: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string
          clicked?: boolean | null
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered?: boolean | null
          id?: string
          sent_at?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          deadline_24h: boolean
          deadline_3days: boolean
          deadline_7days: boolean
          email_notifications: boolean
          event_filter_type: string | null
          id: string
          notify_event_reminders: boolean | null
          notify_new_events: boolean | null
          notify_submission_approved: boolean | null
          notify_submission_rejected: boolean | null
          selected_event_ids: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline_24h?: boolean
          deadline_3days?: boolean
          deadline_7days?: boolean
          email_notifications?: boolean
          event_filter_type?: string | null
          id?: string
          notify_event_reminders?: boolean | null
          notify_new_events?: boolean | null
          notify_submission_approved?: boolean | null
          notify_submission_rejected?: boolean | null
          selected_event_ids?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline_24h?: boolean
          deadline_3days?: boolean
          deadline_7days?: boolean
          email_notifications?: boolean
          event_filter_type?: string | null
          id?: string
          notify_event_reminders?: boolean | null
          notify_new_events?: boolean | null
          notify_submission_approved?: boolean | null
          notify_submission_rejected?: boolean | null
          selected_event_ids?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string
          deadline: string
          event_id: string
          id: string
          post_number: number
          post_type: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by: string
          deadline: string
          event_id: string
          id?: string
          post_number: number
          post_type?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string
          deadline?: string
          event_id?: string
          id?: string
          post_number?: number
          post_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          followers_range: string | null
          full_name: string | null
          gender: string | null
          id: string
          instagram: string | null
          phone: string | null
          theme_preference: string | null
          tutorial_completed: boolean | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          followers_range?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          instagram?: string | null
          phone?: string | null
          theme_preference?: string | null
          tutorial_completed?: boolean | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          followers_range?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          phone?: string | null
          theme_preference?: string | null
          tutorial_completed?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_retries: {
        Row: {
          attempt_count: number | null
          body: string
          created_at: string | null
          data: Json | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number | null
          next_retry_at: string | null
          notification_type: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          attempt_count?: number | null
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          notification_type?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          attempt_count?: number | null
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          notification_type?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          count: number
          created_at: string
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action_type: string
          count?: number
          created_at?: string
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action_type?: string
          count?: number
          created_at?: string
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rejection_templates: {
        Row: {
          created_at: string | null
          id: string
          message: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
      submission_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_internal: boolean
          submission_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean
          submission_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          submission_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_comments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_logs: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          old_status: string | null
          reason: string | null
          submission_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
          submission_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_logs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_tags: {
        Row: {
          created_at: string
          created_by: string
          id: string
          submission_id: string
          tag_name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          submission_id: string
          tag_name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          submission_id?: string
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_tags_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          agency_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          event_id: string | null
          followers_range: string | null
          id: string
          instagram_verified: boolean | null
          instagram_verified_at: string | null
          post_id: string | null
          profile_screenshot_path: string | null
          rejection_reason: string | null
          sales_proof_url: string | null
          screenshot_path: string | null
          screenshot_url: string | null
          status: string
          submission_type: string | null
          submitted_at: string
          user_id: string
          user_ticketer_email: string | null
        }
        Insert: {
          agency_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          event_id?: string | null
          followers_range?: string | null
          id?: string
          instagram_verified?: boolean | null
          instagram_verified_at?: string | null
          post_id?: string | null
          profile_screenshot_path?: string | null
          rejection_reason?: string | null
          sales_proof_url?: string | null
          screenshot_path?: string | null
          screenshot_url?: string | null
          status?: string
          submission_type?: string | null
          submitted_at?: string
          user_id: string
          user_ticketer_email?: string | null
        }
        Update: {
          agency_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          event_id?: string | null
          followers_range?: string | null
          id?: string
          instagram_verified?: boolean | null
          instagram_verified_at?: string | null
          post_id?: string | null
          profile_screenshot_path?: string | null
          rejection_reason?: string | null
          sales_proof_url?: string | null
          screenshot_path?: string | null
          screenshot_url?: string | null
          status?: string
          submission_type?: string | null
          submitted_at?: string
          user_id?: string
          user_ticketer_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          display_order: number | null
          features: Json | null
          id: string
          is_popular: boolean | null
          is_visible: boolean | null
          max_events: number
          max_influencers: number
          monthly_price: number
          plan_key: string
          plan_name: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          features?: Json | null
          id?: string
          is_popular?: boolean | null
          is_visible?: boolean | null
          max_events: number
          max_influencers: number
          monthly_price: number
          plan_key: string
          plan_name: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          features?: Json | null
          id?: string
          is_popular?: boolean | null
          is_visible?: boolean | null
          max_events?: number
          max_influencers?: number
          monthly_price?: number
          plan_key?: string
          plan_name?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          agency_id: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          agency_id: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_changelog: {
        Row: {
          affected_modules: string[] | null
          author_id: string | null
          author_name: string | null
          change_type: string
          created_at: string | null
          description: string
          id: string
          severity: string | null
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          affected_modules?: string[] | null
          author_id?: string | null
          author_name?: string | null
          change_type: string
          created_at?: string | null
          description: string
          id?: string
          severity?: string | null
          title: string
          updated_at?: string | null
          version: string
        }
        Update: {
          affected_modules?: string[] | null
          author_id?: string | null
          author_name?: string | null
          change_type?: string
          created_at?: string | null
          description?: string
          id?: string
          severity?: string | null
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      user_agencies: {
        Row: {
          agency_id: string
          id: string
          joined_at: string | null
          last_accessed_at: string | null
          user_id: string
        }
        Insert: {
          agency_id: string
          id?: string
          joined_at?: string | null
          last_accessed_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string
          id?: string
          joined_at?: string | null
          last_accessed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: string
          created_at: string
          earned_at: string
          event_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_type: string
          created_at?: string
          earned_at?: string
          event_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          earned_at?: string
          event_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_event_goals: {
        Row: {
          achieved_requirement_id: string | null
          agency_id: string
          created_at: string | null
          current_posts: number | null
          current_sales: number | null
          event_id: string
          goal_achieved: boolean | null
          goal_achieved_at: string | null
          id: string
          notified: boolean | null
          notified_at: string | null
          required_posts: number | null
          required_sales: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved_requirement_id?: string | null
          agency_id: string
          created_at?: string | null
          current_posts?: number | null
          current_sales?: number | null
          event_id: string
          goal_achieved?: boolean | null
          goal_achieved_at?: string | null
          id?: string
          notified?: boolean | null
          notified_at?: string | null
          required_posts?: number | null
          required_sales?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved_requirement_id?: string | null
          agency_id?: string
          created_at?: string | null
          current_posts?: number | null
          current_sales?: number | null
          event_id?: string
          goal_achieved?: boolean | null
          goal_achieved_at?: string | null
          id?: string
          notified?: boolean | null
          notified_at?: string | null
          required_posts?: number | null
          required_sales?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_goals_achieved_requirement_id_fkey"
            columns: ["achieved_requirement_id"]
            isOneToOne: false
            referencedRelation: "event_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_event_goals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_event_goals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_segments: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          description: string | null
          filters: Json
          id: string
          segment_name: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          description?: string | null
          filters?: Json
          id?: string
          segment_name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          filters?: Json
          id?: string
          segment_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_segments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agency_requests_with_users: {
        Row: {
          agency_name: string | null
          agency_slug: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          rejection_reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_sales_stats: {
        Row: {
          approved_sales_count: number | null
          total_sales_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_update_user_goal: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: {
          achieved_requirement_id: string
          current_posts: number
          current_sales: number
          goal_just_achieved: boolean
          required_posts: number
          required_sales: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_max_count: number
          p_user_id: string
          p_window_minutes: number
        }
        Returns: boolean
      }
      convert_to_fixed_timezone: {
        Args: { input_timestamp: string }
        Returns: string
      }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      display_in_brazil_timezone: {
        Args: { input_timestamp: string }
        Returns: string
      }
      expire_old_guest_invites: { Args: never; Returns: undefined }
      get_agency_for_signup: {
        Args: { agency_slug: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_agency_signup_data: {
        Args: { agency_slug_or_token: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          signup_token: string
          slug: string
        }[]
      }
      get_approved_sales_count: {
        Args: { p_agency_id: string }
        Returns: number
      }
      get_current_user_agency_id: { Args: never; Returns: string }
      get_event_available_slots: {
        Args: { p_event_id: string }
        Returns: {
          available_slots: number
          occupancy_percentage: number
          occupied_slots: number
          total_slots: number
        }[]
      }
      get_submission_counts_by_event: {
        Args: { p_agency_id: string }
        Returns: {
          event_id: string
          submission_count: number
        }[]
      }
      get_submission_counts_by_post: {
        Args: { p_agency_id: string }
        Returns: {
          post_id: string
          submission_count: number
        }[]
      }
      get_top_promoters_ranking: {
        Args: { p_event_id: string; p_limit?: number }
        Returns: {
          achieved_requirement_id: string
          avatar_url: string
          completion_percentage: number
          current_posts: number
          current_sales: number
          full_name: string
          goal_achieved: boolean
          rank: number
          required_posts: number
          required_sales: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agency_admin_for: { Args: { _agency_id: string }; Returns: boolean }
      is_agency_admin_of: { Args: { agency_uuid: string }; Returns: boolean }
      is_agency_in_trial: { Args: { agency_uuid: string }; Returns: boolean }
      is_agency_trial_expired: {
        Args: { agency_uuid: string }
        Returns: boolean
      }
      is_current_user_agency_admin: { Args: never; Returns: boolean }
      is_current_user_master_admin: { Args: never; Returns: boolean }
      is_guest_with_permission: {
        Args: {
          _event_id: string
          _required_permission: Database["public"]["Enums"]["guest_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
      link_admin_to_agency: {
        Args: { p_admin_email: string; p_agency_id: string }
        Returns: undefined
      }
      record_slots_snapshot: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      send_event_reminders: { Args: never; Returns: undefined }
      send_push_to_user: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_can_view_agency: { Args: { _agency_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "agency_admin" | "master_admin"
      guest_permission: "viewer" | "moderator" | "manager"
      request_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "agency_admin", "master_admin"],
      guest_permission: ["viewer", "moderator", "manager"],
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
