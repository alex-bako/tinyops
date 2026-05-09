export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      auth_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_source_secrets: {
        Row: {
          created_at: string
          id: string
          masked_value: string
          purpose: string
          replaced_at: string | null
          source_id: string
          updated_at: string
          vault_secret_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          masked_value: string
          purpose: string
          replaced_at?: string | null
          source_id: string
          updated_at?: string
          vault_secret_id: string
        }
        Update: {
          created_at?: string
          id?: string
          masked_value?: string
          purpose?: string
          replaced_at?: string | null
          source_id?: string
          updated_at?: string
          vault_secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_source_secrets_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_sync_states: {
        Row: {
          created_at: string
          cursor: Json | null
          history_window: string
          id: string
          last_error: string | null
          last_started_at: string | null
          last_synced_at: string | null
          requested_at: string | null
          source_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cursor?: Json | null
          history_window?: string
          id?: string
          last_error?: string | null
          last_started_at?: string | null
          last_synced_at?: string | null
          requested_at?: string | null
          source_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cursor?: Json | null
          history_window?: string
          id?: string
          last_error?: string | null
          last_started_at?: string | null
          last_synced_at?: string | null
          requested_at?: string | null
          source_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_source_sync_states_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          config: Json
          config_version: number
          connected_at: string | null
          created_at: string
          disconnected_at: string | null
          display_name: string
          id: string
          last_verified_at: string | null
          source_type: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          config_version?: number
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          display_name: string
          id?: string
          last_verified_at?: string | null
          source_type: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          config_version?: number
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          display_name?: string
          id?: string
          last_verified_at?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_memberships: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          last_active_at: string | null
          role: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          last_active_at?: string | null
          role: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          last_active_at?: string | null
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          accent: string
          archived_at: string | null
          auto_send_threshold: string
          created_at: string
          created_by: string
          description: string
          exclude_from_outbound: boolean
          handle: string
          icon_kind: string
          icon_letter: string | null
          icon_tone: string
          id: string
          manual_review_keywords: string[]
          name: string
          plan_price: string
          plan_seats: number
          plan_tier: string
          sensitivity_mode: string
          updated_at: string
        }
        Insert: {
          accent?: string
          archived_at?: string | null
          auto_send_threshold?: string
          created_at?: string
          created_by: string
          description?: string
          exclude_from_outbound?: boolean
          handle: string
          icon_kind?: string
          icon_letter?: string | null
          icon_tone?: string
          id?: string
          manual_review_keywords?: string[]
          name: string
          plan_price?: string
          plan_seats?: number
          plan_tier?: string
          sensitivity_mode?: string
          updated_at?: string
        }
        Update: {
          accent?: string
          archived_at?: string | null
          auto_send_threshold?: string
          created_at?: string
          created_by?: string
          description?: string
          exclude_from_outbound?: boolean
          handle?: string
          icon_kind?: string
          icon_letter?: string | null
          icon_tone?: string
          id?: string
          manual_review_keywords?: string[]
          name?: string
          plan_price?: string
          plan_seats?: number
          plan_tier?: string
          sensitivity_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invitation: {
        Args: { target_invitation_id: string }
        Returns: string
      }
      archive_workspace: {
        Args: { target_workspace_id: string }
        Returns: undefined
      }
      connect_imap_data_source: {
        Args: {
          imap_encryption: string
          imap_history_window: string
          imap_host: string
          imap_password: string
          imap_port: number
          imap_skip_senders: string[]
          imap_username: string
          imap_watched_folders: string[]
          target_workspace_id: string
        }
        Returns: string
      }
      create_personal_workspace: {
        Args: {
          actor_email: string
          workspace_handle: string
          workspace_name: string
        }
        Returns: string
      }
      create_workspace_invitation: {
        Args: {
          target_email: string
          target_role: string
          target_workspace_id: string
        }
        Returns: Json
      }
      disconnect_data_source: {
        Args: { target_source_id: string; target_workspace_id: string }
        Returns: undefined
      }
      enforce_invited_user: { Args: { event: Json }; Returns: Json }
      request_data_source_sync: {
        Args: { target_source_id: string; target_workspace_id: string }
        Returns: undefined
      }
      revoke_workspace_invitation: {
        Args: { target_invitation_id: string }
        Returns: undefined
      }
      update_imap_data_source_config: {
        Args: {
          imap_encryption: string
          imap_history_window: string
          imap_host: string
          imap_port: number
          imap_skip_senders: string[]
          imap_username: string
          imap_watched_folders: string[]
          target_source_id: string
          target_workspace_id: string
        }
        Returns: undefined
      }
      workspace_actor_role: {
        Args: { target_workspace_id: string }
        Returns: string
      }
      workspace_creator_id: {
        Args: { target_workspace_id: string }
        Returns: string
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
