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
      account_holders: {
        Row: {
          balance: number
          closed_at: string | null
          continuing_learning:
            | Database["public"]["Enums"]["continuing_learning_status"]
            | null
          created_at: string
          date_of_birth: string
          education_level: Database["public"]["Enums"]["education_level"] | null
          email: string
          id: string
          in_school: Database["public"]["Enums"]["in_school_status"]
          mailing_address: string | null
          name: string
          nric: string
          phone: string | null
          residential_address: string | null
          residential_status: Database["public"]["Enums"]["residential_status"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          balance?: number
          closed_at?: string | null
          continuing_learning?:
            | Database["public"]["Enums"]["continuing_learning_status"]
            | null
          created_at?: string
          date_of_birth: string
          education_level?:
            | Database["public"]["Enums"]["education_level"]
            | null
          email: string
          id?: string
          in_school?: Database["public"]["Enums"]["in_school_status"]
          mailing_address?: string | null
          name: string
          nric: string
          phone?: string | null
          residential_address?: string | null
          residential_status?: Database["public"]["Enums"]["residential_status"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          balance?: number
          closed_at?: string | null
          continuing_learning?:
            | Database["public"]["Enums"]["continuing_learning_status"]
            | null
          created_at?: string
          date_of_birth?: string
          education_level?:
            | Database["public"]["Enums"]["education_level"]
            | null
          email?: string
          id?: string
          in_school?: Database["public"]["Enums"]["in_school_status"]
          mailing_address?: string | null
          name?: string
          nric?: string
          phone?: string | null
          residential_address?: string | null
          residential_status?: Database["public"]["Enums"]["residential_status"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      course_charges: {
        Row: {
          account_id: string
          amount: number
          amount_paid: number
          course_id: string
          course_name: string
          created_at: string
          due_date: string
          id: string
          paid_date: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["charge_status"]
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          amount_paid?: number
          course_id: string
          course_name: string
          created_at?: string
          due_date: string
          id?: string
          paid_date?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          amount_paid?: number
          course_id?: string
          course_name?: string
          created_at?: string
          due_date?: string
          id?: string
          paid_date?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_charges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_holders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_charges_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          course_run_end: string | null
          course_run_start: string | null
          created_at: string
          description: string | null
          fee: number
          id: string
          intake_size: number | null
          main_location: string | null
          mode_of_training: string | null
          name: string
          provider: string
          register_by: string | null
          status: Database["public"]["Enums"]["course_status"]
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          course_run_end?: string | null
          course_run_start?: string | null
          created_at?: string
          description?: string | null
          fee: number
          id?: string
          intake_size?: number | null
          main_location?: string | null
          mode_of_training?: string | null
          name: string
          provider: string
          register_by?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          course_run_end?: string | null
          course_run_start?: string | null
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          intake_size?: number | null
          main_location?: string | null
          mode_of_training?: string | null
          name?: string
          provider?: string
          register_by?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          account_id: string
          course_id: string
          created_at: string
          enrollment_date: string
          id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
        }
        Insert: {
          account_id: string
          course_id: string
          created_at?: string
          enrollment_date?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          course_id?: string
          created_at?: string
          enrollment_date?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_holders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      page_layouts: {
        Row: {
          created_at: string
          id: string
          layout: Json
          page_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: Json
          page_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          page_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      top_up_rules: {
        Row: {
          amount: number
          continuing_learning:
            | Database["public"]["Enums"]["continuing_learning_status"]
            | null
          created_at: string
          education_level: Database["public"]["Enums"]["education_level"] | null
          id: string
          in_school: Database["public"]["Enums"]["in_school_status"] | null
          max_age: number | null
          max_balance: number | null
          min_age: number | null
          min_balance: number | null
          name: string
          status: Database["public"]["Enums"]["rule_status"]
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          amount: number
          continuing_learning?:
            | Database["public"]["Enums"]["continuing_learning_status"]
            | null
          created_at?: string
          education_level?:
            | Database["public"]["Enums"]["education_level"]
            | null
          id?: string
          in_school?: Database["public"]["Enums"]["in_school_status"] | null
          max_age?: number | null
          max_balance?: number | null
          min_age?: number | null
          min_balance?: number | null
          name: string
          status?: Database["public"]["Enums"]["rule_status"]
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          amount?: number
          continuing_learning?:
            | Database["public"]["Enums"]["continuing_learning_status"]
            | null
          created_at?: string
          education_level?:
            | Database["public"]["Enums"]["education_level"]
            | null
          id?: string
          in_school?: Database["public"]["Enums"]["in_school_status"] | null
          max_age?: number | null
          max_balance?: number | null
          min_age?: number | null
          min_balance?: number | null
          name?: string
          status?: Database["public"]["Enums"]["rule_status"]
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      top_up_schedules: {
        Row: {
          account_id: string | null
          account_name: string | null
          amount: number
          created_at: string
          eligible_count: number | null
          executed_date: string | null
          id: string
          processed_count: number | null
          remarks: string | null
          rule_id: string | null
          rule_name: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["top_up_schedule_status"]
          type: Database["public"]["Enums"]["top_up_schedule_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          amount: number
          created_at?: string
          eligible_count?: number | null
          executed_date?: string | null
          id?: string
          processed_count?: number | null
          remarks?: string | null
          rule_id?: string | null
          rule_name?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["top_up_schedule_status"]
          type: Database["public"]["Enums"]["top_up_schedule_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          amount?: number
          created_at?: string
          eligible_count?: number | null
          executed_date?: string | null
          id?: string
          processed_count?: number | null
          remarks?: string | null
          rule_id?: string | null
          rule_name?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["top_up_schedule_status"]
          type?: Database["public"]["Enums"]["top_up_schedule_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "top_up_schedules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_holders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "top_up_schedules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "top_up_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          description: string | null
          id: string
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_holders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_status: "active" | "inactive" | "closed" | "pending"
      billing_cycle:
        | "monthly"
        | "quarterly"
        | "biannually"
        | "yearly"
        | "one_time"
      charge_status: "outstanding" | "overdue" | "clear" | "partially_paid"
      continuing_learning_status: "active" | "inactive" | "completed"
      course_status: "active" | "inactive"
      education_level:
        | "primary"
        | "secondary"
        | "post_secondary"
        | "tertiary"
        | "postgraduate"
      enrollment_status: "active" | "completed" | "withdrawn"
      in_school_status: "in_school" | "not_in_school"
      residential_status: "sc" | "spr" | "non_resident"
      rule_status: "active" | "inactive"
      top_up_schedule_status:
        | "scheduled"
        | "processing"
        | "completed"
        | "failed"
      top_up_schedule_type: "batch" | "individual"
      transaction_status: "completed" | "pending" | "failed"
      transaction_type: "top_up" | "course_fee" | "payment" | "refund"
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
      account_status: ["active", "inactive", "closed", "pending"],
      billing_cycle: [
        "monthly",
        "quarterly",
        "biannually",
        "yearly",
        "one_time",
      ],
      charge_status: ["outstanding", "overdue", "clear", "partially_paid"],
      continuing_learning_status: ["active", "inactive", "completed"],
      course_status: ["active", "inactive"],
      education_level: [
        "primary",
        "secondary",
        "post_secondary",
        "tertiary",
        "postgraduate",
      ],
      enrollment_status: ["active", "completed", "withdrawn"],
      in_school_status: ["in_school", "not_in_school"],
      residential_status: ["sc", "spr", "non_resident"],
      rule_status: ["active", "inactive"],
      top_up_schedule_status: [
        "scheduled",
        "processing",
        "completed",
        "failed",
      ],
      top_up_schedule_type: ["batch", "individual"],
      transaction_status: ["completed", "pending", "failed"],
      transaction_type: ["top_up", "course_fee", "payment", "refund"],
    },
  },
} as const
