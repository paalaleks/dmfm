# Playlist Chat Rooms: Data Models (MVP)

This document describes the database schema for the Minimum Viable Product (MVP) of the "Playlist Chat Rooms" application. The database is hosted on Supabase (PostgreSQL).

### 1. Overview

The MVP data model focuses on storing user profiles, chat rooms, and chat messages. Future phases will extend this model to include data related to Spotify playlists, user music tastes, and dynamic room management.

All tables are created in the `public` schema. Row Level Security (RLS) is enabled on all tables.

**General Conventions:**
*   Table names are plural and use `snake_case`.
*   Column names are singular and use `snake_case`.
*   Primary keys are typically `UUID` or `BIGSERIAL`.
*   Timestamps (`TIMESTAMPTZ`) store time with time zone.
*   Foreign keys are used to maintain relational integrity.

### 2. Table Definitions

#### 2.1. `profiles`

Stores public user profile information, linked to Supabase's `auth.users` table.

*   **Purpose:** To hold user-specific data not stored in `auth.users`, such as display name, avatar, and Spotify-specific identifiers.
*   **SQL Definition:**
    ```sql
    CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        updated_at TIMESTAMPTZ DEFAULT now(),
        username TEXT UNIQUE,
        avatar_url TEXT,
        spotify_user_id TEXT UNIQUE,
        CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50)
    );
    COMMENT ON TABLE public.profiles IS 'Stores public user profile information linked to Supabase Auth users, including Spotify details.';
    COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id; one-to-one relationship.';
    COMMENT ON COLUMN public.profiles.username IS 'User-chosen display name, must be unique.';
    COMMENT ON COLUMN public.profiles.avatar_url IS 'URL of the user\'s Spotify avatar.';
    COMMENT ON COLUMN public.profiles.spotify_user_id IS 'The user\'s unique Spotify ID.';
    ```
*   **Columns:**
    *   `id (UUID, PK)`: Foreign key referencing `auth.users.id`. Ensures a one-to-one link with the authentication record. Cascade delete ensures profile is removed if auth user is deleted.
    *   `updated_at (TIMESTAMPTZ)`: Timestamp of the last update to the profile. Defaults to `now()`.
    *   `username (TEXT, UNIQUE)`: User's display name. Must be between 3 and 50 characters and unique.
    *   `avatar_url (TEXT)`: URL for the user's Spotify avatar.
    *   `spotify_user_id (TEXT, UNIQUE)`: The user's unique identifier from Spotify.
*   **RLS Policies:**
    *   `CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);`
    *   `CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`
    *   `CREATE POLICY "Users can view all profiles." ON public.profiles FOR SELECT USING (true);`
*   **Triggers:**
    *   `on_auth_user_created`: An `AFTER INSERT` trigger on `auth.users` calls `public.handle_new_user()` function to automatically populate this table upon new user signup.
        ```sql
        -- Function to create a profile for a new user
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SECURITY DEFINER SET search_path = public
        AS $$
        BEGIN
          INSERT INTO public.profiles (id, spotify_user_id, avatar_url, username)
          VALUES (
            NEW.id,
            NEW.raw_user_meta_data->>'provider_id',
            NEW.raw_user_meta_data->>'avatar_url',
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'user_name', NEW.email)
          );
          RETURN NEW;
        END;
        $$;

        -- Trigger to call the function when a new user is created in auth.users
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        ```

#### 2.2. `chat_rooms`

Stores information about chat rooms available in the application.

*   **Purpose:** To define distinct spaces for users to chat. For MVP, one default room exists.
*   **SQL Definition:**
    ```sql
    CREATE TABLE public.chat_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT now(),
        name TEXT NOT NULL,
        description TEXT,
        is_default_room BOOLEAN DEFAULT FALSE
    );
    COMMENT ON TABLE public.chat_rooms IS 'Stores information about chat rooms. Initially one default room.';
    COMMENT ON COLUMN public.chat_rooms.is_default_room IS 'Flag to identify the main default chat room (FR3.1).';
    ```
