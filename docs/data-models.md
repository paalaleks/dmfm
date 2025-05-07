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

### 3. Relationships (Entity Relationship Diagram - Mermaid)

```mermaid
erDiagram
    profiles ||--o{ chat_messages : sends
    chat_rooms ||--o{ chat_messages : contains
    "auth.users" ||--|| profiles : "has profile (1-to-1)"

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

    "auth.users" {
        UUID id PK "Supabase Auth User ID"
        jsonb raw_user_meta_data
        # ... other auth.users columns
    }
```
**Note:** The `auth.users` table is managed by Supabase Auth and is shown for relational context.

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

---

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Based on initial schema SQL. | Architect Agent | 