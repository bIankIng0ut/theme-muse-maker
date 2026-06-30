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
      access_key_uses: {
        Row: {
          id: string
          ip_hash: string
          key_id: string
          used_at: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_hash: string
          key_id: string
          used_at?: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_hash?: string
          key_id?: string
          used_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_key_uses_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "access_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      access_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key_hash: string
          key_prefix: string
          label: string | null
          last_used_at: string | null
          revoked_at: string | null
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          key_hash: string
          key_prefix: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_steps: {
        Row: {
          created_at: string
          id: string
          investigation_id: string
          note: string | null
          status: string | null
          step_index: number
          tool_input: Json | null
          tool_name: string | null
          tool_output: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          investigation_id: string
          note?: string | null
          status?: string | null
          step_index: number
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          investigation_id?: string
          note?: string | null
          status?: string | null
          step_index?: number
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_steps_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          confidence: string
          created_at: string
          filter_reason: string | null
          id: string
          investigation_id: string
          is_false_positive: boolean
          platform: string | null
          raw_data: Json | null
          screenshot_url: string | null
          tool_name: string
          url: string | null
          username: string | null
        }
        Insert: {
          confidence?: string
          created_at?: string
          filter_reason?: string | null
          id?: string
          investigation_id: string
          is_false_positive?: boolean
          platform?: string | null
          raw_data?: Json | null
          screenshot_url?: string | null
          tool_name: string
          url?: string | null
          username?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string
          filter_reason?: string | null
          id?: string
          investigation_id?: string
          is_false_positive?: boolean
          platform?: string | null
          raw_data?: Json | null
          screenshot_url?: string | null
          tool_name?: string
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      investigations: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          options: Json
          owner_id: string
          status: string
          target: string
          target_type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          options?: Json
          owner_id: string
          status?: string
          target: string
          target_type?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          options?: Json
          owner_id?: string
          status?: string
          target?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          identity_graph: Json
          investigation_id: string
          markdown: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identity_graph?: Json
          investigation_id: string
          markdown: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identity_graph?: Json
          investigation_id?: string
          markdown?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: true
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          discord_id: string | null
          discord_username: string | null
          discord_verified_at: string | null
          nightly_count: number
          nightly_window_start: string
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_id?: string | null
          discord_username?: string | null
          discord_verified_at?: string | null
          nightly_count?: number
          nightly_window_start?: string
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_id?: string | null
          discord_username?: string | null
          discord_verified_at?: string | null
          nightly_count?: number
          nightly_window_start?: string
          plan?: string
          updated_at?: string
          user_id?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
