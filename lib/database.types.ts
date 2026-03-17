export type JsonObject = {
  [key: string]: Json | undefined;
};

export type Json = string | number | boolean | null | JsonObject | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          telegram_user_id: number | null;
          telegram_username: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          telegram_user_id?: number | null;
          telegram_username?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          telegram_user_id?: number | null;
          telegram_username?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      score_events: {
        Row: {
          created_at: string;
          event_day: number | null;
          id: string;
          metadata: Json;
          points: number;
          reason: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_day?: number | null;
          id?: string;
          metadata?: Json;
          points: number;
          reason: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_day?: number | null;
          id?: string;
          metadata?: Json;
          points?: number;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "score_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      event_participation: {
        Row: {
          completed_at: string | null;
          created_at: string;
          event_day: number;
          id: string;
          metadata: Json;
          started_at: string | null;
          status: "locked" | "available" | "in_progress" | "completed";
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          event_day: number;
          id?: string;
          metadata?: Json;
          started_at?: string | null;
          status?: "locked" | "available" | "in_progress" | "completed";
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          event_day?: number;
          id?: string;
          metadata?: Json;
          started_at?: string | null;
          status?: "locked" | "available" | "in_progress" | "completed";
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_participation_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      family_groups: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          invite_code: string;
          owner_id: string;
          status: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          invite_code: string;
          owner_id: string;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          invite_code?: string;
          owner_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_groups_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      family_group_members: {
        Row: {
          group_id: string;
          id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          id?: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "family_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "family_group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      kindness_cards: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          recipient_id: string;
          sender_id: string;
          template_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          recipient_id: string;
          sender_id: string;
          template_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          recipient_id?: string;
          sender_id?: string;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kindness_cards_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kindness_cards_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_queue: {
        Row: {
          joined_at: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_queue_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_pairs: {
        Row: {
          assigned_at: string;
          completed_at: string | null;
          id: string;
          pair_code: string;
          status: "pending" | "matched" | "confirmed" | "expired" | "reassigned";
          user_a_id: string;
          user_b_id: string;
        };
        Insert: {
          assigned_at?: string;
          completed_at?: string | null;
          id?: string;
          pair_code: string;
          status?: "pending" | "matched" | "confirmed" | "expired" | "reassigned";
          user_a_id: string;
          user_b_id: string;
        };
        Update: {
          assigned_at?: string;
          completed_at?: string | null;
          id?: string;
          pair_code?: string;
          status?: "pending" | "matched" | "confirmed" | "expired" | "reassigned";
          user_a_id?: string;
          user_b_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_pairs_user_a_id_fkey";
            columns: ["user_a_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_pairs_user_b_id_fkey";
            columns: ["user_b_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_confirmations: {
        Row: {
          confirmed_at: string;
          id: string;
          pair_id: string;
          user_id: string;
        };
        Insert: {
          confirmed_at?: string;
          id?: string;
          pair_id: string;
          user_id: string;
        };
        Update: {
          confirmed_at?: string;
          id?: string;
          pair_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_confirmations_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "meeting_pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_confirmations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          pair_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          pair_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          pair_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_messages_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "meeting_pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      race_room_members: {
        Row: {
          id: string;
          joined_at: string;
          room_id: string;
          tap_count: number;
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string;
          room_id: string;
          tap_count?: number;
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string;
          room_id?: string;
          tap_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "race_room_members_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "race_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "race_room_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      race_rooms: {
        Row: {
          created_at: string;
          duration_seconds: number;
          finished_at: string | null;
          id: string;
          invite_code: string;
          owner_id: string;
          started_at: string | null;
          status: string;
          winner_id: string | null;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number;
          finished_at?: string | null;
          id?: string;
          invite_code: string;
          owner_id: string;
          started_at?: string | null;
          status?: string;
          winner_id?: string | null;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number;
          finished_at?: string | null;
          id?: string;
          invite_code?: string;
          owner_id?: string;
          started_at?: string | null;
          status?: string;
          winner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "race_rooms_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "race_rooms_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      kindness_live_stats: {
        Row: {
          active_senders: number | null;
          total_cards_sent: number | null;
        };
        Relationships: [];
      };
      leaderboard: {
        Row: {
          display_name: string;
          score: number;
          telegram_username: string | null;
          user_id: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_family_group: {
        Args: {
          p_user_id: string;
        };
        Returns: Database["public"]["Tables"]["family_groups"]["Row"];
      };
      generate_family_invite_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_current_score: {
        Args: {
          profile_id: string;
        };
        Returns: number;
      };
      confirm_meeting_pair: {
        Args: {
          p_pair_id: string;
          p_user_id: string;
        };
        Returns: Database["public"]["Tables"]["meeting_pairs"]["Row"];
      };
      find_or_create_meeting_pair: {
        Args: {
          p_user_id: string;
        };
        Returns: Database["public"]["Tables"]["meeting_pairs"]["Row"] | null;
      };
      reassign_meeting_pair: {
        Args: {
          p_user_id: string;
        };
        Returns: Database["public"]["Tables"]["meeting_pairs"]["Row"] | null;
      };
      join_family_group: {
        Args: {
          p_invite_code: string;
          p_user_id: string;
        };
        Returns: Database["public"]["Tables"]["family_groups"]["Row"];
      };
      leave_family_group: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
      send_kindness_card: {
        Args: {
          p_message: string;
          p_recipient_id: string;
          p_sender_id: string;
          p_template_id: string;
        };
        Returns: Database["public"]["Tables"]["kindness_cards"]["Row"];
      };
      register_pvp_race_taps: {
        Args: {
          p_room_id: string;
          p_tap_count: number;
          p_user_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      event_progress_status: "locked" | "available" | "in_progress" | "completed";
      meeting_pair_status: "pending" | "matched" | "confirmed" | "expired" | "reassigned";
    };
    CompositeTypes: Record<string, never>;
  };
};