*   **Columns:**
    *   `id (UUID, PK)`: Unique identifier for the chat room. Defaults to a random UUID.
    *   `created_at (TIMESTAMPTZ)`: Timestamp of when the room was created. Defaults to `now()`.
    *   `name (TEXT, NOT NULL)`: Name of the chat room.
    *   `description (TEXT)`: Optional description for the chat room.
    *   `is_default_room (BOOLEAN)`: Flag to indicate if this is the main default chat room (FR3.1). Defaults to `FALSE`.
*   **RLS Policies:**
    *   `CREATE POLICY "Users can view all chat rooms." ON public.chat_rooms FOR SELECT USING (true);`
    *   `CREATE POLICY "Allow service_role to insert chat rooms" ON public.chat_rooms FOR INSERT WITH CHECK (auth.role() = 'service_role');` (For seeding the default room).
*   **Seed Data:**
    ```sql
    INSERT INTO public.chat_rooms (name, description, is_default_room)
    VALUES ('General Music Chat', 'A place for all music lovers to chat and discover.', TRUE);
    ```

#### 2.3. `chat_messages`

Stores individual chat messages sent by users in chat rooms.

*   **Purpose:** To persist the history of communication within chat rooms.
*   **SQL Definition:**
    ```sql
    CREATE TABLE public.chat_messages (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT now(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        CONSTRAINT message_content_length CHECK (char_length(content) > 0 AND char_length(content) <= 5000)
    );
    COMMENT ON TABLE public.chat_messages IS 'Stores individual chat messages sent by users.';
    COMMENT ON COLUMN public.chat_messages.user_id IS 'References the profile of the user who sent the message.';
    COMMENT ON COLUMN public.chat_messages.room_id IS 'References the chat room where the message was sent.';
    ```
*   **Columns:**
    *   `id (BIGSERIAL, PK)`: Auto-incrementing unique identifier for the message.
    *   `created_at (TIMESTAMPTZ)`: Timestamp of when the message was created. Defaults to `now()`.
    *   `user_id (UUID, FK, NOT NULL)`: Foreign key referencing `public.profiles.id`. Identifies the sender. Cascade delete ensures messages are removed if the user profile is deleted.
    *   `room_id (UUID, FK, NOT NULL)`: Foreign key referencing `public.chat_rooms.id`. Identifies the room. Cascade delete ensures messages are removed if the room is deleted.
    *   `content (TEXT, NOT NULL)`: The text content of the message. Max length 5000 characters.
*   **RLS Policies:**
    *   `CREATE POLICY "Users can insert their own messages." ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid()));`
    *   `CREATE POLICY "Users can view all messages." ON public.chat_messages FOR SELECT USING (true);`
    *   `CREATE POLICY "Users can update their own messages." ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);` (Optional, for message editing).
    *   `CREATE POLICY "Users can delete their own messages." ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);` (Optional, for message deletion).

#### 2.4. `playlists` (Existing, to be Altered)

*   **Purpose:** Stores metadata about Spotify playlists relevant to the application, such as those shared by users or used for recommendations.
*   **Status:** Existing table, will be altered to add new fields.
*   **Original SQL Definition (Conceptual - for context):**
    ```sql
    -- This reflects the state found via list_tables
    CREATE TABLE public.playlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spotify_playlist_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        owner_spotify_user_id TEXT,
        image_url TEXT,
        submitted_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Assuming ON DELETE SET NULL
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    ```
*   **Planned Alterations:**
    *   Add `total_tracks INTEGER`
    *   Add `snapshot_id TEXT`
    *   Add `data_source TEXT` (e.g., 'user_shared', 'spotify_recommendation', 'user_library')
    *   Add `last_fetched_from_spotify_at TIMESTAMPTZ`
