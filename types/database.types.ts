/**
 * Hand-written types matching /supabase/migrations/ until the project is
 * linked. Once linked, regenerate with:
 *
 *   pnpm dlx supabase gen types typescript --linked > types/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CatalogEditAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
            isOneToOne: true;
          },
        ];
      };
      catalog_proposal_types: {
        Row: {
          id: string;
          slug: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      catalog_site_types: {
        Row: {
          id: string;
          slug: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      catalogs: {
        Row: {
          id: string;
          site_name: string;
          customer_name: string;
          proposal_type_id: string | null;
          site_type_id: string | null;
          design_tool: string | null;
          file_path: string | null;
          catalog_url: string | null;
          memo: string | null;
          image_url: string | null;
          thumbnail_url: string | null;
          author_name: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          site_name: string;
          customer_name: string;
          proposal_type_id?: string | null;
          site_type_id?: string | null;
          design_tool?: string | null;
          file_path?: string | null;
          catalog_url?: string | null;
          memo?: string | null;
          image_url?: string | null;
          thumbnail_url?: string | null;
          author_name?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          site_name?: string;
          customer_name?: string;
          proposal_type_id?: string | null;
          site_type_id?: string | null;
          design_tool?: string | null;
          file_path?: string | null;
          catalog_url?: string | null;
          memo?: string | null;
          image_url?: string | null;
          thumbnail_url?: string | null;
          author_name?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalogs_proposal_type_id_fkey";
            columns: ["proposal_type_id"];
            referencedRelation: "catalog_proposal_types";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "catalogs_site_type_id_fkey";
            columns: ["site_type_id"];
            referencedRelation: "catalog_site_types";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "catalogs_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      allowed_ips: {
        Row: {
          id: string;
          ip_address: string;
          label: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_address: string;
          label: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          ip_address?: string;
          label?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      catalog_edit_logs: {
        Row: {
          id: string;
          catalog_id: string;
          actor_id: string | null;
          action: CatalogEditAction;
          changes: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          catalog_id: string;
          actor_id?: string | null;
          action: CatalogEditAction;
          changes?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          catalog_id?: string;
          actor_id?: string | null;
          action?: CatalogEditAction;
          changes?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_edit_logs_catalog_id_fkey";
            columns: ["catalog_id"];
            referencedRelation: "catalogs";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "catalog_edit_logs_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      touch_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
