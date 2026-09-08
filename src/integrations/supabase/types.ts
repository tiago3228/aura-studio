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
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
          organization_id?: string | null
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
          deleted_at: string | null
          email: string | null
          id: string
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
          deleted_at?: string | null
          email?: string | null
          id?: string
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
          deleted_at?: string | null
          email?: string | null
          id?: string
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
      inventory_movements: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          note: string | null
          organization_id: string
          product_id: string
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
          product_id: string
          quantity?: number
          type?: Database["public"]["Enums"]["movement_type"]
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          product_id?: string
          quantity?: number
          type?: Database["public"]["Enums"]["movement_type"]
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
          id: string
          kind: string
          organization_id: string
          read: boolean
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id: string
          read?: boolean
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
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
      organization_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id?: string
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
        ]
      }
      organizations: {
        Row: {
          address: string | null
          booking_slug: string | null
          business_hours: Json
          city: string | null
          cover_url: string | null
          created_at: string
          description: string | null
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
          address?: string | null
          booking_slug?: string | null
          business_hours?: Json
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
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
          address?: string | null
          booking_slug?: string | null
          business_hours?: Json
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
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
      packages: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
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
          id?: string
          name: string
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
          id?: string
          name?: string
          organization_id?: string
          price?: number
          service_id?: string | null
          sessions?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
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
          id: string
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
          id?: string
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
          id?: string
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
            foreignKeyName: "services_organization_id_fkey"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_org_role: {
        Args: {
          _org: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
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