*   **Columns (Post-Alteration):**
    *   `id (UUID, PK)`: Internal unique identifier for the playlist record.
    *   `spotify_playlist_id (TEXT, UNIQUE, NOT NULL)`: The unique identifier for the playlist on Spotify.
    *   `name (TEXT, NOT NULL)`: Name of the Spotify playlist.
    *   `description (TEXT)`: Description of the Spotify playlist.
    *   `owner_spotify_user_id (TEXT)`: The Spotify user ID of the playlist's original creator on Spotify.
    *   `image_url (TEXT)`: URL for the playlist's cover image.
    *   `submitted_by_user_id (UUID, FK)`: References `public.profiles.id`. The application user who submitted or imported this playlist. Nullable if system-added.
    *   `total_tracks (INTEGER)`: Total number of tracks in the playlist on Spotify.
    *   `snapshot_id (TEXT)`: Spotify's ID for the current version of the playlist's tracks. Used to detect changes.
    *   `data_source (TEXT)`: Indicates how this playlist was added to the system (e.g., 'user_shared', 'spotify_library_import', 'system_recommendation').
    *   `created_at (TIMESTAMPTZ)`: Timestamp of when the record was created in our database.
    *   `updated_at (TIMESTAMPTZ)`: Timestamp of the last update to this record in our database.
    *   `last_fetched_from_spotify_at (TIMESTAMPTZ)`: Timestamp of when this playlist's details were last fetched/updated from Spotify.
*   **RLS Policies (Example for new state - to be confirmed/refined in migration):**
    *   `CREATE POLICY "Authenticated users can view all playlists." ON public.playlists FOR SELECT USING (auth.role() = 'authenticated');`
    *   `CREATE POLICY "Users can insert playlists they submit." ON public.playlists FOR INSERT WITH CHECK (auth.uid() = submitted_by_user_id);`
    *   `CREATE POLICY "Users can delete their own playlists" ON public.playlists FOR DELETE USING (auth.uid() = submitted_by_user_id);`
    *   `CREATE POLICY "Service role can manage playlists." ON public.playlists FOR ALL USING (auth.role() = 'service_role');`

#### 2.5. `playlist_items` (Existing as `playlist_tracks`, to be Altered)

*   **Purpose:** Stores details about individual tracks within the playlists stored in the `playlists` table.
*   **Status:** Existing table (named `playlist_tracks`), will be altered for richer data and renamed conceptually in docs to `playlist_items` for clarity (actual table name `playlist_tracks` will be kept for migration simplicity if preferred, or renamed in migration). For this document, we'll use `playlist_items`.
*   **Original SQL Definition (Conceptual - for context of `playlist_tracks`):**
    ```sql
    -- This reflects the state found via list_tables for playlist_tracks
    CREATE TABLE public.playlist_tracks (
        id BIGSERIAL PRIMARY KEY,
        playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
        track_spotify_id TEXT NOT NULL,
        track_name TEXT NOT NULL,
        artist_names TEXT[], -- ARRAY
        album_name TEXT,
        album_art_url TEXT,
        duration_ms INTEGER,
        order_in_playlist INTEGER NOT NULL, -- 0-based
        added_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
    );
    ```
*   **Planned Alterations (on `playlist_tracks`):**
    *   Change `artist_names TEXT[]` to `track_artists JSONB`.
    *   Add `track_popularity INTEGER`.
    *   Add `track_preview_url TEXT`.
    *   Add `audio_features JSONB`.
    *   Rename `album_art_url` to `track_album_image_url` for consistency if desired, or keep.
    *   Rename `order_in_playlist` to `position` for consistency if desired, or keep.
