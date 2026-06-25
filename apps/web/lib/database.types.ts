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
      client_ask_turns: {
        Row: {
          answer: Json
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          question: string
          workspace_id: string
        }
        Insert: {
          answer: Json
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          question: string
          workspace_id: string
        }
        Update: {
          answer?: Json
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          question?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_ask_turns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ask_turns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ask_turns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_attributes: {
        Row: {
          attribute_key: string
          attribute_value: Json
          client_id: string
          confidence: number
          created_at: string
          id: string
          raw_record_id: string | null
          source_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attribute_key: string
          attribute_value: Json
          client_id: string
          confidence?: number
          created_at?: string
          id?: string
          raw_record_id?: string | null
          source_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attribute_key?: string
          attribute_value?: Json
          client_id?: string
          confidence?: number
          created_at?: string
          id?: string
          raw_record_id?: string | null
          source_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_attributes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_attributes_raw_record_id_fkey"
            columns: ["raw_record_id"]
            isOneToOne: false
            referencedRelation: "raw_source_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_attributes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_attributes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_domain_events: {
        Row: {
          client_id: string | null
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          source_id: string | null
          workspace_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          source_id?: string | null
          workspace_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          source_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_domain_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_domain_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_domain_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_identities: {
        Row: {
          client_id: string
          created_at: string
          id: string
          identity_type: string
          identity_value: string
          normalized_value: string
          source_id: string | null
          verified: boolean
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          identity_type: string
          identity_value: string
          normalized_value: string
          source_id?: string | null
          verified?: boolean
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          identity_type?: string
          identity_value?: string
          normalized_value?: string
          source_id?: string | null
          verified?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_identities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_identities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_identities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_properties: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          icon: string
          id: string
          name: string
          position: number
          type: string
          updated_at: string
          value: Json
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          icon: string
          id?: string
          name: string
          position?: number
          type: string
          updated_at?: string
          value?: Json
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          name?: string
          position?: number
          type?: string
          updated_at?: string
          value?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_properties_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          consent_status: string
          created_at: string
          display_name: string
          do_not_contact: boolean
          first_seen_at: string | null
          id: string
          last_contacted_at: string | null
          last_seen_at: string | null
          primary_email: string
          sensitivity_level: number
          slug: string
          status: string
          tags: string[]
          unsubscribe_status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          consent_status?: string
          created_at?: string
          display_name?: string
          do_not_contact?: boolean
          first_seen_at?: string | null
          id?: string
          last_contacted_at?: string | null
          last_seen_at?: string | null
          primary_email: string
          sensitivity_level?: number
          slug: string
          status?: string
          tags?: string[]
          unsubscribe_status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          consent_status?: string
          created_at?: string
          display_name?: string
          do_not_contact?: boolean
          first_seen_at?: string | null
          id?: string
          last_contacted_at?: string | null
          last_seen_at?: string | null
          primary_email?: string
          sensitivity_level?: number
          slug?: string
          status?: string
          tags?: string[]
          unsubscribe_status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_intake_configs: {
        Row: {
          available_folders: Json
          created_at: string
          history_window: string
          id: string
          message_filters: Json
          skip_senders: string[]
          source_id: string
          updated_at: string
          watched_folders: string[]
        }
        Insert: {
          available_folders?: Json
          created_at?: string
          history_window?: string
          id?: string
          message_filters?: Json
          skip_senders?: string[]
          source_id: string
          updated_at?: string
          watched_folders?: string[]
        }
        Update: {
          available_folders?: Json
          created_at?: string
          history_window?: string
          id?: string
          message_filters?: Json
          skip_senders?: string[]
          source_id?: string
          updated_at?: string
          watched_folders?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "data_source_intake_configs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
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
      data_source_sync_runs: {
        Row: {
          cause_message: string | null
          created_at: string
          cursor: Json | null
          diagnostics: Json | null
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          persisted_counts: Json | null
          source_id: string
          started_at: string
          status: string
          trigger: string
          updated_at: string
          worker_id: string | null
          workspace_id: string
        }
        Insert: {
          cause_message?: string | null
          created_at?: string
          cursor?: Json | null
          diagnostics?: Json | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          persisted_counts?: Json | null
          source_id: string
          started_at?: string
          status: string
          trigger: string
          updated_at?: string
          worker_id?: string | null
          workspace_id: string
        }
        Update: {
          cause_message?: string | null
          created_at?: string
          cursor?: Json | null
          diagnostics?: Json | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          persisted_counts?: Json | null
          source_id?: string
          started_at?: string
          status?: string
          trigger?: string
          updated_at?: string
          worker_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_source_sync_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_source_sync_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_sync_states: {
        Row: {
          created_at: string
          cursor: Json | null
          id: string
          last_error: string | null
          last_started_at: string | null
          last_synced_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          lease_token: string | null
          requested_at: string | null
          source_id: string
          status: string
          sync_error_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cursor?: Json | null
          id?: string
          last_error?: string | null
          last_started_at?: string | null
          last_synced_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          lease_token?: string | null
          requested_at?: string | null
          source_id: string
          status?: string
          sync_error_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cursor?: Json | null
          id?: string
          last_error?: string | null
          last_started_at?: string | null
          last_synced_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          lease_token?: string | null
          requested_at?: string | null
          source_id?: string
          status?: string
          sync_error_count?: number
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
          slug: string
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
          slug: string
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
          slug?: string
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
      google_forms_csv_rows: {
        Row: {
          created_at: string
          id: string
          payload: Json
          response_key: string
          row_number: number
          source_id: string
          upload_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          response_key: string
          row_number: number
          source_id: string
          upload_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          response_key?: string
          row_number?: number
          source_id?: string
          upload_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_forms_csv_rows_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_forms_csv_rows_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "google_forms_csv_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_forms_csv_rows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_forms_csv_uploads: {
        Row: {
          created_at: string
          file_name: string
          id: string
          row_count: number
          source_id: string
          updated_at: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          row_count?: number
          source_id: string
          updated_at?: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          row_count?: number
          source_id?: string
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_forms_csv_uploads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_forms_csv_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_forms_csv_uploads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          onboarded_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          onboarded_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarded_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      raw_source_records: {
        Row: {
          body_text: string
          content_hash: string
          created_at: string
          external_id: string
          id: string
          ingested_at: string
          processed_at: string | null
          processing_status: string
          raw_payload: Json
          record_type: string
          source_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body_text?: string
          content_hash: string
          created_at?: string
          external_id: string
          id?: string
          ingested_at?: string
          processed_at?: string | null
          processing_status?: string
          raw_payload?: Json
          record_type: string
          source_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body_text?: string
          content_hash?: string
          created_at?: string
          external_id?: string
          id?: string
          ingested_at?: string
          processed_at?: string | null
          processing_status?: string
          raw_payload?: Json
          record_type?: string
          source_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_source_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_source_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          ai_extracted_fields: Json
          body: Json
          client_id: string
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          metadata: Json
          parent_event_id: string | null
          participants: Json
          raw_record_id: string | null
          sensitivity_level: number
          source_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_extracted_fields?: Json
          body?: Json
          client_id: string
          created_at?: string
          created_by?: string | null
          event_date: string
          event_type: string
          id?: string
          metadata?: Json
          parent_event_id?: string | null
          participants?: Json
          raw_record_id?: string | null
          sensitivity_level?: number
          source_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_extracted_fields?: Json
          body?: Json
          client_id?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          metadata?: Json
          parent_event_id?: string | null
          participants?: Json
          raw_record_id?: string | null
          sensitivity_level?: number
          source_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_raw_record_id_fkey"
            columns: ["raw_record_id"]
            isOneToOne: false
            referencedRelation: "raw_source_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_workspace_id_fkey"
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
          default_sender_name: string
          description: string
          exclude_from_outbound: boolean
          handle: string
          icon_kind: string
          icon_letter: string | null
          icon_tone: string
          id: string
          initial_source_intent: string
          manual_review_keywords: string[]
          name: string
          plan_price: string
          plan_seats: number
          plan_tier: string
          sensitivity_mode: string
          updated_at: string
          vertical: string
        }
        Insert: {
          accent?: string
          archived_at?: string | null
          auto_send_threshold?: string
          created_at?: string
          created_by: string
          default_sender_name?: string
          description?: string
          exclude_from_outbound?: boolean
          handle: string
          icon_kind?: string
          icon_letter?: string | null
          icon_tone?: string
          id?: string
          initial_source_intent?: string
          manual_review_keywords?: string[]
          name: string
          plan_price?: string
          plan_seats?: number
          plan_tier?: string
          sensitivity_mode?: string
          updated_at?: string
          vertical?: string
        }
        Update: {
          accent?: string
          archived_at?: string | null
          auto_send_threshold?: string
          created_at?: string
          created_by?: string
          default_sender_name?: string
          description?: string
          exclude_from_outbound?: boolean
          handle?: string
          icon_kind?: string
          icon_letter?: string | null
          icon_tone?: string
          id?: string
          initial_source_intent?: string
          manual_review_keywords?: string[]
          name?: string
          plan_price?: string
          plan_seats?: number
          plan_tier?: string
          sensitivity_mode?: string
          updated_at?: string
          vertical?: string
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
      claim_next_data_source_sync: {
        Args: { lease_seconds?: number; worker_id: string }
        Returns: {
          lease_token: string
          source_id: string
          source_type: string
          workspace_id: string
        }[]
      }
      complete_data_source_sync: {
        Args: {
          has_more?: boolean
          lease_token: string
          next_cursor: Json
          target_source_id: string
        }
        Returns: undefined
      }
      complete_onboarding: {
        Args: {
          actor_email: string
          invite_emails: string[]
          invite_roles: string[]
          profile_first_name: string
          profile_last_name: string
          profile_onboarded_at: string
          workspace_accent: string
          workspace_auto_send_threshold: string
          workspace_default_sender_name: string
          workspace_exclude_from_outbound: boolean
          workspace_handle: string
          workspace_icon_kind: string
          workspace_icon_letter: string
          workspace_icon_tone: string
          workspace_initial_source_intent: string
          workspace_manual_review_keywords: string[]
          workspace_name: string
          workspace_sensitivity_mode: string
          workspace_vertical: string
        }
        Returns: string
      }
      connect_google_forms_manual_csv_data_source: {
        Args: {
          form_connection_mode: string
          form_display_name: string
          form_external_id: string
          form_mapping: Json
          target_workspace_id: string
          upload_file_name: string
          upload_rows: Json
        }
        Returns: string
      }
      connect_imap_data_source: {
        Args: {
          imap_available_folders: Json
          imap_display_name: string
          imap_encryption: string
          imap_history_window: string
          imap_host: string
          imap_message_filters: Json
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
      data_source_slug_from_name: { Args: { value: string }; Returns: string }
      deploy_health_check: { Args: never; Returns: boolean }
      disconnect_data_source: {
        Args: { target_source_id: string; target_workspace_id: string }
        Returns: undefined
      }
      enforce_invited_user: { Args: { event: Json }; Returns: Json }
      enqueue_due_data_source_syncs: { Args: never; Returns: number }
      fail_data_source_sync: {
        Args: {
          lease_token: string
          sync_error: string
          target_source_id: string
        }
        Returns: undefined
      }
      google_forms_csv_response_email: {
        Args: { value: string }
        Returns: string
      }
      google_forms_csv_response_key: {
        Args: { form_external_id: string; mapping: Json; payload: Json }
        Returns: string
      }
      google_forms_csv_response_timestamp: {
        Args: { value: string }
        Returns: string
      }
      ingest_client_connector_records: {
        Args: { normalized_records: Json }
        Returns: Json
      }
      is_valid_google_forms_csv_mapping: {
        Args: { mapping: Json }
        Returns: boolean
      }
      is_valid_google_forms_csv_upload_rows: {
        Args: { mapping: Json; rows: Json }
        Returns: boolean
      }
      is_valid_imap_message_filters: {
        Args: { filters: Json }
        Returns: boolean
      }
      is_valid_timeline_event_body: { Args: { value: Json }; Returns: boolean }
      mask_secret_tail: { Args: { value: string }; Returns: string }
      normalize_data_source_display_name: {
        Args: { value: string }
        Returns: string
      }
      normalized_text_array: {
        Args: { fallback: string[]; input_values: string[] }
        Returns: string[]
      }
      read_imap_data_source_password: {
        Args: { target_source_id: string; target_workspace_id: string }
        Returns: string
      }
      read_imap_thread_message_ids: {
        Args: { target_source_id: string; target_workspace_id: string }
        Returns: string[]
      }
      request_all_data_source_syncs: {
        Args: { target_workspace_id: string }
        Returns: number
      }
      request_data_source_sync: {
        Args: { target_source_id: string; target_workspace_id: string }
        Returns: undefined
      }
      require_data_source_slug: {
        Args: { display_name: string }
        Returns: string
      }
      require_unique_data_source_name: {
        Args: {
          ignored_source_id: string
          normalized_display_name: string
          normalized_slug: string
          target_source_type: string
          target_workspace_id: string
        }
        Returns: undefined
      }
      require_unique_google_forms_source_config: {
        Args: {
          ignored_source_id: string
          normalized_form_id: string
          target_connection_mode: string
          target_workspace_id: string
        }
        Returns: undefined
      }
      require_unique_imap_source_config: {
        Args: {
          ignored_source_id: string
          normalized_host: string
          normalized_username: string
          target_encryption: string
          target_port: number
          target_workspace_id: string
        }
        Returns: undefined
      }
      revoke_workspace_invitation: {
        Args: { target_invitation_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify_client_name: { Args: { value: string }; Returns: string }
      update_google_forms_manual_csv_data_source: {
        Args: {
          form_display_name: string
          form_mapping: Json
          target_source_id: string
          target_workspace_id: string
          upload_file_name: string
          upload_rows: Json
        }
        Returns: undefined
      }
      update_imap_connection_settings: {
        Args: {
          imap_available_folders: Json
          imap_display_name: string
          imap_encryption: string
          imap_host: string
          imap_password: string
          imap_port: number
          imap_username: string
          target_source_id: string
          target_workspace_id: string
        }
        Returns: undefined
      }
      update_imap_folder_snapshot: {
        Args: {
          imap_available_folders: Json
          target_source_id: string
          target_workspace_id: string
        }
        Returns: undefined
      }
      update_imap_intake_config: {
        Args: {
          imap_history_window: string
          imap_message_filters: Json
          imap_skip_senders: string[]
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

