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
      patient_portal_tokens: {
        Row: { id: string; organization_id: string; client_id: string; token_hash: string; expires_at: string | null; revoked_at: string | null; created_by: string | null; created_at: string }
        Insert: { id?: string; organization_id: string; client_id: string; token_hash: string; expires_at?: string | null; revoked_at?: string | null; created_by?: string | null; created_at?: string }
        Update: { id?: string; organization_id?: string; client_id?: string; token_hash?: string; expires_at?: string | null; revoked_at?: string | null; created_by?: string | null; created_at?: string }
        Relationships: []
      }
      organization_documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          organization_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          category: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          organization_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          organization_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      acceptance_terms: {
        Row: {
          active: boolean
          content: string
          content_hash: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          published_at: string | null
          slug: string
          summary: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          content: string
          content_hash: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          published_at?: string | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          content?: string
          content_hash?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          published_at?: string | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "acceptance_terms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_payable: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          organization_id: string
          paid_at: string | null
          recurrence: string | null
          status: Database["public"]["Enums"]["account_status"]
          supplier: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          organization_id: string
          paid_at?: string | null
          recurrence?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          supplier?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          organization_id?: string
          paid_at?: string | null
          recurrence?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          installment: string | null
          organization_id: string
          paid_at: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["account_status"]
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          installment?: string | null
          organization_id: string
          paid_at?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["account_status"]
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          installment?: string | null
          organization_id?: string
          paid_at?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["account_status"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_marketing_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          days: number
          formats: string[]
          id: string
          name: string
          objective: string | null
          organization_id: string
          posts_per_day: number
          starts_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days?: number
          formats?: string[]
          id?: string
          name: string
          objective?: string | null
          organization_id: string
          posts_per_day?: number
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days?: number
          formats?: string[]
          id?: string
          name?: string
          objective?: string | null
          organization_id?: string
          posts_per_day?: number
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_marketing_generations: {
        Row: {
          campaign_id: string | null
          generated_at: string
          id: string
          model: string | null
          objective: string | null
          organization_id: string
          posts_requested: number
          source_flags: Json
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          generated_at?: string
          id?: string
          model?: string | null
          objective?: string | null
          organization_id: string
          posts_requested?: number
          source_flags?: Json
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          generated_at?: string
          id?: string
          model?: string | null
          objective?: string | null
          organization_id?: string
          posts_requested?: number
          source_flags?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_marketing_generations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ai_marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_marketing_generations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_marketing_ideas: {
        Row: {
          created_at: string
          id: string
          idea: string
          objective: string | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          idea: string
          objective?: string | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          idea?: string
          objective?: string | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_marketing_ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_marketing_posts: {
        Row: {
          artwork_text: string | null
          campaign_id: string | null
          caption: string | null
          created_at: string
          created_by: string | null
          cta: string | null
          format: string
          hashtags: string | null
          id: string
          idea_id: string | null
          organization_id: string
          reel_suggestion: string | null
          scheduled_for: string | null
          source_snapshot: Json
          status: string
          story_suggestion: string | null
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artwork_text?: string | null
          campaign_id?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          format?: string
          hashtags?: string | null
          id?: string
          idea_id?: string | null
          organization_id: string
          reel_suggestion?: string | null
          scheduled_for?: string | null
          source_snapshot?: Json
          status?: string
          story_suggestion?: string | null
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artwork_text?: string | null
          campaign_id?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          format?: string
          hashtags?: string | null
          id?: string
          idea_id?: string | null
          organization_id?: string
          reel_suggestion?: string | null
          scheduled_for?: string | null
          source_snapshot?: Json
          status?: string
          story_suggestion?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_marketing_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ai_marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_marketing_posts_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ai_marketing_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_marketing_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_marketing_settings: {
        Row: {
          audience: string | null
          blocked_topics: string[]
          brand_rules: string | null
          organization_id: string
          preferred_cta: string | null
          preferred_formats: string[]
          preferred_topics: string[]
          updated_at: string
          use_agenda: boolean
          use_aura_data: boolean
          use_crm: boolean
          use_idea: boolean
          use_instagram: boolean
          voice_tone: string
        }
        Insert: {
          audience?: string | null
          blocked_topics?: string[]
          brand_rules?: string | null
          organization_id: string
          preferred_cta?: string | null
          preferred_formats?: string[]
          preferred_topics?: string[]
          updated_at?: string
          use_agenda?: boolean
          use_aura_data?: boolean
          use_crm?: boolean
          use_idea?: boolean
          use_instagram?: boolean
          voice_tone?: string
        }
        Update: {
          audience?: string | null
          blocked_topics?: string[]
          brand_rules?: string | null
          organization_id?: string
          preferred_cta?: string | null
          preferred_formats?: string[]
          preferred_topics?: string[]
          updated_at?: string
          use_agenda?: boolean
          use_aura_data?: boolean
          use_crm?: boolean
          use_idea?: boolean
          use_instagram?: boolean
          voice_tone?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_marketing_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_marketing_usage: {
        Row: {
          content_count: number
          created_at: string
          estimated_tokens: number | null
          generation_id: string | null
          id: string
          image_count: number
          organization_id: string
          user_id: string | null
        }
        Insert: {
          content_count?: number
          created_at?: string
          estimated_tokens?: number | null
          generation_id?: string | null
          id?: string
          image_count?: number
          organization_id: string
          user_id?: string | null
        }
        Update: {
          content_count?: number
          created_at?: string
          estimated_tokens?: number | null
          generation_id?: string | null
          id?: string
          image_count?: number
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_marketing_usage_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "ai_marketing_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_marketing_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          organization_id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          organization_id: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_questions: {
        Row: {
          created_at: string
          id: string
          label: string
          options: string[]
          organization_id: string
          position: number
          required: boolean
          template_id: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          options?: string[]
          organization_id: string
          position?: number
          required?: boolean
          template_id: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          options?: string[]
          organization_id?: string
          position?: number
          required?: boolean
          template_id?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_responses: {
        Row: {
          answers: Json
          appointment_id: string | null
          client_id: string
          created_at: string
          id: string
          organization_id: string
          signature_data: string | null
          signed_at: string | null
          signed_by: string | null
          template_id: string | null
        }
        Insert: {
          answers?: Json
          appointment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
          signature_data?: string | null
          signed_at?: string | null
          signed_by?: string | null
          template_id?: string | null
        }
        Update: {
          answers?: Json
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          signature_data?: string | null
          signed_at?: string | null
          signed_by?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_templates: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_id: string
          service_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          organization_id: string
          service_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_history: {
        Row: {
          appointment_id: string
          changed_by: string | null
          created_at: string
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          appointment_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          appointment_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string | null
          client_package_id: string | null
          created_at: string
          ends_at: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          price: number
          professional_id: string | null
          room_id: string | null
          service_id: string | null
          source: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_package_id?: string | null
          created_at?: string
          ends_at: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          price?: number
          professional_id?: string | null
          room_id?: string | null
          service_id?: string | null
          source?: string
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_package_id?: string | null
          created_at?: string
          ends_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          price?: number
          professional_id?: string | null
          room_id?: string | null
          service_id?: string | null
          source?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip_hash: string | null
          meta: Json
          organization_id: string | null
          request_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_hash?: string | null
          meta?: Json
          organization_id?: string | null
          request_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_hash?: string | null
          meta?: Json
          organization_id?: string | null
          request_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_blocks: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["block_type"]
          organization_id: string
          professional_id: string | null
          room_id: string | null
          starts_at: string
          title: string | null
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          kind?: Database["public"]["Enums"]["block_type"]
          organization_id: string
          professional_id?: string | null
          room_id?: string | null
          starts_at: string
          title?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["block_type"]
          organization_id?: string
          professional_id?: string | null
          room_id?: string | null
          starts_at?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_blocks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_blocks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          counted_balance: number | null
          created_at: string
          id: string
          opened_at: string
          opened_by: string | null
          opening_balance: number
          organization_id: string
        }
        Insert: {
          closed_at?: string | null
          counted_balance?: number | null
          created_at?: string
          id?: string
          opened_at?: string
          opened_by?: string | null
          opening_balance?: number
          organization_id: string
        }
        Update: {
          closed_at?: string | null
          counted_balance?: number | null
          created_at?: string
          id?: string
          opened_at?: string
          opened_by?: string | null
          opening_balance?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string
          description: string | null
          id: string
          kind: string
          organization_id: string
        }
        Insert: {
          amount?: number
          cash_register_id: string
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          organization_id: string
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          cancelled_at: string | null
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          document_hash: string | null
          document_url: string | null
          expires_at: string | null
          id: string
          organization_id: string
          rejected_at: string | null
          rejection_reason: string | null
          sent_at: string | null
          signature_data: string | null
          signature_hash: string | null
          signature_method: string | null
          signed_at: string | null
          signed_by_document: string | null
          signed_by_name: string | null
          status: string
          template_id: string | null
          template_version: number | null
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signature_hash?: string | null
          signature_method?: string | null
          signed_at?: string | null
          signed_by_document?: string | null
          signed_by_name?: string | null
          status?: string
          template_id?: string | null
          template_version?: number | null
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signature_hash?: string | null
          signature_method?: string | null
          signed_at?: string | null
          signed_by_document?: string | null
          signed_by_name?: string | null
          status?: string
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          file_path: string
          id: string
          kind: string
          label: string | null
          organization_id: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          file_path: string
          id?: string
          kind?: string
          label?: string | null
          organization_id: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          file_path?: string
          id?: string
          kind?: string
          label?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          expires_at: string | null
          id: string
          name: string
          organization_id: string
          package_id: string | null
          price: number
          service_id: string | null
          sessions_total: number
          sessions_used: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name: string
          organization_id: string
          package_id?: string | null
          price?: number
          service_id?: string | null
          sessions_total?: number
          sessions_used?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          package_id?: string | null
          price?: number
          service_id?: string | null
          sessions_total?: number
          sessions_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          crm_status: string
          deleted_at: string | null
          email: string | null
          id: string
          instagram: string | null
          is_vip: boolean
          last_contact_at: string | null
          location_id: string | null
          name: string
          notes: string | null
          organization_id: string
          origin: string | null
          phone: string | null
          tags: string[]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          crm_status?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_vip?: boolean
          last_contact_at?: string | null
          location_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          origin?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          crm_status?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_vip?: boolean
          last_contact_at?: string | null
          location_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          origin?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          appointment_id: string | null
          base_amount: number
          created_at: string
          deductions: number
          gross: number
          id: string
          net: number
          organization_id: string
          paid: boolean
          paid_at: string | null
          professional_id: string
          sale_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          base_amount?: number
          created_at?: string
          deductions?: number
          gross?: number
          id?: string
          net?: number
          organization_id: string
          paid?: boolean
          paid_at?: string | null
          professional_id: string
          sale_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          base_amount?: number
          created_at?: string
          deductions?: number
          gross?: number
          id?: string
          net?: number
          organization_id?: string
          paid?: boolean
          paid_at?: string | null
          professional_id?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          active: boolean
          commission_type: string
          commission_value: number
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          id: string
          notes: string | null
          organization_id: string
          package_id: string | null
          priority: number
          professional_id: string | null
          service_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          commission_type: string
          commission_value: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          package_id?: string | null
          priority?: number
          professional_id?: string | null
          service_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          commission_type?: string
          commission_value?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          package_id?: string | null
          priority?: number
          professional_id?: string | null
          service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settlement_items: {
        Row: {
          commission_entry_id: string
          created_at: string
          deductions: number
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          organization_id: string
          settlement_id: string
        }
        Insert: {
          commission_entry_id: string
          created_at?: string
          deductions?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          organization_id: string
          settlement_id: string
        }
        Update: {
          commission_entry_id?: string
          created_at?: string
          deductions?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          organization_id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_settlement_items_commission_entry_id_fkey"
            columns: ["commission_entry_id"]
            isOneToOne: true
            referencedRelation: "commission_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_settlement_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "commission_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settlements: {
        Row: {
          adjustments: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          deductions: number
          gross_amount: number
          id: string
          location_id: string | null
          net_amount: number
          notes: string | null
          organization_id: string
          paid_at: string | null
          payout_method: string | null
          payout_reference: string | null
          period_end: string
          period_start: string
          professional_id: string
          status: string
          updated_at: string
        }
        Insert: {
          adjustments?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deductions?: number
          gross_amount?: number
          id?: string
          location_id?: string | null
          net_amount?: number
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          period_end: string
          period_start: string
          professional_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          adjustments?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deductions?: number
          gross_amount?: number
          id?: string
          location_id?: string | null
          net_amount?: number
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          period_end?: string
          period_start?: string
          professional_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_settlements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_settlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_settlements_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          contract_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          organization_id: string
          to_status: string | null
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          contract_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          to_status?: string | null
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          contract_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          active: boolean
          code: number | null
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
          variables: Json
          version: number
        }
        Insert: {
          active?: boolean
          code?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          variables?: Json
          version?: number
        }
        Update: {
          active?: boolean
          code?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          variables?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_term_acceptances: {
        Row: {
          acceptance_token_hash: string | null
          accepted: boolean
          accepted_at: string | null
          contract_id: string
          created_at: string
          evidence_storage_path: string | null
          id: string
          ip_hash: string | null
          organization_id: string
          revoked_at: string | null
          signer_document: string | null
          signer_email: string | null
          signer_name: string | null
          signer_phone: string | null
          term_content_hash: string
          term_id: string
          term_version: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          acceptance_token_hash?: string | null
          accepted?: boolean
          accepted_at?: string | null
          contract_id: string
          created_at?: string
          evidence_storage_path?: string | null
          id?: string
          ip_hash?: string | null
          organization_id: string
          revoked_at?: string | null
          signer_document?: string | null
          signer_email?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          term_content_hash: string
          term_id: string
          term_version: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          acceptance_token_hash?: string | null
          accepted?: boolean
          accepted_at?: string | null
          contract_id?: string
          created_at?: string
          evidence_storage_path?: string | null
          id?: string
          ip_hash?: string | null
          organization_id?: string
          revoked_at?: string | null
          signer_document?: string | null
          signer_email?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          term_content_hash?: string
          term_id?: string
          term_version?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_term_acceptances_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_term_acceptances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_term_acceptances_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "acceptance_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_follow_ups: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string
          id: string
          lead_id: string | null
          organization_id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at: string
          id?: string
          lead_id?: string | null
          organization_id: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string
          id?: string
          lead_id?: string | null
          organization_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          lead_id: string | null
          next_action: string | null
          occurred_at: string
          organization_id: string
          result: string | null
          subject: string | null
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          lead_id?: string | null
          next_action?: string | null
          occurred_at?: string
          organization_id: string
          result?: string | null
          subject?: string | null
          type?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          lead_id?: string | null
          next_action?: string | null
          occurred_at?: string
          organization_id?: string
          result?: string | null
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          lead_id: string
          new_stage: string
          organization_id: string
          previous_stage: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          new_stage: string
          organization_id: string
          previous_stage?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          new_stage?: string
          organization_id?: string
          previous_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_stage_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          birth_date: string | null
          client_id: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          first_contact_at: string | null
          id: string
          instagram: string | null
          interested_professional_id: string | null
          interested_service_id: string | null
          lost_reason: string | null
          name: string
          notes: string | null
          organization_id: string
          owner_id: string | null
          source: string | null
          source_id: string | null
          stage: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          birth_date?: string | null
          client_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          first_contact_at?: string | null
          id?: string
          instagram?: string | null
          interested_professional_id?: string | null
          interested_service_id?: string | null
          lost_reason?: string | null
          name: string
          notes?: string | null
          organization_id: string
          owner_id?: string | null
          source?: string | null
          source_id?: string | null
          stage?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          birth_date?: string | null
          client_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          first_contact_at?: string | null
          id?: string
          instagram?: string | null
          interested_professional_id?: string | null
          interested_service_id?: string | null
          lost_reason?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          owner_id?: string | null
          source?: string | null
          source_id?: string | null
          stage?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_interested_professional_id_fkey"
            columns: ["interested_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_interested_service_id_fkey"
            columns: ["interested_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "crm_lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_message_templates: {
        Row: {
          active: boolean
          body: string
          channel: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          body: string
          channel?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          body?: string
          channel?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_retention_settings: {
        Row: {
          inactivity_days: number
          organization_id: string
          return_days: number
          updated_at: string
        }
        Insert: {
          inactivity_days?: number
          organization_id: string
          return_days?: number
          updated_at?: string
        }
        Update: {
          inactivity_days?: number
          organization_id?: string
          return_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_retention_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          effective_on: string
          id: string
          organization_id: string
          quote_currency: string
          rate: number
          source: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          effective_on?: string
          id?: string
          organization_id: string
          quote_currency: string
          rate: number
          source?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          effective_on?: string
          id?: string
          organization_id?: string
          quote_currency?: string
          rate?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "currency_exchange_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupon_redemptions: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          coupon_id: string
          discount_amount: number
          final_amount: number
          id: string
          organization_id: string
          original_amount: number
          redeemed_at: string
          service_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          coupon_id: string
          discount_amount: number
          final_amount: number
          id?: string
          organization_id: string
          original_amount: number
          redeemed_at?: string
          service_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          coupon_id?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          organization_id?: string
          original_amount?: number
          redeemed_at?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupon_redemptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_coupon_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_coupon_redemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_coupon_redemptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupon_services: {
        Row: {
          coupon_id: string
          service_id: string
        }
        Insert: {
          coupon_id: string
          service_id: string
        }
        Update: {
          coupon_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupon_services_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_coupon_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          active: boolean
          applies_to_all_services: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          internal_note: string | null
          max_uses: number | null
          organization_id: string
          percentage: number
          single_use_per_client: boolean
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_all_services?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          internal_note?: string | null
          max_uses?: number | null
          organization_id: string
          percentage: number
          single_use_per_client?: boolean
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_all_services?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          internal_note?: string | null
          max_uses?: number | null
          organization_id?: string
          percentage?: number
          single_use_per_client?: boolean
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lot_movements: {
        Row: {
          appointment_id: string | null
          id: string
          inventory_movement_id: string | null
          lot_id: string
          metadata: Json
          movement_type: string
          occurred_at: string
          organization_id: string
          performed_by: string | null
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reason: string | null
          sale_id: string | null
          total_cost: number
          treatment_record_id: string | null
          unit_cost: number
        }
        Insert: {
          appointment_id?: string | null
          id?: string
          inventory_movement_id?: string | null
          lot_id: string
          metadata?: Json
          movement_type: string
          occurred_at?: string
          organization_id: string
          performed_by?: string | null
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reason?: string | null
          sale_id?: string | null
          total_cost?: number
          treatment_record_id?: string | null
          unit_cost?: number
        }
        Update: {
          appointment_id?: string | null
          id?: string
          inventory_movement_id?: string | null
          lot_id?: string
          metadata?: Json
          movement_type?: string
          occurred_at?: string
          organization_id?: string
          performed_by?: string | null
          product_id?: string
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          reason?: string | null
          sale_id?: string | null
          total_cost?: number
          treatment_record_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lot_movements_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lot_movements_inventory_movement_id_fkey"
            columns: ["inventory_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lot_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lot_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lot_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lot_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lot_movements_treatment_record_id_fkey"
            columns: ["treatment_record_id"]
            isOneToOne: false
            referencedRelation: "treatment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lots: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          location_id: string | null
          lot_number: string
          manufactured_at: string | null
          manufacturer: string | null
          metadata: Json
          notes: string | null
          organization_id: string
          product_id: string
          quantity_available: number
          quantity_received: number
          received_at: string
          status: string
          supplier_document: string | null
          supplier_name: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string | null
          lot_number: string
          manufactured_at?: string | null
          manufacturer?: string | null
          metadata?: Json
          notes?: string | null
          organization_id: string
          product_id: string
          quantity_available?: number
          quantity_received?: number
          received_at?: string
          status?: string
          supplier_document?: string | null
          supplier_name?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string | null
          lot_number?: string
          manufactured_at?: string | null
          manufacturer?: string | null
          metadata?: Json
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity_available?: number
          quantity_received?: number
          received_at?: string
          status?: string
          supplier_document?: string | null
          supplier_name?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          lot_id: string | null
          note: string | null
          organization_id: string
          product_id: string
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
          unit_cost: number | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          lot_id?: string | null
          note?: string | null
          organization_id: string
          product_id: string
          quantity?: number
          type?: Database["public"]["Enums"]["movement_type"]
          unit_cost?: number | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          lot_id?: string | null
          note?: string | null
          organization_id?: string
          product_id?: string
          quantity?: number
          type?: Database["public"]["Enums"]["movement_type"]
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_lot_fk"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_pix_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
          external_reference: string
          id: string
          organization_id: string
          paid_at: string | null
          payer_email: string
          period_end: string | null
          period_start: string | null
          provider: string
          provider_payment_id: string
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          status_detail: string | null
          subscription_id: string | null
          ticket_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          external_reference: string
          id?: string
          organization_id: string
          paid_at?: string | null
          payer_email: string
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_payment_id: string
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          status_detail?: string | null
          subscription_id?: string | null
          ticket_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          external_reference?: string
          id?: string
          organization_id?: string
          paid_at?: string | null
          payer_email?: string
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_payment_id?: string
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          status_detail?: string | null
          subscription_id?: string | null
          ticket_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercadopago_pix_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercadopago_pix_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          appointment_id: string | null
          body: string
          channel: string
          client_id: string | null
          client_name: string | null
          created_at: string
          id: string
          kind: string
          organization_id: string
          sent_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          body: string
          channel?: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id: string
          sent_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          body?: string
          channel?: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean
          body: string
          created_at: string
          event: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          event: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          event?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          organization_id: string
          read: boolean
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          organization_id: string
          read?: boolean
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          organization_id?: string
          read?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      online_booking_requests: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          consent_at: string | null
          consent_data_processing: boolean
          created_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          idempotency_key: string
          notes: string | null
          organization_id: string
          package_id: string | null
          professional_id: string | null
          rejection_reason: string | null
          requested_ends_at: string
          requested_starts_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          service_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          consent_at?: string | null
          consent_data_processing?: boolean
          created_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          idempotency_key: string
          notes?: string | null
          organization_id: string
          package_id?: string | null
          professional_id?: string | null
          rejection_reason?: string | null
          requested_ends_at: string
          requested_starts_at: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          consent_at?: string | null
          consent_data_processing?: boolean
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          idempotency_key?: string
          notes?: string | null
          organization_id?: string
          package_id?: string | null
          professional_id?: string | null
          rejection_reason?: string | null
          requested_ends_at?: string
          requested_starts_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_booking_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_booking_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_booking_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_booking_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_booking_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_booking_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_localization_settings: {
        Row: {
          currency_code: string
          date_format: string
          decimal_separator: string
          first_day_of_week: number
          language_code: string
          organization_id: string
          thousands_separator: string
          timezone: string
          updated_at: string
        }
        Insert: {
          currency_code?: string
          date_format?: string
          decimal_separator?: string
          first_day_of_week?: number
          language_code?: string
          organization_id: string
          thousands_separator?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          currency_code?: string
          date_format?: string
          decimal_separator?: string
          first_day_of_week?: number
          language_code?: string
          organization_id?: string
          thousands_separator?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_localization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_location_members: {
        Row: {
          active: boolean
          created_at: string
          location_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          location_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          location_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_location_members_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_locations: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          code: string
          created_at: string
          id: string
          is_main: boolean
          name: string
          organization_id: string
          phone: string | null
          state: string | null
          timezone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          id?: string
          is_main?: boolean
          name: string
          organization_id: string
          phone?: string | null
          state?: string | null
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          id?: string
          is_main?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          state?: string | null
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          organization_id: string
          permissions: Json
          professional_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id: string
          permissions?: Json
          professional_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          permissions?: Json
          professional_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_permissions: {
        Row: {
          allowed: boolean
          organization_id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          organization_id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          organization_id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_recovery_settings: {
        Row: {
          enabled: boolean
          inactivity_days: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          inactivity_days?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          inactivity_days?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_recovery_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          access_blocked: boolean
          access_blocked_at: string | null
          access_blocked_reason: string | null
          diamond_access: boolean
          diamond_access_at: string | null
          diamond_access_granted_by: string | null
          document_storage_limit_bytes: number
          address: string | null
          booking_slug: string | null
          business_hours: Json
          city: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          google_review_url: string | null
          id: string
          instagram: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          onboarding_done: boolean
          online_booking_enabled: boolean
          phone: string | null
          plan: string
          primary_color: string
          secondary_color: string
          state: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          access_blocked?: boolean
          access_blocked_at?: string | null
          access_blocked_reason?: string | null
          diamond_access?: boolean
          diamond_access_at?: string | null
          diamond_access_granted_by?: string | null
          document_storage_limit_bytes?: number
          address?: string | null
          booking_slug?: string | null
          business_hours?: Json
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          google_review_url?: string | null
          id?: string
          instagram?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          onboarding_done?: boolean
          online_booking_enabled?: boolean
          phone?: string | null
          plan?: string
          primary_color?: string
          secondary_color?: string
          state?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          access_blocked?: boolean
          access_blocked_at?: string | null
          access_blocked_reason?: string | null
          diamond_access?: boolean
          diamond_access_at?: string | null
          diamond_access_granted_by?: string | null
          document_storage_limit_bytes?: number
          address?: string | null
          booking_slug?: string | null
          business_hours?: Json
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          google_review_url?: string | null
          id?: string
          instagram?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          onboarding_done?: boolean
          online_booking_enabled?: boolean
          phone?: string | null
          plan?: string
          primary_color?: string
          secondary_color?: string
          state?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      package_items: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          package_id: string
          service_id: string
          sessions: number
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          package_id: string
          service_id: string
          sessions?: number
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          package_id?: string
          service_id?: string
          sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          location_id: string | null
          name: string
          online_booking: boolean
          organization_id: string
          price: number
          service_id: string | null
          sessions: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          name: string
          online_booking?: boolean
          organization_id: string
          price?: number
          service_id?: string | null
          sessions?: number
          updated_at?: string
          validity_days?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          name?: string
          online_booking?: boolean
          organization_id?: string
          price?: number
          service_id?: string | null
          sessions?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_portal_access: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          last_accessed_at: string | null
          organization_id: string
          revoked_at: string | null
          token_expires_at: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_accessed_at?: string | null
          organization_id: string
          revoked_at?: string | null
          token_expires_at: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_accessed_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          token_expires_at?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_portal_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_portal_access_log: {
        Row: {
          action: string
          appointment_id: string | null
          client_id: string
          created_at: string
          id: string
          ip_hash: string | null
          organization_id: string
          portal_access_id: string | null
          user_agent_hash: string | null
        }
        Insert: {
          action: string
          appointment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          organization_id: string
          portal_access_id?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          action?: string
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          organization_id?: string
          portal_access_id?: string | null
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_portal_access_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_portal_access_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_portal_access_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_portal_access_log_portal_access_id_fkey"
            columns: ["portal_access_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_access"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_charges: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          discount: number
          expires_at: string | null
          external_id: string | null
          final_amount: number
          id: string
          idempotency_key: string
          kind: string
          method: string | null
          organization_id: string
          package_id: string | null
          paid_at: string | null
          payment_url: string | null
          professional_id: string | null
          provider_id: string | null
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          discount?: number
          expires_at?: string | null
          external_id?: string | null
          final_amount: number
          id?: string
          idempotency_key: string
          kind: string
          method?: string | null
          organization_id: string
          package_id?: string | null
          paid_at?: string | null
          payment_url?: string | null
          professional_id?: string | null
          provider_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          discount?: number
          expires_at?: string | null
          external_id?: string | null
          final_amount?: number
          id?: string
          idempotency_key?: string
          kind?: string
          method?: string | null
          organization_id?: string
          package_id?: string | null
          paid_at?: string | null
          payment_url?: string | null
          professional_id?: string | null
          provider_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_charges_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_charges_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_charges_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_charges_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_charges_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_charges_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          environment: string
          id: string
          metadata: Json
          organization_id: string
          provider: string
          public_key: string | null
          secret_ref: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          environment?: string
          id?: string
          metadata?: Json
          organization_id: string
          provider: string
          public_key?: string | null
          secret_ref?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          environment?: string
          id?: string
          metadata?: Json
          organization_id?: string
          provider?: string
          public_key?: string | null
          secret_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateways_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          account_label: string | null
          capabilities: Json
          connected_at: string | null
          created_at: string
          display_name: string
          id: string
          last_webhook_at: string | null
          organization_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          capabilities?: Json
          connected_at?: string | null
          created_at?: string
          display_name: string
          id?: string
          last_webhook_at?: string | null
          organization_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          capabilities?: Json
          connected_at?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_webhook_at?: string | null
          organization_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_refunds: {
        Row: {
          amount: number
          charge_id: string
          created_at: string
          external_id: string | null
          id: string
          organization_id: string
          reason: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          amount: number
          charge_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          organization_id: string
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          charge_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          organization_id?: string
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "payment_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_split_batches: {
        Row: {
          charge_id: string
          created_at: string
          created_by: string | null
          external_transfer_id: string | null
          failure_reason: string | null
          gateway_fee: number
          gross_amount: number
          id: string
          metadata: Json
          net_amount: number
          organization_id: string
          payment_transaction_id: string | null
          processed_at: string | null
          provider: string | null
          status: string
          updated_at: string
        }
        Insert: {
          charge_id: string
          created_at?: string
          created_by?: string | null
          external_transfer_id?: string | null
          failure_reason?: string | null
          gateway_fee?: number
          gross_amount: number
          id?: string
          metadata?: Json
          net_amount?: number
          organization_id: string
          payment_transaction_id?: string | null
          processed_at?: string | null
          provider?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          charge_id?: string
          created_at?: string
          created_by?: string | null
          external_transfer_id?: string | null
          failure_reason?: string | null
          gateway_fee?: number
          gross_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          organization_id?: string
          payment_transaction_id?: string | null
          processed_at?: string | null
          provider?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_split_batches_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: true
            referencedRelation: "payment_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_split_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_split_batches_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_split_items: {
        Row: {
          amount: number
          batch_id: string
          created_at: string
          destination_reference: string | null
          external_transfer_id: string | null
          failure_reason: string | null
          id: string
          metadata: Json
          organization_id: string
          paid_at: string | null
          percentage: number
          professional_id: string | null
          recipient_name: string | null
          recipient_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          batch_id: string
          created_at?: string
          destination_reference?: string | null
          external_transfer_id?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          paid_at?: string | null
          percentage?: number
          professional_id?: string | null
          recipient_name?: string | null
          recipient_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          batch_id?: string
          created_at?: string
          destination_reference?: string | null
          external_transfer_id?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          paid_at?: string | null
          percentage?: number
          professional_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_split_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_split_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_split_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_split_items_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          currency: string
          customer_email: string | null
          external_id: string | null
          gateway_id: string | null
          id: string
          idempotency_key: string
          kind: string
          location_id: string | null
          metadata: Json
          organization_id: string
          paid_at: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          external_id?: string | null
          gateway_id?: string | null
          id?: string
          idempotency_key: string
          kind?: string
          location_id?: string | null
          metadata?: Json
          organization_id: string
          paid_at?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          external_id?: string | null
          gateway_id?: string | null
          id?: string
          idempotency_key?: string
          kind?: string
          location_id?: string | null
          metadata?: Json
          organization_id?: string
          paid_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          external_event_id: string
          id: string
          organization_id: string | null
          payload: Json
          processed: boolean
          processed_at: string | null
          provider: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          external_event_id: string
          id?: string
          organization_id?: string | null
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          external_event_id?: string
          id?: string
          organization_id?: string | null
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_webhook_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          organization_id: string
          paid_at: string | null
          pix_payload: string | null
          sale_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          organization_id: string
          paid_at?: string | null
          pix_payload?: string | null
          sale_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          organization_id?: string
          paid_at?: string | null
          pix_payload?: string | null
          sale_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          months: number
          organization_id: string
          payer_note: string | null
          pix_key: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          months?: number
          organization_id: string
          payer_note?: string | null
          pix_key: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          months?: number
          organization_id?: string
          payer_note?: string | null
          pix_key?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pix_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          id: string
          limits: Json
          name: string
          position: number
          price: number
        }
        Insert: {
          id: string
          limits?: Json
          name: string
          position?: number
          price: number
        }
        Update: {
          id?: string
          limits?: Json
          name?: string
          position?: number
          price?: number
        }
        Relationships: []
      }
      platform_access_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          organization_id: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_sessions: {
        Row: {
          first_seen_at: string
          id: string
          last_seen_at: string
          left_at: string | null
          metadata: Json
          organization_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          left_at?: string | null
          metadata?: Json
          organization_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          left_at?: string | null
          metadata?: Json
          organization_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          cost_price: number
          created_at: string
          id: string
          min_stock: number
          name: string
          organization_id: string
          sale_price: number
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          organization_id: string
          sale_price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          organization_id?: string
          sale_price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_packages: {
        Row: {
          active: boolean
          created_at: string
          id: string
          organization_id: string
          package_id: string
          professional_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id: string
          package_id: string
          professional_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          package_id?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_packages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_services: {
        Row: {
          active: boolean
          created_at: string
          id: string
          organization_id: string
          professional_id: string
          service_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id: string
          professional_id: string
          service_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean
          bio: string | null
          booking_horizon_days: number
          certifications: string | null
          commission_default: number
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at: string
          email: string | null
          extra_windows: Json
          id: string
          location_id: string | null
          login_username: string | null
          lunch_enabled: boolean
          lunch_end: string
          lunch_start: string
          name: string
          online_booking: boolean
          organization_id: string
          phone: string | null
          photo_url: string | null
          slot_gap_min: number
          slot_minutes: number
          specialty: string | null
          updated_at: string
          user_id: string | null
          work_days: number[]
          work_end: string
          work_start: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          booking_horizon_days?: number
          certifications?: string | null
          commission_default?: number
          commission_type?: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          email?: string | null
          extra_windows?: Json
          id?: string
          location_id?: string | null
          login_username?: string | null
          lunch_enabled?: boolean
          lunch_end?: string
          lunch_start?: string
          name: string
          online_booking?: boolean
          organization_id: string
          phone?: string | null
          photo_url?: string | null
          slot_gap_min?: number
          slot_minutes?: number
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
          work_days?: number[]
          work_end?: string
          work_start?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          booking_horizon_days?: number
          certifications?: string | null
          commission_default?: number
          commission_type?: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          email?: string | null
          extra_windows?: Json
          id?: string
          location_id?: string | null
          login_username?: string | null
          lunch_enabled?: boolean
          lunch_end?: string
          lunch_start?: string
          name?: string
          online_booking?: boolean
          organization_id?: string
          phone?: string | null
          photo_url?: string | null
          slot_gap_min?: number
          slot_minutes?: number
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
          work_days?: number[]
          work_end?: string
          work_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "professionals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          description: string
          id: string
          organization_id: string
          product_id: string | null
          quantity: number
          sale_id: string
          service_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          organization_id: string
          product_id?: string | null
          quantity?: number
          sale_id: string
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          organization_id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          cost: number
          created_at: string
          discount: number
          id: string
          location_id: string | null
          organization_id: string
          professional_id: string | null
          surcharge: number
          total: number
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          cost?: number
          created_at?: string
          discount?: number
          id?: string
          location_id?: string | null
          organization_id: string
          professional_id?: string | null
          surcharge?: number
          total?: number
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          cost?: number
          created_at?: string
          discount?: number
          id?: string
          location_id?: string | null
          organization_id?: string
          professional_id?: string | null
          surcharge?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library: {
        Row: {
          category: string
          duration_min: number
          id: string
          name: string
          position: number
        }
        Insert: {
          category: string
          duration_min?: number
          id?: string
          name: string
          position?: number
        }
        Update: {
          category?: string
          duration_min?: number
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      service_products: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          quantity: number
          service_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          quantity?: number
          service_id: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          buffer_min: number
          category_id: string | null
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value: number
          created_at: string
          description: string | null
          duration_min: number
          id: string
          location_id: string | null
          name: string
          online_booking: boolean
          organization_id: string
          photo_url: string | null
          price: number
          promo_price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          buffer_min?: number
          category_id?: string | null
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          location_id?: string | null
          name: string
          online_booking?: boolean
          organization_id: string
          photo_url?: string | null
          price?: number
          promo_price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          buffer_min?: number
          category_id?: string | null
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          location_id?: string | null
          name?: string
          online_booking?: boolean
          organization_id?: string
          photo_url?: string | null
          price?: number
          promo_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_verifications: {
        Row: {
          acceptance_id: string | null
          biometric_template_hash: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          document_hash: string | null
          evidence_storage_path: string | null
          expires_at: string | null
          failure_code: string | null
          failure_reason: string | null
          id: string
          ip_hash: string | null
          liveness_score: number | null
          match_score: number | null
          metadata: Json
          method: string
          organization_id: string
          processed_at: string | null
          provider: string | null
          provider_reference: string | null
          request_id: string | null
          requested_at: string
          signature_hash: string | null
          signer_document: string | null
          signer_email: string | null
          signer_name: string | null
          status: string
          updated_at: string
          user_agent: string | null
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          acceptance_id?: string | null
          biometric_template_hash?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          evidence_storage_path?: string | null
          expires_at?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          ip_hash?: string | null
          liveness_score?: number | null
          match_score?: number | null
          metadata?: Json
          method: string
          organization_id: string
          processed_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          request_id?: string | null
          requested_at?: string
          signature_hash?: string | null
          signer_document?: string | null
          signer_email?: string | null
          signer_name?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          acceptance_id?: string | null
          biometric_template_hash?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          evidence_storage_path?: string | null
          expires_at?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          ip_hash?: string | null
          liveness_score?: number | null
          match_score?: number | null
          metadata?: Json
          method?: string
          organization_id?: string
          processed_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          request_id?: string | null
          requested_at?: string
          signature_hash?: string | null
          signer_document?: string | null
          signer_email?: string | null
          signer_name?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_verifications_acceptance_id_fkey"
            columns: ["acceptance_id"]
            isOneToOne: false
            referencedRelation: "contract_term_acceptances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_verifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          amount: number | null
          created_at: string
          external_id: string | null
          id: string
          kind: string
          meta: Json
          organization_id: string
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          external_id?: string | null
          id?: string
          kind: string
          meta?: Json
          organization_id: string
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          external_id?: string | null
          id?: string
          kind?: string
          meta?: Json
          organization_id?: string
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          canceled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_period_end: string | null
          id: string
          mp_init_point: string | null
          mp_payer_email: string | null
          mp_preapproval_id: string | null
          organization_id: string
          plan: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_period_end?: string | null
          id?: string
          mp_init_point?: string | null
          mp_payer_email?: string | null
          mp_preapproval_id?: string | null
          organization_id: string
          plan?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_period_end?: string | null
          id?: string
          mp_init_point?: string | null
          mp_payer_email?: string | null
          mp_preapproval_id?: string | null
          organization_id?: string
          plan?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_records: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          evolution: string | null
          id: string
          next_steps: string | null
          organization_id: string
          parameters: string | null
          performed_at: string
          photos: Json
          procedure: string
          products_used: string | null
          professional_id: string | null
          service_id: string | null
          updated_at: string
          arm_cm: number | null
          body_measurements_notes: string | null
          bust_cm: number | null
          height_cm: number | null
          hip_cm: number | null
          thigh_cm: number | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          evolution?: string | null
          id?: string
          next_steps?: string | null
          organization_id: string
          parameters?: string | null
          performed_at?: string
          photos?: Json
          procedure: string
          products_used?: string | null
          professional_id?: string | null
          service_id?: string | null
          updated_at?: string
          arm_cm?: number | null
          body_measurements_notes?: string | null
          bust_cm?: number | null
          height_cm?: number | null
          hip_cm?: number | null
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          evolution?: string | null
          id?: string
          next_steps?: string | null
          organization_id?: string
          parameters?: string | null
          performed_at?: string
          photos?: Json
          procedure?: string
          products_used?: string | null
          professional_id?: string | null
          service_id?: string | null
          updated_at?: string
          arm_cm?: number | null
          body_measurements_notes?: string | null
          bust_cm?: number | null
          height_cm?: number | null
          hip_cm?: number | null
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          client_id: string | null
          created_at: string
          display_name: string | null
          id: string
          last_seen_at: string | null
          metadata: Json
          opted_in: boolean
          opted_in_at: string | null
          opted_out_at: string | null
          organization_id: string
          phone: string
          profile_name: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          opted_in?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          organization_id: string
          phone: string
          profile_name?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          opted_in?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          organization_id?: string
          phone?: string
          profile_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          closed_at: string | null
          contact_id: string
          created_at: string
          id: string
          integration_id: string | null
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json
          organization_id: string
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          contact_id: string
          created_at?: string
          id?: string
          integration_id?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json
          organization_id: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          integration_id?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json
          organization_id?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_integrations: {
        Row: {
          active: boolean
          business_account_id: string | null
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          last_error: string | null
          last_error_at: string | null
          last_webhook_at: string | null
          metadata: Json
          organization_id: string
          phone_number: string | null
          phone_number_id: string | null
          provider: string
          provider_account_id: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          active?: boolean
          business_account_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_webhook_at?: string | null
          metadata?: Json
          organization_id: string
          phone_number?: string | null
          phone_number_id?: string | null
          provider?: string
          provider_account_id?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          active?: boolean
          business_account_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_webhook_at?: string | null
          metadata?: Json
          organization_id?: string
          phone_number?: string | null
          phone_number_id?: string | null
          provider?: string
          provider_account_id?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          client_id: string | null
          contact_id: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          delivery_status: string
          direction: string
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          integration_id: string | null
          media_mime_type: string | null
          media_storage_path: string | null
          media_url: string | null
          message_type: string
          metadata: Json
          organization_id: string
          provider_message_id: string | null
          read_at: string | null
          reply_to_message_id: string | null
          sender_user_id: string | null
          sent_at: string | null
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          contact_id: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          integration_id?: string | null
          media_mime_type?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json
          organization_id: string
          provider_message_id?: string | null
          read_at?: string | null
          reply_to_message_id?: string | null
          sender_user_id?: string | null
          sent_at?: string | null
        }
        Update: {
          body?: string | null
          client_id?: string | null
          contact_id?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          integration_id?: string | null
          media_mime_type?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json
          organization_id?: string
          provider_message_id?: string | null
          read_at?: string | null
          reply_to_message_id?: string | null
          sender_user_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          error_message: string | null
          event_type: string
          id: string
          integration_id: string | null
          organization_id: string | null
          payload: Json
          payload_hash: string
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          event_type: string
          id?: string
          integration_id?: string | null
          organization_id?: string | null
          payload?: Json
          payload_hash: string
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          event_type?: string
          id?: string
          integration_id?: string | null
          organization_id?: string | null
          payload?: Json
          payload_hash?: string
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_appointment: {
        Args: { _organization_id: string; _professional_id: string }
        Returns: boolean
      }
      convert_organization_amount: {
        Args: {
          _amount: number
          _from: string
          _on?: string
          _organization_id?: string
          _to: string
        }
        Returns: number
      }
      crm_convert_lead: {
        Args: { _lead_id: string }
        Returns: {
          address: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          crm_status: string
          deleted_at: string | null
          email: string | null
          id: string
          instagram: string | null
          is_vip: boolean
          last_contact_at: string | null
          location_id: string | null
          name: string
          notes: string | null
          organization_id: string
          origin: string | null
          phone: string | null
          tags: string[]
          updated_at: string
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_refresh_client_status: {
        Args: { _client_id: string }
        Returns: {
          address: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          crm_status: string
          deleted_at: string | null
          email: string | null
          id: string
          instagram: string | null
          is_vip: boolean
          last_contact_at: string | null
          location_id: string | null
          name: string
          notes: string | null
          organization_id: string
          origin: string | null
          phone: string | null
          tags: string[]
          updated_at: string
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      declare_pix_payment: {
        Args: {
          _amount?: number
          _months?: number
          _note?: string
          _pix_key?: string
        }
        Returns: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          months: number
          organization_id: string
          payer_note: string | null
          pix_key: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subscription_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pix_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_financial_intelligence: {
        Args: { _from: string; _location_id?: string; _to: string }
        Returns: Json
      }
      get_platform_document_storage_usage: {
        Args: Record<string, never>
        Returns: {
          limit_bytes: number
          organization_id: string
          organization_name: string
          usage_percent: number
          used_bytes: number
        }[]
      }
      has_org_permission: {
        Args: { _organization_id: string; _permission: string }
        Returns: boolean
      }
      has_org_role: {
        Args: {
          _org: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      inventory_consume_fefo: {
        Args: {
          _appointment_id?: string
          _organization_id: string
          _product_id: string
          _quantity: number
          _reason?: string
          _sale_id?: string
          _treatment_record_id?: string
        }
        Returns: {
          lot_id: string
          movement_id: string
          quantity: number
        }[]
      }
      inventory_receive_lot: {
        Args: {
          _expires_at?: string
          _location_id?: string
          _lot_number: string
          _organization_id: string
          _product_id: string
          _quantity: number
          _reason?: string
          _supplier_name?: string
          _unit_cost?: number
        }
        Returns: string
      }
      is_org_admin: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      member_has_permission: {
        Args: { _organization_id: string; _permission: string }
        Returns: boolean
      }
      patient_portal_cancel_appointment: {
        Args: { _appointment_id: string; _token_hash: string }
        Returns: boolean
      }
      patient_portal_get_appointments: {
        Args: { _token_hash: string }
        Returns: {
          appointment_id: string
          ends_at: string
          notes: string
          professional_name: string
          service_name: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      patient_portal_get_history: {
        Args: { _token_hash: string }
        Returns: {
          appointment_id: string
          evolution: string
          next_steps: string
          performed_at: string
          procedure: string
          professional_name: string
          service_name: string
          treatment_record_id: string
        }[]
      }
      patient_portal_get_profile: {
        Args: { _token_hash: string }
        Returns: {
          client_id: string
          email: string
          name: string
          organization_id: string
          phone: string
        }[]
      }
      patient_portal_issue_access: {
        Args: {
          _client_id: string
          _organization_id: string
          _token_expires_at: string
          _token_hash: string
        }
        Returns: string
      }
      payment_apply_webhook: {
        Args: {
          _event_type: string
          _external_event_id: string
          _external_id: string
          _organization_id?: string
          _payload: Json
          _provider: string
          _status: string
        }
        Returns: {
          amount: number
          checkout_url: string | null
          created_at: string
          currency: string
          customer_email: string | null
          external_id: string | null
          gateway_id: string | null
          id: string
          idempotency_key: string
          kind: string
          location_id: string | null
          metadata: Json
          organization_id: string
          paid_at: string | null
          provider: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      payment_create_transaction: {
        Args: {
          _amount: number
          _customer_email?: string
          _idempotency_key: string
          _kind: string
          _metadata?: Json
          _organization_id: string
          _provider: string
        }
        Returns: {
          amount: number
          checkout_url: string | null
          created_at: string
          currency: string
          customer_email: string | null
          external_id: string | null
          gateway_id: string | null
          id: string
          idempotency_key: string
          kind: string
          location_id: string | null
          metadata: Json
          organization_id: string
          paid_at: string | null
          provider: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      platform_set_diamond_access: {
        Args: { _enabled: boolean; _organization_id: string }
        Returns: {
          access_blocked: boolean
          access_blocked_at: string | null
          access_blocked_reason: string | null
          address: string | null
          booking_slug: string | null
          business_hours: Json
          city: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          diamond_access: boolean
          diamond_access_at: string | null
          diamond_access_granted_by: string | null
          google_review_url: string | null
          id: string
          instagram: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          onboarding_done: boolean
          online_booking_enabled: boolean
          phone: string | null
          plan: string
          primary_color: string
          secondary_color: string
          state: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          whatsapp: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      platform_set_organization_access: {
        Args: { _enabled: boolean; _organization_id: string; _reason?: string }
        Returns: {
          access_blocked: boolean
          access_blocked_at: string | null
          access_blocked_reason: string | null
          address: string | null
          booking_slug: string | null
          business_hours: Json
          city: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          diamond_access: boolean
          diamond_access_at: string | null
          diamond_access_granted_by: string | null
          google_review_url: string | null
          id: string
          instagram: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          onboarding_done: boolean
          online_booking_enabled: boolean
          phone: string | null
          plan: string
          primary_color: string
          secondary_color: string
          state: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          whatsapp: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      platform_set_subscription: {
        Args: {
          _organization_id: string
          _period_end?: string
          _plan?: string
          _status: string
        }
        Returns: {
          amount: number
          canceled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_period_end: string | null
          id: string
          mp_init_point: string | null
          mp_payer_email: string | null
          mp_preapproval_id: string | null
          organization_id: string
          plan: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      platform_touch_session: {
        Args: {
          _event_type?: string
          _metadata?: Json
          _organization_id: string
          _session_id: string
          _user_agent?: string
          _user_email?: string
        }
        Returns: {
          first_seen_at: string
          id: string
          last_seen_at: string
          left_at: string | null
          metadata: Json
          organization_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "platform_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_public_coupon_redemption: {
        Args: {
          _appointment_id: string
          _client_id: string
          _coupon_id: string
          _discount_amount: number
          _final_amount: number
          _original_amount: number
          _service_id: string
        }
        Returns: string
      }
      refresh_recovery_notifications: {
        Args: { _org_id: string }
        Returns: number
      }
      review_pix_payment: {
        Args: { _approve: boolean; _note?: string; _payment_id: string }
        Returns: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          months: number
          organization_id: string
          payer_note: string | null
          pix_key: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subscription_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pix_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_has_location: { Args: { _location_id: string }; Returns: boolean }
      validate_public_coupon: {
        Args: {
          _client_phone?: string
          _code: string
          _service_ids?: string[]
          _slug: string
        }
        Returns: {
          coupon_id: string
          message: string
          original_code: string
          percentage: number
          valid: boolean
        }[]
      }
      write_audit_log: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _entity?: string
          _entity_id?: string
          _meta?: Json
          _organization_id: string
          _severity?: string
        }
        Returns: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip_hash: string | null
          meta: Json
          organization_id: string | null
          request_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit_logs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_status: "pendente" | "vencido" | "pago" | "cancelado"
      app_role: "owner" | "manager" | "reception" | "professional"
      appointment_status:
        | "agendado"
        | "confirmado"
        | "aguardando"
        | "atendido"
        | "cancelado"
        | "faltou"
        | "reagendado"
      block_type:
        | "ausencia"
        | "ferias"
        | "almoco"
        | "reuniao"
        | "manutencao"
        | "sala"
        | "equipamento"
        | "particular"
      commission_type: "percentual" | "fixo"
      movement_type: "entrada" | "saida" | "ajuste" | "perda" | "consumo"
      payment_method:
        | "pix"
        | "credito"
        | "debito"
        | "dinheiro"
        | "transferencia"
        | "outros"
      question_type:
        | "texto"
        | "texto_longo"
        | "sim_nao"
        | "multipla_escolha"
        | "selecao"
        | "checkbox"
        | "data"
        | "numero"
        | "assinatura"
        | "imagem"
        | "documento"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["pendente", "vencido", "pago", "cancelado"],
      app_role: ["owner", "manager", "reception", "professional"],
      appointment_status: [
        "agendado",
        "confirmado",
        "aguardando",
        "atendido",
        "cancelado",
        "faltou",
        "reagendado",
      ],
      block_type: [
        "ausencia",
        "ferias",
        "almoco",
        "reuniao",
        "manutencao",
        "sala",
        "equipamento",
        "particular",
      ],
      commission_type: ["percentual", "fixo"],
      movement_type: ["entrada", "saida", "ajuste", "perda", "consumo"],
      payment_method: [
        "pix",
        "credito",
        "debito",
        "dinheiro",
        "transferencia",
        "outros",
      ],
      question_type: [
        "texto",
        "texto_longo",
        "sim_nao",
        "multipla_escolha",
        "selecao",
        "checkbox",
        "data",
        "numero",
        "assinatura",
        "imagem",
        "documento",
      ],
    },
  },
} as const
