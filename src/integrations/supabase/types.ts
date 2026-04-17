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
      booking_requests: {
        Row: {
          assigned_unit_id: string | null
          check_in: string
          check_out: string
          created_at: string
          decline_reason: string | null
          email: string
          id: string
          name: string
          notes: string | null
          num_guests: number
          phone: string | null
          preferred_unit_type: Database["public"]["Enums"]["unit_type"] | null
          reviewed_at: string | null
          source: Database["public"]["Enums"]["booking_source"]
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
          id?: string
          name: string
          notes?: string | null
          num_guests?: number
          phone?: string | null
          preferred_unit_type?: Database["public"]["Enums"]["unit_type"] | null
          reviewed_at?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
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
          id?: string
          name?: string
          notes?: string | null
          num_guests?: number
          phone?: string | null
          preferred_unit_type?: Database["public"]["Enums"]["unit_type"] | null
          reviewed_at?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          is_current: boolean
          monthly_rate: number
          name: string
          notes: string | null
          security_deposit: number
          security_deposit_paid: boolean
          source: Database["public"]["Enums"]["booking_source"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          monthly_rate?: number
          name: string
          notes?: string | null
          security_deposit?: number
          security_deposit_paid?: boolean
          source?: Database["public"]["Enums"]["booking_source"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          monthly_rate?: number
          name?: string
          notes?: string | null
          security_deposit?: number
          security_deposit_paid?: boolean
          source?: Database["public"]["Enums"]["booking_source"]
          unit_id?: string
          updated_at?: string
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
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          guest_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["payment_status"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          guest_id: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          guest_id?: string
          id?: string
          note?: string | null
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
          created_at: string
          id: string
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["unit_status"]
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["unit_status"]
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["unit_status"]
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_request_status: "pending" | "approved" | "declined"
      booking_source:
        | "airbnb"
        | "furnished_finder"
        | "direct"
        | "long_term"
        | "lease"
        | "other"
        | "vrbo"
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
      booking_request_status: ["pending", "approved", "declined"],
      booking_source: [
        "airbnb",
        "furnished_finder",
        "direct",
        "long_term",
        "lease",
        "other",
        "vrbo",
      ],
      payment_status: ["paid", "pending", "overdue", "upcoming"],
      unit_status: ["occupied", "vacant", "rented", "planning", "storage"],
      unit_type: ["1br", "2br", "cottage"],
    },
  },
} as const
