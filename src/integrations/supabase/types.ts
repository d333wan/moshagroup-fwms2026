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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      field_officers: {
        Row: {
          base_location_id: string | null
          created_at: string
          department: string | null
          notes: string | null
          skills: string[]
          status: Database["public"]["Enums"]["officer_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          base_location_id?: string | null
          created_at?: string
          department?: string | null
          notes?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["officer_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          base_location_id?: string | null
          created_at?: string
          department?: string | null
          notes?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["officer_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_officers_base_location_id_fkey"
            columns: ["base_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_officers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_report_comments: {
        Row: {
          created_at: string
          id: string
          message: string
          report_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          report_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          report_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "field_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_report_comments_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_report_photos: {
        Row: {
          caption: string | null
          capture_source: Database["public"]["Enums"]["field_photo_source"]
          captured_at: string
          created_at: string
          direction_label: string | null
          id: string
          latitude: number | null
          longitude: number | null
          photo_type: Database["public"]["Enums"]["field_photo_type"]
          report_id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          capture_source?: Database["public"]["Enums"]["field_photo_source"]
          captured_at?: string
          created_at?: string
          direction_label?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_type: Database["public"]["Enums"]["field_photo_type"]
          report_id: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          capture_source?: Database["public"]["Enums"]["field_photo_source"]
          captured_at?: string
          created_at?: string
          direction_label?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_type?: Database["public"]["Enums"]["field_photo_type"]
          report_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "field_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      field_reports: {
        Row: {
          assistance_needed: string | null
          created_at: string
          distance_from_target: number | null
          gps_accuracy: number | null
          gps_source: Database["public"]["Enums"]["field_gps_source"]
          has_obstacle: boolean
          id: string
          latitude: number | null
          license_plate: string | null
          longitude: number | null
          obstacle_description: string | null
          officer_id: string
          progress_percent: number
          report_date: string
          report_number: string
          report_time: string
          status: Database["public"]["Enums"]["field_report_status"]
          submitted_at: string | null
          task_id: string
          updated_at: string
          vehicle_change_reason: string | null
          vehicle_type: string | null
          verification_note: string | null
          verified_at: string | null
          verified_by: string | null
          within_radius: boolean | null
          work_description: string | null
          work_status: Database["public"]["Enums"]["field_work_status"]
        }
        Insert: {
          assistance_needed?: string | null
          created_at?: string
          distance_from_target?: number | null
          gps_accuracy?: number | null
          gps_source?: Database["public"]["Enums"]["field_gps_source"]
          has_obstacle?: boolean
          id?: string
          latitude?: number | null
          license_plate?: string | null
          longitude?: number | null
          obstacle_description?: string | null
          officer_id: string
          progress_percent?: number
          report_date?: string
          report_number?: string
          report_time?: string
          status?: Database["public"]["Enums"]["field_report_status"]
          submitted_at?: string | null
          task_id: string
          updated_at?: string
          vehicle_change_reason?: string | null
          vehicle_type?: string | null
          verification_note?: string | null
          verified_at?: string | null
          verified_by?: string | null
          within_radius?: boolean | null
          work_description?: string | null
          work_status?: Database["public"]["Enums"]["field_work_status"]
        }
        Update: {
          assistance_needed?: string | null
          created_at?: string
          distance_from_target?: number | null
          gps_accuracy?: number | null
          gps_source?: Database["public"]["Enums"]["field_gps_source"]
          has_obstacle?: boolean
          id?: string
          latitude?: number | null
          license_plate?: string | null
          longitude?: number | null
          obstacle_description?: string | null
          officer_id?: string
          progress_percent?: number
          report_date?: string
          report_number?: string
          report_time?: string
          status?: Database["public"]["Enums"]["field_report_status"]
          submitted_at?: string | null
          task_id?: string
          updated_at?: string
          vehicle_change_reason?: string | null
          vehicle_type?: string | null
          verification_note?: string | null
          verified_at?: string | null
          verified_by?: string | null
          within_radius?: boolean | null
          work_description?: string | null
          work_status?: Database["public"]["Enums"]["field_work_status"]
        }
        Relationships: [
          {
            foreignKeyName: "field_reports_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          photos: string[]
          pic: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          photos?: string[]
          pic?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          photos?: string[]
          pic?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          employee_id: string | null
          failed_login_attempts: number
          full_name: string | null
          id: string
          is_active: boolean
          job_title: string | null
          last_login_at: string | null
          locked_at: string | null
          must_change_password: boolean
          nik: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          employee_id?: string | null
          failed_login_attempts?: number
          full_name?: string | null
          id: string
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          locked_at?: string | null
          must_change_password?: boolean
          nik?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          employee_id?: string | null
          failed_login_attempts?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          locked_at?: string | null
          must_change_password?: boolean
          nik?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assignee_id: string
          id: string
          task_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assignee_id: string
          id?: string
          task_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assignee_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_report_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime_type: string | null
          report_id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          mime_type?: string | null
          report_id: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          mime_type?: string | null
          report_id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_report_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "task_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reports: {
        Row: {
          checklist: Json
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          narrative: string | null
          report_type: Database["public"]["Enums"]["report_type"]
          reported_at: string
          reported_by: string
          task_id: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          narrative?: string | null
          report_type?: Database["public"]["Enums"]["report_type"]
          reported_at?: string
          reported_by: string
          task_id: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          narrative?: string | null
          report_type?: Database["public"]["Enums"]["report_type"]
          reported_at?: string
          reported_by?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["task_status"] | null
          id: string
          note: string | null
          task_id: string
          to_status: Database["public"]["Enums"]["task_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["task_status"] | null
          id?: string
          note?: string | null
          task_id: string
          to_status: Database["public"]["Enums"]["task_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["task_status"] | null
          id?: string
          note?: string | null
          task_id?: string
          to_status?: Database["public"]["Enums"]["task_status"]
        }
        Relationships: [
          {
            foreignKeyName: "task_status_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string
          default_license_plate: string | null
          default_vehicle_type: string | null
          description: string | null
          due_date: string | null
          emergency_contact_primary: string | null
          emergency_contact_secondary: string | null
          id: string
          location_id: string | null
          location_text: string | null
          photo_direction_mode: Database["public"]["Enums"]["task_photo_direction_mode"]
          priority: Database["public"]["Enums"]["task_priority"]
          radius_meters: number
          status: Database["public"]["Enums"]["task_status"]
          supervisor_company_name: string | null
          supervisor_job_title: string | null
          supervisor_person_name: string | null
          supervisor_phone: string | null
          supervisor_whatsapp: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_license_plate?: string | null
          default_vehicle_type?: string | null
          description?: string | null
          due_date?: string | null
          emergency_contact_primary?: string | null
          emergency_contact_secondary?: string | null
          id?: string
          location_id?: string | null
          location_text?: string | null
          photo_direction_mode?: Database["public"]["Enums"]["task_photo_direction_mode"]
          priority?: Database["public"]["Enums"]["task_priority"]
          radius_meters?: number
          status?: Database["public"]["Enums"]["task_status"]
          supervisor_company_name?: string | null
          supervisor_job_title?: string | null
          supervisor_person_name?: string | null
          supervisor_phone?: string | null
          supervisor_whatsapp?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_license_plate?: string | null
          default_vehicle_type?: string | null
          description?: string | null
          due_date?: string | null
          emergency_contact_primary?: string | null
          emergency_contact_secondary?: string | null
          id?: string
          location_id?: string | null
          location_text?: string | null
          photo_direction_mode?: Database["public"]["Enums"]["task_photo_direction_mode"]
          priority?: Database["public"]["Enums"]["task_priority"]
          radius_meters?: number
          status?: Database["public"]["Enums"]["task_status"]
          supervisor_company_name?: string | null
          supervisor_job_title?: string | null
          supervisor_person_name?: string | null
          supervisor_phone?: string | null
          supervisor_whatsapp?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_account_locked: { Args: { _email: string }; Returns: boolean }
      count_active_super_admins: { Args: never; Returns: number }
      generate_field_report_number: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_tier: { Args: { _user_id: string }; Returns: boolean }
      is_report_owner: {
        Args: { _report_id: string; _user_id: string }
        Returns: boolean
      }
      is_task_assignee: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      is_task_creator: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      list_assignable_users: {
        Args: never
        Returns: {
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      record_failed_login: { Args: { _email: string }; Returns: Json }
      reset_failed_logins: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "petugas_lapangan"
        | "guest"
      attachment_kind: "photo" | "signature" | "document"
      field_gps_source: "device" | "external"
      field_photo_source: "camera" | "gallery" | "upload"
      field_photo_type:
        | "officer_selfie"
        | "location"
        | "location_direction"
        | "physical_condition"
        | "gps_evidence"
        | "vehicle"
        | "obstacle"
      field_report_status:
        | "draft"
        | "submitted"
        | "needs_revision"
        | "approved"
        | "rejected"
      field_work_status:
        | "not_started"
        | "arrived"
        | "in_progress"
        | "delayed"
        | "completed"
      officer_status: "available" | "on_duty" | "off_duty" | "leave"
      report_type: "progress" | "completion" | "issue"
      task_photo_direction_mode: "none" | "single" | "four_way"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "draft"
        | "assigned"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
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
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "petugas_lapangan",
        "guest",
      ],
      attachment_kind: ["photo", "signature", "document"],
      field_gps_source: ["device", "external"],
      field_photo_source: ["camera", "gallery", "upload"],
      field_photo_type: [
        "officer_selfie",
        "location",
        "location_direction",
        "physical_condition",
        "gps_evidence",
        "vehicle",
        "obstacle",
      ],
      field_report_status: [
        "draft",
        "submitted",
        "needs_revision",
        "approved",
        "rejected",
      ],
      field_work_status: [
        "not_started",
        "arrived",
        "in_progress",
        "delayed",
        "completed",
      ],
      officer_status: ["available", "on_duty", "off_duty", "leave"],
      report_type: ["progress", "completion", "issue"],
      task_photo_direction_mode: ["none", "single", "four_way"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "draft",
        "assigned",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