*   **Columns (Post-Alteration, using conceptual name `playlist_items`):**
    *   `id (BIGSERIAL, PK)`: Internal unique identifier for the playlist item record.
    *   `playlist_id (UUID, FK, NOT NULL)`: Foreign key referencing `public.playlists.id`.
    *   `track_spotify_id (TEXT, NOT NULL)`: The unique Spotify ID for the track.
    *   `position (INTEGER, NOT NULL)`: The 0-based position of the track within the Spotify playlist (was `order_in_playlist`).
    *   `track_name (TEXT, NOT NULL)`: Name of the track.
    *   `track_artists (JSONB)`: Array of artist objects, e.g., `[{"spotify_id": "...", "name": "..."}]`. (Was `artist_names TEXT[]`).
    *   `track_album_name (TEXT)`: Name of the track's album. (Was `album_name`).
    *   `track_album_image_url (TEXT)`: URL for the track's album cover. (Was `album_art_url`).
    *   `track_duration_ms (INTEGER)`: Duration of the track in milliseconds. (Was `duration_ms`).
    *   `track_popularity (INTEGER)`: Popularity of the track on Spotify (0-100). (New)
    *   `track_preview_url (TEXT)`: URL to a 30-second preview of the track. (New)
    *   `audio_features (JSONB)`: Detailed audio features from Spotify (e.g., danceability, energy, valence). (New)
    *   `added_to_spotify_playlist_at (TIMESTAMPTZ)`: Timestamp when the track was added to the original Spotify playlist. (Was `added_at`).
    *   `created_at (TIMESTAMPTZ)`: Timestamp of when the record was created in our database.
*   **RLS Policies (Example for new state - to be confirmed/refined in migration):**
    *   `CREATE POLICY "Authenticated users can view all playlist items." ON public.playlist_tracks FOR SELECT USING (auth.role() = 'authenticated');`
    *   `CREATE POLICY "Service role can manage playlist items." ON public.playlist_tracks FOR ALL USING (auth.role() = 'service_role');`

#### 2.6. `user_top_artists` (New Table)

*   **Purpose:** Stores a user's top artists from Spotify, periodically updated.
*   **SQL Definition:**
    ```sql
    CREATE TABLE public.user_top_artists (
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        artist_spotify_id TEXT NOT NULL,
        name TEXT NOT NULL,
        genres JSONB, -- Array of genre strings
        popularity INTEGER, -- Spotify popularity score (0-100)
        image_url TEXT,
        fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        PRIMARY KEY (user_id, artist_spotify_id)
    );
    COMMENT ON TABLE public.user_top_artists IS 'Stores a user's top artists from Spotify, periodically updated.';
    COMMENT ON COLUMN public.user_top_artists.user_id IS 'Link to the user in public.profiles.';
    COMMENT ON COLUMN public.user_top_artists.artist_spotify_id IS 'Spotify ID for the artist.';
    COMMENT ON COLUMN public.user_top_artists.genres IS 'Array of genre strings associated with the artist.';
    COMMENT ON COLUMN public.user_top_artists.popularity IS 'Spotify popularity score (0-100) for the artist.';
    COMMENT ON COLUMN public.user_top_artists.fetched_at IS 'Timestamp when this artist data was fetched for the user.';
    ```
*   **RLS Policies:**
    *   `CREATE POLICY "Users can view their own top artists." ON public.user_top_artists FOR SELECT USING (auth.uid() = user_id);`
    *   `CREATE POLICY "Users can insert/update their own top artists." ON public.user_top_artists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
    *   `CREATE POLICY "Service role can manage user top artists." ON public.user_top_artists FOR ALL USING (auth.role() = 'service_role');`

#### 2.7. `user_top_tracks` (New Table)

*   **Purpose:** Stores a user's top tracks from Spotify, periodically updated.
*   **SQL Definition:**
    ```sql
    CREATE TABLE public.user_top_tracks (
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        track_spotify_id TEXT NOT NULL,
        name TEXT NOT NULL,
        artists JSONB, -- Array of artist objects, e.g., [{"spotify_id": "...", "name": "..."}]
        album_spotify_id TEXT, -- Spotify ID for the track's album
        album_name TEXT,
        album_image_url TEXT,
        popularity INTEGER, -- Spotify popularity score (0-100)
        duration_ms INTEGER,
        preview_url TEXT,
        fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        PRIMARY KEY (user_id, track_spotify_id)
    );
    COMMENT ON TABLE public.user_top_tracks IS 'Stores a user's top tracks from Spotify, periodically updated.';
    COMMENT ON COLUMN public.user_top_tracks.user_id IS 'Link to the user in public.profiles.';
    COMMENT ON COLUMN public.user_top_tracks.track_spotify_id IS 'Spotify ID for the track.';
    COMMENT ON COLUMN public.user_top_tracks.artists IS 'Array of artist objects, e.g., [{"spotify_id": "...", "name": "..."}].';
    COMMENT ON COLUMN public.user_top_tracks.album_spotify_id IS 'Spotify ID for the track''s album.';
    COMMENT ON COLUMN public.user_top_tracks.popularity IS 'Spotify popularity score (0-100) for the track.';
    COMMENT ON COLUMN public.user_top_tracks.fetched_at IS 'Timestamp when this track data was fetched for the user.';
    ```
*   **RLS Policies:**
    *   `CREATE POLICY "Users can view their own top tracks." ON public.user_top_tracks FOR SELECT USING (auth.uid() = user_id);`
    *   `CREATE POLICY "Users can insert/update their own top tracks." ON public.user_top_tracks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
    *   `CREATE POLICY "Service role can manage user top tracks." ON public.user_top_tracks FOR ALL USING (auth.role() = 'service_role');`

