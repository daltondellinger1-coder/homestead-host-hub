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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_label: string | null
          actor_user_id: string | null
          automation_name: string | null
          created_at: string
          error_details: string | null
          id: string
          new_value: Json | null
          prior_value: Json | null
          record_id: string
          record_type: string
          session_metadata: Json | null
          source: string
        }
        Insert: {
          action: string
          actor_label?: string | null
          actor_user_id?: string | null
          automation_name?: string | null
          created_at?: string
          error_details?: string | null
          id?: string
          new_value?: Json | null
          prior_value?: Json | null
          record_id: string
          record_type: string
          session_metadata?: Json | null
          source?: string
        }
        Update: {
          action?: string
          actor_label?: string | null
          actor_user_id?: string | null
          automation_name?: string | null
          created_at?: string
          error_details?: string | null
          id?: string
          new_value?: Json | null
          prior_value?: Json | null
          record_id?: string
          record_type?: string
          session_metadata?: Json | null
          source?: string
        }
        Relationships: []
      }
      airbnb_availability_snapshots: {
        Row: {
          available_30_day: boolean | null
          available_7_day: boolean | null
          blocked_days_next_30: number | null
          created_at: string
          id: string
          listing_id: string
          next_available_date: string | null
          snapshot_date: string
          source_note: string | null
        }
        Insert: {
          available_30_day?: boolean | null
          available_7_day?: boolean | null
          blocked_days_next_30?: number | null
          created_at?: string
          id?: string
          listing_id: string
          next_available_date?: string | null
          snapshot_date?: string
          source_note?: string | null
        }
        Update: {
          available_30_day?: boolean | null
          available_7_day?: boolean | null
          blocked_days_next_30?: number | null
          created_at?: string
          id?: string
          listing_id?: string
          next_available_date?: string | null
          snapshot_date?: string
          source_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airbnb_availability_snapshots_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "airbnb_market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      airbnb_market_listings: {
        Row: {
          active: boolean
          airbnb_url: string | null
          amenities: string[]
          amenity_map: Json
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          comp_type: string | null
          created_at: string
          data_status: string | null
          id: string
          listing_url: string | null
          missing_or_unclear: string[]
          name: string
          notes: string | null
          owner_action: string | null
          photo_actions: string[]
          pricing_recommendation: string | null
          rating: number | null
          reviews: number | null
          sleeps: number | null
          sort_order: number
          source: string
          target_guest: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          airbnb_url?: string | null
          amenities?: string[]
          amenity_map?: Json
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          comp_type?: string | null
          created_at?: string
          data_status?: string | null
          id?: string
          listing_url?: string | null
          missing_or_unclear?: string[]
          name: string
          notes?: string | null
          owner_action?: string | null
          photo_actions?: string[]
          pricing_recommendation?: string | null
          rating?: number | null
          reviews?: number | null
          sleeps?: number | null
          sort_order?: number
          source: string
          target_guest?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          airbnb_url?: string | null
          amenities?: string[]
          amenity_map?: Json
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          comp_type?: string | null
          created_at?: string
          data_status?: string | null
          id?: string
          listing_url?: string | null
          missing_or_unclear?: string[]
          name?: string
          notes?: string | null
          owner_action?: string | null
          photo_actions?: string[]
          pricing_recommendation?: string | null
          rating?: number | null
          reviews?: number | null
          sleeps?: number | null
          sort_order?: number
          source?: string
          target_guest?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      airbnb_price_snapshots: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          monthly_discount_pct: number | null
          monthly_price: number | null
          nightly_price: number | null
          snapshot_date: string
          source_note: string | null
          weekly_discount_pct: number | null
          weekly_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          monthly_discount_pct?: number | null
          monthly_price?: number | null
          nightly_price?: number | null
          snapshot_date?: string
          source_note?: string | null
          weekly_discount_pct?: number | null
          weekly_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          monthly_discount_pct?: number | null
          monthly_price?: number | null
          nightly_price?: number | null
          snapshot_date?: string
          source_note?: string | null
          weekly_discount_pct?: number | null
          weekly_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "airbnb_price_snapshots_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "airbnb_market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      airbnb_weekly_briefings: {
        Row: {
          created_at: string
          headline: string
          id: string
          next_actions: string[]
          owner_read: string
          pricing_summary: Json
          week_start: string
        }
        Insert: {
          created_at?: string
          headline: string
          id?: string
          next_actions?: string[]
          owner_read: string
          pricing_summary?: Json
          week_start: string
        }
        Update: {
          created_at?: string
          headline?: string
          id?: string
          next_actions?: string[]
          owner_read?: string
          pricing_summary?: Json
          week_start?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          amount: number | null
          category: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          reason: string
          record_id: string
          record_type: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          category: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          reason: string
          record_id: string
          record_type: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          category?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          reason?: string
          record_id?: string
          record_type?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_rules: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          emergency_override_allowed: boolean
          enabled: boolean
          id: string
          threshold_amount: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          emergency_override_allowed?: boolean
          enabled?: boolean
          id?: string
          threshold_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          emergency_override_allowed?: boolean
          enabled?: boolean
          id?: string
          threshold_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      automation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          payload: Json
          record_id: string | null
          source: string
          version: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          payload?: Json
          record_id?: string | null
          source?: string
          version?: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          payload?: Json
          record_id?: string | null
          source?: string
          version?: number
        }
        Relationships: []
      }
      booking_intake_events: {
        Row: {
          booking_request_id: string | null
          created_at: string
          error_text: string | null
          external_booking_id: string | null
          external_listing_id: string | null
          external_source: string | null
          id: string
          outcome: string
          raw_payload: Json | null
        }
        Insert: {
          booking_request_id?: string | null
          created_at?: string
          error_text?: string | null
          external_booking_id?: string | null
          external_listing_id?: string | null
          external_source?: string | null
          id?: string
          outcome: string
          raw_payload?: Json | null
        }
        Update: {
          booking_request_id?: string | null
          created_at?: string
          error_text?: string | null
          external_booking_id?: string | null
          external_listing_id?: string | null
          external_source?: string | null
          id?: string
          outcome?: string
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_intake_events_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_listing_mappings: {
        Row: {
          created_at: string
          external_listing_id: string
          external_source: string
          id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_listing_id: string
          external_source: string
          id?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_listing_id?: string
          external_source?: string
          id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_listing_mappings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          assigned_unit_id: string | null
          check_in: string
          check_out: string
          created_at: string
          decline_reason: string | null
          email: string
          external_booking_id: string | null
          external_listing_id: string | null
          external_source: string | null
          id: string
          name: string
          notes: string | null
          num_guests: number
          phone: string | null
          preferred_unit_type: Database["public"]["Enums"]["unit_type"] | null
          raw_payload: Json | null
          reviewed_at: string | null
          source: Database["public"]["Enums"]["booking_source"]
          source_updated_at: string | null
          status: Database["public"]["Enums"]["booking_request_status"]
          updated_at: string
        }
        Insert: {
          assigned_unit_id?: string | null
          check_in: string
          check_out: string
          created_at?: string
          decline_reason?: string | null
          email: string
          external_booking_id?: string | null
          external_listing_id?: string | null
          external_source?: string | null
          id?: string
          name: string
          notes?: string | null
          num_guests?: number
          phone?: string | null
          preferred_unit_type?: Database["public"]["Enums"]["unit_type"] | null
          raw_payload?: Json | null
          reviewed_at?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          source_updated_at?: string | null
          status?: Database["public"]["Enums"]["booking_request_status"]
          updated_at?: string
        }
        Update: {
          assigned_unit_id?: string | null
          check_in?: string
          check_out?: string
          created_at?: string
          decline_reason?: string | null
          email?: string
          external_booking_id?: string | null
          external_listing_id?: string | null
          external_source?: string | null
          id?: string
          name?: string
          notes?: string | null
          num_guests?: number
          phone?: string | null
          preferred_unit_type?: Database["public"]["Enums"]["unit_type"] | null
          raw_payload?: Json | null
          reviewed_at?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          source_updated_at?: string | null
          status?: Database["public"]["Enums"]["booking_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      checklist_runs: {
        Row: {
          checklist_date: string
          checklist_type: string
          completed_at: string | null
          created_at: string
          escalation_notes: string | null
          id: string
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_date?: string
          checklist_type: string
          completed_at?: string | null
          created_at?: string
          escalation_notes?: string | null
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          checklist_date?: string
          checklist_type?: string
          completed_at?: string | null
          created_at?: string
          escalation_notes?: string | null
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cleaner_access_tokens: {
        Row: {
          allowed_actions: string[]
          cleaning_task_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          allowed_actions?: string[]
          cleaning_task_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          allowed_actions?: string[]
          cleaning_task_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaner_access_tokens_cleaning_task_id_fkey"
            columns: ["cleaning_task_id"]
            isOneToOne: false
            referencedRelation: "cleaning_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_tasks: {
        Row: {
          assigned_cleaner_email: string | null
          assigned_cleaner_name: string | null
          assigned_cleaner_user_id: string | null
          calendar_sync_status: string
          checkout_at: string
          cleaning_deadline: string
          completed_at: string | null
          completion_notes: string | null
          completion_photo_urls: string[]
          confirmation_status: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          damage_found: string | null
          declined_at: string | null
          departing_reservation_id: string
          google_calendar_event_id: string | null
          id: string
          linen_notes: string | null
          maintenance_issue_found: string | null
          next_check_in_at: string | null
          next_reservation_id: string | null
          notification_history: Json
          pet_notes: string | null
          readiness_checklist: Json
          readiness_verification_status: string
          scheduled_for: string | null
          special_notes: string | null
          status: string
          supplies_needed: string | null
          supply_notes: string | null
          unit_id: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_cleaner_email?: string | null
          assigned_cleaner_name?: string | null
          assigned_cleaner_user_id?: string | null
          calendar_sync_status?: string
          checkout_at: string
          cleaning_deadline: string
          completed_at?: string | null
          completion_notes?: string | null
          completion_photo_urls?: string[]
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          damage_found?: string | null
          declined_at?: string | null
          departing_reservation_id: string
          google_calendar_event_id?: string | null
          id?: string
          linen_notes?: string | null
          maintenance_issue_found?: string | null
          next_check_in_at?: string | null
          next_reservation_id?: string | null
          notification_history?: Json
          pet_notes?: string | null
          readiness_checklist?: Json
          readiness_verification_status?: string
          scheduled_for?: string | null
          special_notes?: string | null
          status?: string
          supplies_needed?: string | null
          supply_notes?: string | null
          unit_id: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_cleaner_email?: string | null
          assigned_cleaner_name?: string | null
          assigned_cleaner_user_id?: string | null
          calendar_sync_status?: string
          checkout_at?: string
          cleaning_deadline?: string
          completed_at?: string | null
          completion_notes?: string | null
          completion_photo_urls?: string[]
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          damage_found?: string | null
          declined_at?: string | null
          departing_reservation_id?: string
          google_calendar_event_id?: string | null
          id?: string
          linen_notes?: string | null
          maintenance_issue_found?: string | null
          next_check_in_at?: string | null
          next_reservation_id?: string | null
          notification_history?: Json
          pet_notes?: string | null
          readiness_checklist?: Json
          readiness_verification_status?: string
          scheduled_for?: string | null
          special_notes?: string | null
          status?: string
          supplies_needed?: string | null
          supply_notes?: string | null
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_departing_reservation_id_fkey"
            columns: ["departing_reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_next_reservation_id_fkey"
            columns: ["next_reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          access_notes: string | null
          active: boolean
          check_in: string
          check_out: string | null
          communication_notes: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          id: string
          is_current: boolean
          monthly_rate: number
          name: string
          notes: string | null
          pet_information: string | null
          phone: string | null
          record_type: string
          security_deposit: number
          security_deposit_paid: boolean
          source: Database["public"]["Enums"]["booking_source"]
          unit_id: string
          updated_at: string
          vehicle_notes: string | null
        }
        Insert: {
          access_notes?: string | null
          active?: boolean
          check_in: string
          check_out?: string | null
          communication_notes?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          id?: string
          is_current?: boolean
          monthly_rate?: number
          name: string
          notes?: string | null
          pet_information?: string | null
          phone?: string | null
          record_type?: string
          security_deposit?: number
          security_deposit_paid?: boolean
          source?: Database["public"]["Enums"]["booking_source"]
          unit_id: string
          updated_at?: string
          vehicle_notes?: string | null
        }
        Update: {
          access_notes?: string | null
          active?: boolean
          check_in?: string
          check_out?: string | null
          communication_notes?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          id?: string
          is_current?: boolean
          monthly_rate?: number
          name?: string
          notes?: string | null
          pet_information?: string | null
          phone?: string | null
          record_type?: string
          security_deposit?: number
          security_deposit_paid?: boolean
          source?: Database["public"]["Enums"]["booking_source"]
          unit_id?: string
          updated_at?: string
          vehicle_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          completed_at: string | null
          confidence: string
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          error_report: Json
          id: string
          preview: Json
          source_format: string
          source_name: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          confidence?: string
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          error_report?: Json
          id?: string
          preview?: Json
          source_format: string
          source_name: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          confidence?: string
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          error_report?: Json
          id?: string
          preview?: Json
          source_format?: string
          source_name?: string
          status?: string
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          approval_required: boolean
          approval_status: string
          assigned_to_email: string | null
          assigned_to_name: string | null
          assigned_to_user_id: string | null
          category: string | null
          closed_at: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_photo_urls: string[]
          created_at: string
          description: string | null
          emergency: boolean
          estimated_cost: number | null
          id: string
          notes: string | null
          photo_url: string | null
          photo_urls: string[]
          priority: string
          priority_urgent: boolean
          reported_at: string
          reporter_name: string | null
          reservation_id: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          tally_event_id: string | null
          title: string
          troubleshooting_performed: string | null
          unit_id: string
          updated_at: string
          vendor_contacted_at: string | null
          vendor_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actual_cost?: number | null
          approval_required?: boolean
          approval_status?: string
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          category?: string | null
          closed_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_photo_urls?: string[]
          created_at?: string
          description?: string | null
          emergency?: boolean
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          photo_urls?: string[]
          priority?: string
          priority_urgent?: boolean
          reported_at?: string
          reporter_name?: string | null
          reservation_id?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          tally_event_id?: string | null
          title: string
          troubleshooting_performed?: string | null
          unit_id: string
          updated_at?: string
          vendor_contacted_at?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_cost?: number | null
          approval_required?: boolean
          approval_status?: string
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          category?: string | null
          closed_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_photo_urls?: string[]
          created_at?: string
          description?: string | null
          emergency?: boolean
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          photo_urls?: string[]
          priority?: string
          priority_urgent?: boolean
          reported_at?: string
          reporter_name?: string | null
          reservation_id?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          tally_event_id?: string | null
          title?: string
          troubleshooting_performed?: string | null
          unit_id?: string
          updated_at?: string
          vendor_contacted_at?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_updates: {
        Row: {
          author_name: string | null
          author_user_id: string | null
          created_at: string
          id: string
          note: string | null
          photo_urls: string[]
          request_id: string
          status_from: Database["public"]["Enums"]["maintenance_status"] | null
          status_to: Database["public"]["Enums"]["maintenance_status"] | null
        }
        Insert: {
          author_name?: string | null
          author_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          photo_urls?: string[]
          request_id: string
          status_from?: Database["public"]["Enums"]["maintenance_status"] | null
          status_to?: Database["public"]["Enums"]["maintenance_status"] | null
        }
        Update: {
          author_name?: string | null
          author_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          photo_urls?: string[]
          request_id?: string
          status_from?: Database["public"]["Enums"]["maintenance_status"] | null
          status_to?: Database["public"]["Enums"]["maintenance_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_updates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      management_fees: {
        Row: {
          created_at: string
          fee_amount: number
          fee_percentage: number
          gross_collected: number
          id: string
          month: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_amount?: number
          fee_percentage?: number
          gross_collected?: number
          id?: string
          month: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_amount?: number
          fee_percentage?: number
          gross_collected?: number
          id?: string
          month?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          delivery_status: string
          event_type: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          payload: Json
          recipient_address: string | null
          recipient_user_id: string | null
          related_record_id: string | null
          related_record_type: string | null
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          template_key: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          delivery_status?: string
          event_type: string
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          payload?: Json
          recipient_address?: string | null
          recipient_user_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          template_key: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          delivery_status?: string
          event_type?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json
          recipient_address?: string | null
          recipient_user_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      operational_tasks: {
        Row: {
          approval_required: boolean
          assigned_user_id: string | null
          attachment_urls: string[]
          cleaning_task_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          guest_id: string | null
          id: string
          maintenance_request_id: string | null
          notes: string | null
          priority: string
          reservation_id: string | null
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          assigned_user_id?: string | null
          attachment_urls?: string[]
          cleaning_task_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          guest_id?: string | null
          id?: string
          maintenance_request_id?: string | null
          notes?: string | null
          priority?: string
          reservation_id?: string | null
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          assigned_user_id?: string | null
          attachment_urls?: string[]
          cleaning_task_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          guest_id?: string | null
          id?: string
          maintenance_request_id?: string | null
          notes?: string | null
          priority?: string
          reservation_id?: string | null
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_tasks_cleaning_task_id_fkey"
            columns: ["cleaning_task_id"]
            isOneToOne: false
            referencedRelation: "cleaning_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_tasks_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_tasks_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_tasks_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_tasks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          other_description: string | null
          payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          other_description?: string | null
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          other_description?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          due_date: string | null
          guest_id: string
          id: string
          needs_method_review: boolean
          note: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_method_other: string | null
          status: Database["public"]["Enums"]["payment_status"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          due_date?: string | null
          guest_id: string
          id?: string
          needs_method_review?: boolean
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_method_other?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          due_date?: string | null
          guest_id?: string
          id?: string
          needs_method_review?: boolean
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_method_other?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          access_instructions_status: string
          arrival_instructions_status: string
          booking_source: string
          booking_source_url: string | null
          check_in_date: string
          check_in_time: string
          check_out_date: string | null
          check_out_time: string
          cleaning_notes: string | null
          created_at: string
          created_by: string | null
          data_confidence: string
          deposit_status: string
          external_reservation_id: string | null
          guest_communication_status: string
          guest_count: number | null
          guest_id: string
          id: string
          last_synchronized_at: string | null
          overlap_override: boolean
          overlap_override_reason: string | null
          payment_status: string
          pet_information: string | null
          rate: number | null
          readiness_verified: boolean
          responsible_user_id: string | null
          source_system: string
          special_notes: string | null
          status: string
          total_amount: number | null
          unit_id: string
          updated_at: string
          updated_by: string | null
          vehicle_information: string | null
        }
        Insert: {
          access_instructions_status?: string
          arrival_instructions_status?: string
          booking_source?: string
          booking_source_url?: string | null
          check_in_date: string
          check_in_time?: string
          check_out_date?: string | null
          check_out_time?: string
          cleaning_notes?: string | null
          created_at?: string
          created_by?: string | null
          data_confidence?: string
          deposit_status?: string
          external_reservation_id?: string | null
          guest_communication_status?: string
          guest_count?: number | null
          guest_id: string
          id?: string
          last_synchronized_at?: string | null
          overlap_override?: boolean
          overlap_override_reason?: string | null
          payment_status?: string
          pet_information?: string | null
          rate?: number | null
          readiness_verified?: boolean
          responsible_user_id?: string | null
          source_system?: string
          special_notes?: string | null
          status?: string
          total_amount?: number | null
          unit_id: string
          updated_at?: string
          updated_by?: string | null
          vehicle_information?: string | null
        }
        Update: {
          access_instructions_status?: string
          arrival_instructions_status?: string
          booking_source?: string
          booking_source_url?: string | null
          check_in_date?: string
          check_in_time?: string
          check_out_date?: string | null
          check_out_time?: string
          cleaning_notes?: string | null
          created_at?: string
          created_by?: string | null
          data_confidence?: string
          deposit_status?: string
          external_reservation_id?: string | null
          guest_communication_status?: string
          guest_count?: number | null
          guest_id?: string
          id?: string
          last_synchronized_at?: string | null
          overlap_override?: boolean
          overlap_override_reason?: string | null
          payment_status?: string
          pet_information?: string | null
          rate?: number | null
          readiness_verified?: boolean
          responsible_user_id?: string | null
          source_system?: string
          special_notes?: string | null
          status?: string
          total_amount?: number | null
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_information?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_targets: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          monthly_target: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          monthly_target: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          monthly_target?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_targets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bathroom_count: number | null
          bed_configuration: string | null
          bedroom_count: number | null
          cleaning_notes: string | null
          created_at: string
          entry_secret_reference: string | null
          furnishing_status: string | null
          general_notes: string | null
          id: string
          known_quirks: string | null
          label: string | null
          listing_links: Json
          maintenance_notes: string | null
          maximum_occupancy: number | null
          name: string
          operational_status: string
          parking_notes: string | null
          photo_album_url: string | null
          sort_order: number
          status: Database["public"]["Enums"]["unit_status"]
          status_override_reason: string | null
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
          updated_by: string | null
          wifi_secret_reference: string | null
        }
        Insert: {
          bathroom_count?: number | null
          bed_configuration?: string | null
          bedroom_count?: number | null
          cleaning_notes?: string | null
          created_at?: string
          entry_secret_reference?: string | null
          furnishing_status?: string | null
          general_notes?: string | null
          id?: string
          known_quirks?: string | null
          label?: string | null
          listing_links?: Json
          maintenance_notes?: string | null
          maximum_occupancy?: number | null
          name: string
          operational_status?: string
          parking_notes?: string | null
          photo_album_url?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["unit_status"]
          status_override_reason?: string | null
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          updated_by?: string | null
          wifi_secret_reference?: string | null
        }
        Update: {
          bathroom_count?: number | null
          bed_configuration?: string | null
          bedroom_count?: number | null
          cleaning_notes?: string | null
          created_at?: string
          entry_secret_reference?: string | null
          furnishing_status?: string | null
          general_notes?: string | null
          id?: string
          known_quirks?: string | null
          label?: string | null
          listing_links?: Json
          maintenance_notes?: string | null
          maximum_occupancy?: number | null
          name?: string
          operational_status?: string
          parking_notes?: string | null
          photo_album_url?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["unit_status"]
          status_override_reason?: string | null
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          updated_by?: string | null
          wifi_secret_reference?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          active: boolean
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          active: boolean
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          emergency_availability: boolean
          id: string
          insurance_licensing_notes: string | null
          known_units: string | null
          last_used_date: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_contact_method: string
          quickbooks_vendor_reference: string | null
          service_area: string | null
          trade: string
          typical_pricing_notes: string | null
          typical_response_time: string | null
          updated_at: string
          vendor_rank: string
        }
        Insert: {
          active?: boolean
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_availability?: boolean
          id?: string
          insurance_licensing_notes?: string | null
          known_units?: string | null
          last_used_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string
          quickbooks_vendor_reference?: string | null
          service_area?: string | null
          trade: string
          typical_pricing_notes?: string | null
          typical_response_time?: string | null
          updated_at?: string
          vendor_rank?: string
        }
        Update: {
          active?: boolean
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_availability?: boolean
          id?: string
          insurance_licensing_notes?: string | null
          known_units?: string | null
          last_used_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string
          quickbooks_vendor_reference?: string | null
          service_area?: string | null
          trade?: string
          typical_pricing_notes?: string | null
          typical_response_time?: string | null
          updated_at?: string
          vendor_rank?: string
        }
        Relationships: []
      }
      webhook_payload_log: {
        Row: {
          error_text: string | null
          id: string
          processed_status: string
          raw_payload: Json | null
          received_at: string
          related_request_id: string | null
          source: string
        }
        Insert: {
          error_text?: string | null
          id?: string
          processed_status: string
          raw_payload?: Json | null
          received_at?: string
          related_request_id?: string | null
          source?: string
        }
        Update: {
          error_text?: string | null
          id?: string
          processed_status?: string
          raw_payload?: Json | null
          received_at?: string
          related_request_id?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_admin_if_first: { Args: never; Returns: boolean }
      create_reservation_with_guest: {
        Args: {
          _booking_source: string
          _check_in_date: string
          _check_in_time?: string
          _check_out_date: string
          _check_out_time?: string
          _guest_email: string
          _guest_name: string
          _guest_phone: string
          _special_notes?: string
          _unit_id: string
        }
        Returns: string
      }
      decide_approval_request: {
        Args: {
          _approval_request_id: string
          _decision: string
          _decision_reason?: string
        }
        Returns: boolean
      }
      has_any_role: { Args: { _roles: string[] }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_pending_roles_for_current_user: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "maintenance" | "property_manager" | "cleaner"
      booking_request_status: "pending" | "approved" | "declined"
      booking_source:
        | "airbnb"
        | "furnished_finder"
        | "direct"
        | "long_term"
        | "lease"
        | "other"
        | "vrbo"
        | "extension"
      maintenance_status:
        | "new"
        | "in_progress"
        | "done"
        | "archived"
        | "assigned"
        | "waiting_on_tenant"
        | "waiting_on_parts"
        | "completed"
        | "closed_verified"
      payment_method:
        | "airbnb"
        | "stripe"
        | "square"
        | "venmo"
        | "paypal"
        | "zelle"
        | "cash"
        | "check"
        | "ach"
        | "credit_card"
        | "other"
      payment_status: "paid" | "pending" | "overdue" | "upcoming"
      unit_status: "occupied" | "vacant" | "rented" | "planning" | "storage"
      unit_type: "1br" | "2br" | "cottage"
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
      app_role: ["admin", "maintenance", "property_manager", "cleaner"],
      booking_request_status: ["pending", "approved", "declined"],
      booking_source: [
        "airbnb",
        "furnished_finder",
        "direct",
        "long_term",
        "lease",
        "other",
        "vrbo",
        "extension",
      ],
      maintenance_status: [
        "new",
        "in_progress",
        "done",
        "archived",
        "assigned",
        "waiting_on_tenant",
        "waiting_on_parts",
        "completed",
        "closed_verified",
      ],
      payment_method: [
        "airbnb",
        "stripe",
        "square",
        "venmo",
        "paypal",
        "zelle",
        "cash",
        "check",
        "ach",
        "credit_card",
        "other",
      ],
      payment_status: ["paid", "pending", "overdue", "upcoming"],
      unit_status: ["occupied", "vacant", "rented", "planning", "storage"],
      unit_type: ["1br", "2br", "cottage"],
    },
  },
} as const
