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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointment: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          allow_overlap: boolean | null
          cancel_reason: string | null
          canceled_by: string | null
          client_email: string | null
          client_id: string
          company_id: string
          confirmation_sent: boolean | null
          created_at: string
          duration_in_minutes: number | null
          end: string
          external_reference_id: string | null
          free_duration: number | null
          free_duration_offset: number | null
          id: string
          image_path: string | null
          is_canceled: boolean
          location_id: string
          notes: string | null
          price: number
          price_option_id: string | null
          reminder_sent: boolean | null
          send_confirmation: boolean | null
          staff_id: string
          staff_image_path: string | null
          staff_notes: string | null
          start: string
          status: string | null
          treatment_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          allow_overlap?: boolean | null
          cancel_reason?: string | null
          canceled_by?: string | null
          client_email?: string | null
          client_id: string
          company_id: string
          confirmation_sent?: boolean | null
          created_at?: string
          duration_in_minutes?: number | null
          end: string
          external_reference_id?: string | null
          free_duration?: number | null
          free_duration_offset?: number | null
          id?: string
          image_path?: string | null
          is_canceled?: boolean
          location_id?: string
          notes?: string | null
          price: number
          price_option_id?: string | null
          reminder_sent?: boolean | null
          send_confirmation?: boolean | null
          staff_id: string
          staff_image_path?: string | null
          staff_notes?: string | null
          start: string
          status?: string | null
          treatment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          allow_overlap?: boolean | null
          cancel_reason?: string | null
          canceled_by?: string | null
          client_email?: string | null
          client_id?: string
          company_id?: string
          confirmation_sent?: boolean | null
          created_at?: string
          duration_in_minutes?: number | null
          end?: string
          external_reference_id?: string | null
          free_duration?: number | null
          free_duration_offset?: number | null
          id?: string
          image_path?: string | null
          is_canceled?: boolean
          location_id?: string
          notes?: string | null
          price?: number
          price_option_id?: string | null
          reminder_sent?: boolean | null
          send_confirmation?: boolean | null
          staff_id?: string
          staff_image_path?: string | null
          staff_notes?: string | null
          start?: string
          status?: string | null
          treatment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_price_option_id_fkey"
            columns: ["price_option_id"]
            isOneToOne: false
            referencedRelation: "price_option"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_segment: {
        Row: {
          allow_overlap: boolean
          appointment_id: string
          company_id: string
          created_at: string
          ends_at: string
          id: string
          location_id: string
          price: number | null
          price_net: number | null
          sequence: number
          service_id: string
          service_variant_id: string
          staff_id: string
          starts_at: string
          updated_at: string | null
        }
        Insert: {
          allow_overlap?: boolean
          appointment_id: string
          company_id: string
          created_at?: string
          ends_at: string
          id?: string
          location_id?: string
          price?: number | null
          price_net?: number | null
          sequence: number
          service_id: string
          service_variant_id: string
          staff_id: string
          starts_at: string
          updated_at?: string | null
        }
        Update: {
          allow_overlap?: boolean
          appointment_id?: string
          company_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          location_id?: string
          price?: number | null
          price_net?: number | null
          sequence?: number
          service_id?: string
          service_variant_id?: string
          staff_id?: string
          starts_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_segment_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_segment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_segment_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_segment_service_variant_id_fkey"
            columns: ["service_variant_id"]
            isOneToOne: false
            referencedRelation: "service_variant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_segment_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_segment_phase: {
        Row: {
          allow_overlap: boolean
          appointment_segment_id: string
          company_id: string
          created_at: string
          ends_at: string
          id: string
          phase_type: string
          sequence: number
          staff_id: string
          starts_at: string
          updated_at: string | null
        }
        Insert: {
          allow_overlap?: boolean
          appointment_segment_id: string
          company_id: string
          created_at?: string
          ends_at: string
          id?: string
          phase_type: string
          sequence: number
          staff_id: string
          starts_at: string
          updated_at?: string | null
        }
        Update: {
          allow_overlap?: boolean
          appointment_segment_id?: string
          company_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          phase_type?: string
          sequence?: number
          staff_id?: string
          starts_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_segment_phase_appointment_segment_id_fkey"
            columns: ["appointment_segment_id"]
            isOneToOne: false
            referencedRelation: "appointment_segment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_segment_phase_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_segment_phase_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_treatment: {
        Row: {
          appointment_id: string
          company_id: string
          created_at: string
          id: string
          price_option_id: string
          treatment_id: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          company_id: string
          created_at?: string
          id?: string
          price_option_id: string
          treatment_id: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          company_id?: string
          created_at?: string
          id?: string
          price_option_id?: string
          treatment_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_treatment_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_treatment_price_option_id_fkey"
            columns: ["price_option_id"]
            isOneToOne: false
            referencedRelation: "price_option"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_treatment_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          company_id: string
          created_at: string
          day_of_week: number | null
          end: string
          id: number
          recurring: boolean
          staff_id: string
          start: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          day_of_week?: number | null
          end: string
          id?: number
          recurring: boolean
          staff_id: string
          start: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          day_of_week?: number | null
          end?: string
          id?: number
          recurring?: boolean
          staff_id?: string
          start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      client: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          search_vector: unknown
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          search_vector?: unknown
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          search_vector?: unknown
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_company: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          is_active: boolean | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          is_active?: boolean | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_company_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_company_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      client_location: {
        Row: {
          client_id: string
          created_at: string
          location_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          location_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_location_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_location_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          note: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          note?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          note?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      company: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          geo_location: unknown
          id: string
          image_url: string | null
          multi_location_enabled: boolean
          name: string
          postal_code: string | null
          reader_id: string | null
          slug: string | null
          state: string | null
          street: string | null
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          geo_location?: unknown
          id?: string
          image_url?: string | null
          multi_location_enabled?: boolean
          name: string
          postal_code?: string | null
          reader_id?: string | null
          slug?: string | null
          state?: string | null
          street?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          geo_location?: unknown
          id?: string
          image_url?: string | null
          multi_location_enabled?: boolean
          name?: string
          postal_code?: string | null
          reader_id?: string | null
          slug?: string | null
          state?: string | null
          street?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_integrations: {
        Row: {
          active: boolean | null
          api_key: string | null
          api_password: string | null
          company_id: string | null
          config: Json | null
          created_at: string
          external_company_id: string | null
          id: string
          integration_type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          api_key?: string | null
          api_password?: string | null
          company_id?: string | null
          config?: Json | null
          created_at?: string
          external_company_id?: string | null
          id?: string
          integration_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          api_key?: string | null
          api_password?: string | null
          company_id?: string | null
          config?: Json | null
          created_at?: string
          external_company_id?: string | null
          id?: string
          integration_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation: {
        Row: {
          company_id: string
          created_at: string
          email: string
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          email: string
          id?: string
          status: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order: {
        Row: {
          amount_paid: number | null
          client_id: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          date: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_number: string | null
          payment_status: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          client_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          date?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_status?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          client_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          date?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_status?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item: {
        Row: {
          appointment_id: string | null
          appointment_segment_id: string | null
          company_id: string
          created_at: string
          discount_amount: number | null
          id: string
          order_id: string
          price_option_id: string | null
          product_id: string | null
          quantity: number | null
          total: number | null
          treatment_id: string | null
          unit_price: number | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          appointment_id?: string | null
          appointment_segment_id?: string | null
          company_id: string
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_id: string
          price_option_id?: string | null
          product_id?: string | null
          quantity?: number | null
          total?: number | null
          treatment_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          appointment_id?: string | null
          appointment_segment_id?: string | null
          company_id?: string
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_id?: string
          price_option_id?: string | null
          product_id?: string | null
          quantity?: number | null
          total?: number | null
          treatment_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_appointment_segment_id_fkey"
            columns: ["appointment_segment_id"]
            isOneToOne: false
            referencedRelation: "appointment_segment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_price_option_id_fkey"
            columns: ["price_option_id"]
            isOneToOne: false
            referencedRelation: "price_option"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment"
            referencedColumns: ["id"]
          },
        ]
      }
      payment: {
        Row: {
          amount: number | null
          amount_gross: number | null
          card_brand: string | null
          card_type: string | null
          cashbook_id: string | null
          company_id: string | null
          created_at: string
          id: string
          last_four_digits: string | null
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_status: string | null
          processor_ref: string | null
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_it: string | null
          total_cash_received: number | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          amount_gross?: number | null
          card_brand?: string | null
          card_type?: string | null
          cashbook_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          last_four_digits?: string | null
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          processor_ref?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_it?: string | null
          total_cash_received?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          amount_gross?: number | null
          card_brand?: string | null
          card_type?: string | null
          cashbook_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          last_four_digits?: string | null
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          processor_ref?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_it?: string | null
          total_cash_received?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      price_option: {
        Row: {
          actual_duration_in_minutes: number | null
          company_id: string
          created_at: string
          duration_in_minutes: number
          id: string
          image_path: string | null
          interval: number | null
          max_price: number | null
          name: string
          order: number | null
          price: number
          price_net: number | null
          treatment_id: string | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          actual_duration_in_minutes?: number | null
          company_id: string
          created_at?: string
          duration_in_minutes: number
          id?: string
          image_path?: string | null
          interval?: number | null
          max_price?: number | null
          name: string
          order?: number | null
          price: number
          price_net?: number | null
          treatment_id?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          actual_duration_in_minutes?: number | null
          company_id?: string
          created_at?: string
          duration_in_minutes?: number
          id?: string
          image_path?: string | null
          interval?: number | null
          max_price?: number | null
          name?: string
          order?: number | null
          price?: number
          price_net?: number | null
          treatment_id?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_option_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment"
            referencedColumns: ["id"]
          },
        ]
      }
      product: {
        Row: {
          active: boolean | null
          barcode: string | null
          company_id: string
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          name: string | null
          price_gross: number | null
          price_net: number | null
          product_category_id: string | null
          product_line_id: string | null
          sku: string | null
          stock_qty: number | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          company_id: string
          cost_price?: number | null
          created_at: string
          description?: string | null
          id?: string
          name?: string | null
          price_gross?: number | null
          price_net?: number | null
          product_category_id?: string | null
          product_line_id?: string | null
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          company_id?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          price_gross?: number | null
          price_net?: number | null
          product_category_id?: string | null
          product_line_id?: string | null
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "product_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_product_line_id_fkey"
            columns: ["product_line_id"]
            isOneToOne: false
            referencedRelation: "product_line"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_line: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_code: {
        Row: {
          code: string
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          referrer_client_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          referrer_client_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          referrer_client_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_code_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_redemption: {
        Row: {
          appointment_id: string | null
          company_id: string
          created_at: string
          id: string
          referral_code_id: string
          referred_client_id: string
          referrer_client_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          referral_code_id: string
          referred_client_id: string
          referrer_client_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          referral_code_id?: string
          referred_client_id?: string
          referrer_client_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_redemption_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_redemption_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_code"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_redemption_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_redemption_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      service: {
        Row: {
          booking_interval_minutes: number | null
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_path: string | null
          is_active: boolean | null
          is_deleted: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          booking_interval_minutes?: number | null
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          booking_interval_minutes?: number | null
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      service_variant: {
        Row: {
          client_duration_minutes: number
          company_id: string
          created_at: string
          display_order: number | null
          id: string
          image_path: string | null
          is_active: boolean | null
          is_deleted: boolean | null
          max_price: number | null
          name: string
          price: number
          price_net: number | null
          service_id: string
          staff_duration_minutes: number | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          client_duration_minutes: number
          company_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          max_price?: number | null
          name: string
          price: number
          price_net?: number | null
          service_id: string
          staff_duration_minutes?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          client_duration_minutes?: number
          company_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          max_price?: number | null
          name?: string
          price?: number
          price_net?: number | null
          service_id?: string
          staff_duration_minutes?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_variant_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variant_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
        ]
      }
      service_variant_phase: {
        Row: {
          company_id: string
          created_at: string
          duration_minutes: number
          id: string
          label: string | null
          phase_type: string
          sequence: number
          service_variant_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          duration_minutes: number
          id?: string
          label?: string | null
          phase_type: string
          sequence: number
          service_variant_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          label?: string | null
          phase_type?: string
          sequence?: number
          service_variant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_variant_phase_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variant_phase_service_variant_id_fkey"
            columns: ["service_variant_id"]
            isOneToOne: false
            referencedRelation: "service_variant"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          first_name: string | null
          hire_date: string | null
          id: string
          image_path: string | null
          last_name: string | null
          phone: string | null
          role: string | null
          slug: string | null
          specialization: string | null
          specialties: string[] | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          hire_date?: string | null
          id?: string
          image_path?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          slug?: string | null
          specialization?: string | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          hire_date?: string | null
          id?: string
          image_path?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          slug?: string | null
          specialization?: string | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_company: {
        Row: {
          company_id: string
          created_at: string
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_company_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_company_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_notes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          note: string | null
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          note?: string | null
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          note?: string | null
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_price_option: {
        Row: {
          company_id: string
          created_at: string
          price_option_id: string | null
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          price_option_id?: string | null
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          price_option_id?: string | null
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_price_option_price_option_id_fkey"
            columns: ["price_option_id"]
            isOneToOne: false
            referencedRelation: "price_option"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_price_option_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedule_exception: {
        Row: {
          company_id: string
          created_at: string
          ends_at: string
          id: string
          kind: string
          location_id: string
          staff_id: string
          starts_at: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          ends_at: string
          id?: string
          kind: string
          location_id?: string
          staff_id: string
          starts_at: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          kind?: string
          location_id?: string
          staff_id?: string
          starts_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedule_exception_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedule_exception_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedule_rule: {
        Row: {
          company_id: string
          created_at: string
          day_of_week: number
          effective_from: string | null
          effective_to: string | null
          end_time: string
          id: string
          is_active: boolean
          location_id: string
          staff_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          day_of_week: number
          effective_from?: string | null
          effective_to?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          location_id?: string
          staff_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          day_of_week?: number
          effective_from?: string | null
          effective_to?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          location_id?: string
          staff_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedule_rule_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedule_rule_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_service: {
        Row: {
          company_id: string
          created_at: string
          id: string
          service_id: string
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          service_id: string
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          service_id?: string
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_service_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_service_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_service_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_service_variant: {
        Row: {
          company_id: string
          created_at: string
          id: string
          service_variant_id: string
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          service_variant_id: string
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          service_variant_id?: string
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_service_variant_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_service_variant_service_variant_id_fkey"
            columns: ["service_variant_id"]
            isOneToOne: false
            referencedRelation: "service_variant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_service_variant_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_treatment: {
        Row: {
          company_id: string
          created_at: string
          staff_id: string
          treatment_id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          staff_id?: string
          treatment_id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          staff_id?: string
          treatment_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_treatment_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_treatment_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          company_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json | null
          plan_id: string | null
          start_date: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          company_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          start_date?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          company_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          start_date?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          interval: number | null
          is_active: boolean | null
          is_deleted: boolean | null
          name: string
          order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          interval?: number | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          name: string
          order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          interval?: number | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          name?: string
          order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      unavailability: {
        Row: {
          company_id: string
          created_at: string
          end: string | null
          id: string
          staff_id: string
          start: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at: string
          end?: string | null
          id?: string
          staff_id: string
          start?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          end?: string | null
          id?: string
          staff_id?: string
          start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unavailability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      create_appointment:
        | {
            Args: {
              p_actual_end: string
              p_actual_start: string
              p_client_id: string
              p_company_id: string
              p_duration_in_minutes: number
              p_end: string
              p_image_path: string
              p_notes: string
              p_price: number
              p_staff_id: string
              p_start: string
              p_treatments: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_actual_end: string
              p_actual_start: string
              p_client_id: string
              p_company_id: string
              p_duration_in_minutes: number
              p_end: string
              p_image_path?: string
              p_notes: string
              p_price: number
              p_staff_id: string
              p_start: string
              p_treatments?: Json
            }
            Returns: Json
          }
      create_appointment_staff:
        | {
            Args: {
              p_actual_end: string
              p_actual_start: string
              p_client_id: string
              p_company_id: string
              p_duration_in_minutes: number
              p_end: string
              p_image_path: string
              p_notes: string
              p_price: number
              p_staff_id: string
              p_start: string
              p_treatments: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_actual_end: string
              p_actual_start: string
              p_client_id: string
              p_company_id: string
              p_duration_in_minutes: number
              p_end: string
              p_image_path: string
              p_notes: string
              p_price: number
              p_staff_id: string
              p_staff_notes?: string
              p_start: string
              p_treatments: Json
            }
            Returns: Json
          }
      create_appointment_with_referral: {
        Args: {
          p_actual_end: string
          p_actual_start: string
          p_company_id: string
          p_duration_in_minutes: number
          p_email: string
          p_end: string
          p_first_name: string
          p_image_path: string
          p_last_name: string
          p_notes: string
          p_phone: string
          p_price: number
          p_referral_code?: string
          p_staff_id: string
          p_start: string
          p_treatments: Json
        }
        Returns: Json
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      my_company_ids: { Args: never; Returns: string[] }
      my_location_ids: { Args: never; Returns: string[] }
      my_locations: {
        Args: never
        Returns: {
          company_id: string
          id: string
          image_url: string | null
          is_active: boolean
          is_primary: boolean
          name: string
        }[]
      }
      my_memberships: {
        Args: never
        Returns: {
          company_id: string
          is_active: boolean
          location_id: string | null
          role_id: string
          role_name: string
          role_scope: string
          source: string
        }[]
      }
      nearby_companies: {
        Args: { radius_m?: number; user_lat: number; user_lon: number }
        Returns: {
          city: string
          distance_m: number
          id: string
          latitude: number
          longitude: number
          name: string
          postal_code: string
          street: string
        }[]
      }
      nearby_companies_v2: {
        Args: {
          radius_m: number
          search_term?: string
          user_lat: number
          user_lon: number
        }
        Returns: {
          city: string
          distance_m: number
          id: string
          latitude: number
          longitude: number
          name: string
          postal_code: string
          street: string
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      search_clients: {
        Args: { search_term: string }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          rank: number
        }[]
      }
      search_clients_by_company: {
        Args: { p_company_id?: string; search_term: string }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          rank: number
        }[]
      }
      search_companies: {
        Args: {
          radius_m: number
          searchterm?: string
          user_lat: number
          user_lon: number
        }
        Returns: {
          city: string
          distance_m: number
          id: string
          latitude: number
          longitude: number
          name: string
          postal_code: string
          street: string
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      truncate_table: { Args: { table_name: string }; Returns: undefined }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