#### 2.8. `user_playlist_interactions` (New Table)

*   **Purpose:** Tracks various ways users interact with playlists within the application.
*   **SQL Definition:**
    ```sql
    CREATE TABLE public.user_playlist_interactions (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE, -- Links to playlists.id (UUID)
        interaction_type TEXT NOT NULL, -- e.g., 'played_in_app', 'shared_in_chat', 'saved_to_library_via_app', 'matched_by_taste_algorithm'
        interacted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        metadata JSONB -- For extra details, e.g., taste match score, chat message ID if shared.
    );
    COMMENT ON TABLE public.user_playlist_interactions IS 'Tracks various ways users interact with playlists within the application.';
    COMMENT ON COLUMN public.user_playlist_interactions.playlist_id IS 'Link to the playlist in public.playlists (using internal UUID).';
    COMMENT ON COLUMN public.user_playlist_interactions.interaction_type IS 'Categorizes the interaction, e.g., played_in_app, shared_in_chat.';
    COMMENT ON COLUMN public.user_playlist_interactions.metadata IS 'Flexible JSONB field for additional interaction-specific data.';
    ```
*   **RLS Policies:**
    *   `CREATE POLICY "Users can view their own interactions." ON public.user_playlist_interactions FOR SELECT USING (auth.uid() = user_id);`
    *   `CREATE POLICY "Users can insert their own interactions." ON public.user_playlist_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);`
    *   `CREATE POLICY "Service role can manage interactions." ON public.user_playlist_interactions FOR ALL USING (auth.role() = 'service_role');`


*   **Purpose (Original):** Stores aggregated music taste information for users based on their Spotify activity.
*   **Status:** Existing table. Its future is undetermined; it might be deprecated in favor of granular `user_top_artists`/`user_top_tracks` or serve as an aggregated summary. No changes planned in this story.
*   **Existing SQL Definition (Conceptual - from list_tables):**
    ```sql
    CREATE TABLE public.user_taste_profiles (
        user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
        top_artist_ids TEXT[], -- Array of Spotify artist IDs
        top_track_ids TEXT[],  -- Array of Spotify track IDs
        last_updated TIMESTAMPTZ DEFAULT now()
    );
    ```
*   **Columns (Existing):**
    *   `user_id (UUID, PK, FK)`: Links to `public.profiles.id`.
    *   `top_artist_ids (TEXT[])`: Array of Spotify artist IDs.
    *   `top_track_ids (TEXT[])`: Array of Spotify track IDs.
    *   `last_updated (TIMESTAMPTZ)`: Timestamp of the last update.

### 3. Relationships (Entity Relationship Diagram - Mermaid)

