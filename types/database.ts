export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: number;
          room_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: number;
          room_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: number;
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'chat_rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_rooms: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_default_room: boolean | null;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_default_room?: boolean | null;
          name: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_default_room?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      playlist_tracks: {
        Row: {
          added_at: string | null;
          album_art_url: string | null;
          album_name: string | null;
          audio_features: Json | null;
          created_at: string;
          duration_ms: number | null;
          id: number;
          order_in_playlist: number;
          playlist_id: string;
          track_artists: Json | null;
          track_name: string;
          track_popularity: number | null;
          track_preview_url: string | null;
          track_spotify_id: string;
        };
        Insert: {
          added_at?: string | null;
          album_art_url?: string | null;
          album_name?: string | null;
          audio_features?: Json | null;
          created_at?: string;
          duration_ms?: number | null;
          id?: number;
          order_in_playlist: number;
          playlist_id: string;
          track_artists?: Json | null;
          track_name: string;
          track_popularity?: number | null;
          track_preview_url?: string | null;
          track_spotify_id: string;
        };
        Update: {
          added_at?: string | null;
          album_art_url?: string | null;
          album_name?: string | null;
          audio_features?: Json | null;
          created_at?: string;
          duration_ms?: number | null;
          id?: number;
          order_in_playlist?: number;
          playlist_id?: string;
          track_artists?: Json | null;
          track_name?: string;
          track_popularity?: number | null;
          track_preview_url?: string | null;
          track_spotify_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'playlist_tracks_playlist_id_fkey';
            columns: ['playlist_id'];
            isOneToOne: false;
            referencedRelation: 'playlists';
            referencedColumns: ['id'];
          },
        ];
      };
      playlists: {
        Row: {
          created_at: string;
          data_source: string | null;
          description: string | null;
          id: string;
          image_url: string | null;
          last_fetched_from_spotify_at: string | null;
          name: string;
          owner_spotify_user_id: string | null;
          snapshot_id: string | null;
          spotify_playlist_id: string;
          submitted_by_user_id: string | null;
          total_tracks: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          data_source?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          last_fetched_from_spotify_at?: string | null;
          name: string;
          owner_spotify_user_id?: string | null;
          snapshot_id?: string | null;
          spotify_playlist_id: string;
          submitted_by_user_id?: string | null;
          total_tracks?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          data_source?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          last_fetched_from_spotify_at?: string | null;
          name?: string;
          owner_spotify_user_id?: string | null;
          snapshot_id?: string | null;
          spotify_playlist_id?: string;
          submitted_by_user_id?: string | null;
          total_tracks?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'playlists_submitted_by_user_id_fkey';
            columns: ['submitted_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          id: string;
          spotify_user_id: string | null;
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          id: string;
          spotify_user_id?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          id?: string;
          spotify_user_id?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };

      user_top_artists: {
        Row: {
          artist_spotify_id: string;
          fetched_at: string;
          genres: Json | null;
          image_url: string | null;
          name: string;
          popularity: number | null;
          user_id: string;
        };
        Insert: {
          artist_spotify_id: string;
          fetched_at?: string;
          genres?: Json | null;
          image_url?: string | null;
          name: string;
          popularity?: number | null;
          user_id: string;
        };
        Update: {
          artist_spotify_id?: string;
          fetched_at?: string;
          genres?: Json | null;
          image_url?: string | null;
          name?: string;
          popularity?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_top_artists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_top_tracks: {
        Row: {
          album_image_url: string | null;
          album_name: string | null;
          album_spotify_id: string | null;
          artists: Json | null;
          duration_ms: number | null;
          fetched_at: string;
          name: string;
          popularity: number | null;
          preview_url: string | null;
          track_spotify_id: string;
          user_id: string;
        };
        Insert: {
          album_image_url?: string | null;
          album_name?: string | null;
          album_spotify_id?: string | null;
          artists?: Json | null;
          duration_ms?: number | null;
          fetched_at?: string;
          name: string;
          popularity?: number | null;
          preview_url?: string | null;
          track_spotify_id: string;
          user_id: string;
        };
        Update: {
          album_image_url?: string | null;
          album_name?: string | null;
          album_spotify_id?: string | null;
          artists?: Json | null;
          duration_ms?: number | null;
          fetched_at?: string;
          name?: string;
          popularity?: number | null;
          preview_url?: string | null;
          track_spotify_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_top_tracks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      room_role: 'DJ' | 'member';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      room_role: ['DJ', 'member'],
    },
  },
} as const;
