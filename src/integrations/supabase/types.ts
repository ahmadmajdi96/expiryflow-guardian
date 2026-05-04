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
      alert_thresholds: {
        Row: {
          action_description: string | null
          category: string | null
          created_at: string
          id: string
          max_days: number | null
          min_days: number
          product_id: string | null
          zone_name: string
        }
        Insert: {
          action_description?: string | null
          category?: string | null
          created_at?: string
          id?: string
          max_days?: number | null
          min_days: number
          product_id?: string | null
          zone_name: string
        }
        Update: {
          action_description?: string | null
          category?: string | null
          created_at?: string
          id?: string
          max_days?: number | null
          min_days?: number
          product_id?: string | null
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_thresholds_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      expiry_alerts: {
        Row: {
          action_taken: string | null
          alert_id: string
          batch_id: string
          created_at: string
          days_until_expiry: number
          id: string
          resolved: boolean
          resolved_at: string | null
          triggered_at: string
          zone: string
        }
        Insert: {
          action_taken?: string | null
          alert_id: string
          batch_id: string
          created_at?: string
          days_until_expiry: number
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          triggered_at?: string
          zone: string
        }
        Update: {
          action_taken?: string | null
          alert_id?: string
          batch_id?: string
          created_at?: string
          days_until_expiry?: number
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          triggered_at?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "expiry_alerts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      fefo_allocation_log: {
        Row: {
          allocated_by: string | null
          allocation_type: string
          batch_id: string
          created_at: string
          id: string
          location_code: string
          location_type: string
          quantity: number
        }
        Insert: {
          allocated_by?: string | null
          allocation_type: string
          batch_id: string
          created_at?: string
          id?: string
          location_code: string
          location_type: string
          quantity?: number
        }
        Update: {
          allocated_by?: string | null
          allocation_type?: string
          batch_id?: string
          created_at?: string
          id?: string
          location_code?: string
          location_type?: string
          quantity?: number
        }
        Relationships: []
      }
      inventory_batches: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string
          id: string
          location: string | null
          manufacturing_date: string | null
          po_line_id: string | null
          product_id: string
          qc_status: string
          quantity: number
          received_at: string | null
          received_by: string | null
          status: string
          store_id: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          expiry_date: string
          id?: string
          location?: string | null
          manufacturing_date?: string | null
          po_line_id?: string | null
          product_id: string
          qc_status?: string
          quantity?: number
          received_at?: string | null
          received_by?: string | null
          status?: string
          store_id: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string
          id?: string
          location?: string | null
          manufacturing_date?: string | null
          po_line_id?: string | null
          product_id?: string
          qc_status?: string
          quantity?: number
          received_at?: string | null
          received_by?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "po_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      markdown_proposals: {
        Row: {
          alert_id: string | null
          applied_at: string | null
          batch_id: string
          batch_number: string
          created_at: string
          current_price: number
          discount_percent: number
          id: string
          proposed_price: number
          reasoning: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          sku: string
          status: string
          urgency: string
        }
        Insert: {
          alert_id?: string | null
          applied_at?: string | null
          batch_id: string
          batch_number: string
          created_at?: string
          current_price: number
          discount_percent: number
          id?: string
          proposed_price: number
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          sku: string
          status?: string
          urgency?: string
        }
        Update: {
          alert_id?: string | null
          applied_at?: string | null
          batch_id?: string
          batch_number?: string
          created_at?: string
          current_price?: number
          discount_percent?: number
          id?: string
          proposed_price?: number
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          sku?: string
          status?: string
          urgency?: string
        }
        Relationships: []
      }
      pick_request_lines: {
        Row: {
          allocated_quantity: number
          batch_id: string
          created_at: string
          id: string
          location_code: string | null
          location_type: string
          pick_request_id: string
          picked_quantity: number
          scanned_at: string | null
        }
        Insert: {
          allocated_quantity: number
          batch_id: string
          created_at?: string
          id?: string
          location_code?: string | null
          location_type?: string
          pick_request_id: string
          picked_quantity?: number
          scanned_at?: string | null
        }
        Update: {
          allocated_quantity?: number
          batch_id?: string
          created_at?: string
          id?: string
          location_code?: string | null
          location_type?: string
          pick_request_id?: string
          picked_quantity?: number
          scanned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_request_lines_pick_request_id_fkey"
            columns: ["pick_request_id"]
            isOneToOne: false
            referencedRelation: "pick_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          fulfilled_quantity: number
          id: string
          pick_code: string
          product_id: string
          requested_by: string | null
          requested_quantity: number
          status: string
          store_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          fulfilled_quantity?: number
          id?: string
          pick_code: string
          product_id: string
          requested_by?: string | null
          requested_quantity: number
          status?: string
          store_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          fulfilled_quantity?: number
          id?: string
          pick_code?: string
          product_id?: string
          requested_by?: string | null
          requested_quantity?: number
          status?: string
          store_id?: string
        }
        Relationships: []
      }
      po_lines: {
        Row: {
          created_at: string
          id: string
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received: number
        }
        Insert: {
          created_at?: string
          id?: string
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received?: number
        }
        Update: {
          created_at?: string
          id?: string
          po_id?: string
          product_id?: string
          quantity_ordered?: number
          quantity_received?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          current_price: number | null
          expiry_trackable: boolean
          id: string
          name: string
          shelf_life_days: number | null
          sku: string
          unit_cost: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_price?: number | null
          expiry_trackable?: boolean
          id?: string
          name: string
          shelf_life_days?: number | null
          sku: string
          unit_cost?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          current_price?: number | null
          expiry_trackable?: boolean
          id?: string
          name?: string
          shelf_life_days?: number | null
          sku?: string
          unit_cost?: number | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          po_number: string
          status: string
          supplier_id: string
          supplier_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          po_number: string
          status?: string
          supplier_id: string
          supplier_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          po_number?: string
          status?: string
          supplier_id?: string
          supplier_name?: string | null
        }
        Relationships: []
      }
      qc_inspections: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          inspected_at: string | null
          inspector_id: string | null
          notes: string | null
          result: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspector_id?: string | null
          notes?: string | null
          result?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspector_id?: string | null
          notes?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_inspections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          from_store_id: string
          id: string
          quantity: number
          status: string
          to_store_id: string
          transfer_code: string
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_store_id: string
          id?: string
          quantity: number
          status?: string
          to_store_id: string
          transfer_code: string
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_store_id?: string
          id?: string
          quantity?: number
          status?: string
          to_store_id?: string
          transfer_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          store_code: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          store_code: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          store_code?: string
        }
        Relationships: []
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
      webhook_event_log: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          po_number: string | null
          processed_at: string
          sku: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          po_number?: string | null
          processed_at?: string
          sku?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          po_number?: string | null
          processed_at?: string
          sku?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "warehouse_clerk" | "qc_inspector" | "store_manager" | "admin"
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
      app_role: ["warehouse_clerk", "qc_inspector", "store_manager", "admin"],
    },
  },
} as const