```mermaid
erDiagram
    "auth.users" ||--|| profiles : "has profile (1-to-1)"
    profiles ||--o{ chat_messages : "sends"
    profiles ||--o{ user_top_artists : "has top artists"
    profiles ||--o{ user_top_tracks : "has top tracks"
    profiles ||--o{ user_playlist_interactions : "interacts with"
    profiles ||--o{ playlists : "submits" (submitted_by_user_id)
    profiles ||--|| user_taste_profiles : "has taste profile (1-to-1, existing)"

    chat_rooms ||--o{ chat_messages : "contains"

    playlists ||--o{ playlist_items : "contains items"
    playlists ||--o{ user_playlist_interactions : "is target of interaction"

    "auth.users" {
        UUID id PK "Supabase Auth User ID"
        jsonb raw_user_meta_data
        # ... other auth.users columns
    }

    profiles {
        UUID id PK "FK to auth.users.id"
        TIMESTAMPTZ updated_at
        TEXT username UNIQUE
        TEXT avatar_url
        TEXT spotify_user_id UNIQUE
    }

    chat_rooms {
        UUID id PK
        TIMESTAMPTZ created_at
        TEXT name
        TEXT description
        BOOLEAN is_default_room
    }

    chat_messages {
        BIGINT id PK "BIGSERIAL"
        TIMESTAMPTZ created_at
        UUID user_id FK "to profiles.id"
        UUID room_id FK "to chat_rooms.id"
        TEXT content
    }

    playlists {
        UUID id PK "Internal App ID"
        TEXT spotify_playlist_id UK "Spotify Playlist ID"
        TEXT name
        TEXT description
        TEXT owner_spotify_user_id
        TEXT image_url
        UUID submitted_by_user_id FK "to profiles.id (nullable)"
        INTEGER total_tracks
        TEXT snapshot_id
        TEXT data_source
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ last_fetched_from_spotify_at
    }

    playlist_items {
        BIGINT id PK "BIGSERIAL"
        UUID playlist_id FK "to playlists.id"
        TEXT track_spotify_id
        INTEGER position
        TEXT track_name
        JSONB track_artists
        TEXT track_album_name
        TEXT track_album_image_url
        INTEGER track_duration_ms
        INTEGER track_popularity
        TEXT track_preview_url
        JSONB audio_features
        TIMESTAMPTZ added_to_spotify_playlist_at
        TIMESTAMPTZ created_at
    }

    user_top_artists {
        UUID user_id PK FK "to profiles.id"
        TEXT artist_spotify_id PK
        TEXT name
        JSONB genres
        INTEGER popularity
        TEXT image_url
        TIMESTAMPTZ fetched_at
    }

    user_top_tracks {
        UUID user_id PK FK "to profiles.id"
        TEXT track_spotify_id PK
        TEXT name
        JSONB artists
        TEXT album_spotify_id "Spotify ID for the album"
        TEXT album_name
        TEXT album_image_url
        INTEGER popularity
        INTEGER duration_ms
        TEXT preview_url
        TIMESTAMPTZ fetched_at
    }

    user_playlist_interactions {
        BIGINT id PK "BIGSERIAL"
        UUID user_id FK "to profiles.id"
        UUID playlist_id FK "to playlists.id"
        TEXT interaction_type
        TIMESTAMPTZ interacted_at
        JSONB metadata
    }
```

### 4. Data Integrity and Constraints

*   **Foreign Keys:** Enforce relationships between tables (e.g., a message must belong to an existing user and room). `ON DELETE CASCADE` is used for `chat_messages` so that if a user or room is deleted, their associated messages are also cleaned up.
*   **Check Constraints:**
    *   `profiles.username_length`: Ensures username is between 3 and 50 characters.
    *   `chat_messages.message_content_length`: Ensures message content is not empty and does not exceed 5000 characters.
*   **Unique Constraints:**
    *   `profiles.username`
    *   `profiles.spotify_user_id`

### 5. Realtime Configuration

Supabase Realtime will be enabled for the following tables to support live updates in the application:
*   `public.chat_messages`: For new messages.
*   `public.profiles`: For live updates to user avatars/usernames if they change (e.g., for the avatar stack).
*   `public.chat_rooms`: If room details (like name or description) are expected to change and be reflected live.
*   `public.user_playlist_interactions`: If interactions with playlists are expected to change and be reflected live.

---

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Based on initial schema SQL. | Architect Agent | 