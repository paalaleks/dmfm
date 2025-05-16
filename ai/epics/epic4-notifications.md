# Epic 4: Playlist Match Notifications

## 1. Overview

This epic introduces the database structures required to implement a notification system based on playlist matches. The goal is to inform users when other users interact with playlists they have been matched with by the taste-matching algorithm. This involves two new tables: `user_playlist_matches` to track the matches themselves, and `notifications` to store the notifications generated from peer activity on these matched playlists.

## 2. User Stories

-   As a user, I want to be notified when another user saves a track from a playlist I was matched with, so I can discover new activity relevant to my tastes.
-   As a user, I want to be notified when another user saves a playlist I was matched with, so I can see which matched playlists are popular or engaging for others.

## 3. Technical Details

### 3.1. New Database Tables

Two new tables will be added to the `public` schema:

#### 3.1.1. `user_playlist_matches`

Stores records of users matched with candidate playlists by the taste-matching algorithm.

*   **SQL Definition:**
    ```sql
    CREATE TABLE public.user_playlist_matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
        matched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        CONSTRAINT uq_user_playlist_match UNIQUE (user_id, playlist_id)
    );

    COMMENT ON TABLE public.user_playlist_matches IS 'Stores records of users matched with candidate playlists by the taste-matching algorithm.';
    COMMENT ON COLUMN public.user_playlist_matches.id IS 'Unique identifier for the playlist match instance.';
    COMMENT ON COLUMN public.user_playlist_matches.user_id IS 'The user who was matched with the playlist. References public.profiles(id).';
    COMMENT ON COLUMN public.user_playlist_matches.playlist_id IS 'The playlist the user was matched with. References public.playlists(id).';
    COMMENT ON COLUMN public.user_playlist_matches.matched_at IS 'Timestamp when the match was identified.';
    ```
*   **RLS Policies (Example):**
    ```sql
    -- Users can view their own playlist matches.
    CREATE POLICY "Users can view their own playlist matches."
      ON public.user_playlist_matches FOR SELECT
      USING (auth.uid() = user_id);

    -- Service role can manage all playlist matches (e.g., for creation by the matching algorithm).
    CREATE POLICY "Service role can manage playlist matches."
      ON public.user_playlist_matches FOR ALL
      USING (auth.role() = 'service_role');
    ```

#### 3.1.2. `notifications`

Stores notifications for users, linked to their specific playlist matches, triggered by peer activity.

*   **Supporting ENUM Type:**
    ```sql
    CREATE TYPE public.notification_trigger_event AS ENUM (
        'peer_saved_track_on_matched_playlist', -- Another user saved a track from the matched playlist
        'peer_saved_matched_playlist'         -- Another user saved the matched playlist itself
    );
    ```
*   **SQL Definition:**
    ```sql
    CREATE TABLE public.notifications (
        id BIGSERIAL PRIMARY KEY,
        user_playlist_match_id UUID NOT NULL REFERENCES public.user_playlist_matches(id) ON DELETE CASCADE,
        trigger_event public.notification_trigger_event NOT NULL,
        actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- User whose action triggered this.
        acted_on_track_spotify_id TEXT, -- Spotify ID of the track, if event is 'peer_saved_track_on_matched_playlist'.
        content TEXT NOT NULL, -- The actual message to display to the user.
        read_status BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    COMMENT ON TABLE public.notifications IS 'Stores notifications for users, linked to their specific playlist matches, triggered by peer activity.';
    COMMENT ON COLUMN public.notifications.id IS 'Unique identifier for the notification.';
    COMMENT ON COLUMN public.notifications.user_playlist_match_id IS 'Links to the user_playlist_matches record. Defines recipient and playlist context.';
    COMMENT ON COLUMN public.notifications.trigger_event IS 'The type of peer event that caused this notification.';
    COMMENT ON COLUMN public.notifications.actor_user_id IS 'The user whose action triggered this notification for the matched user. References public.profiles(id).';
    COMMENT ON COLUMN public.notifications.acted_on_track_spotify_id IS 'Spotify ID of the track involved in the trigger_event, if applicable.';
    COMMENT ON COLUMN public.notifications.content IS 'The human-readable notification message.';
    COMMENT ON COLUMN public.notifications.read_status IS 'TRUE if the recipient has marked the notification as read.';
    COMMENT ON COLUMN public.notifications.created_at IS 'Timestamp when the notification was generated.';
    ```
*   **RLS Policies (Example):**
    ```sql
    -- Users can view notifications for their matches.
    CREATE POLICY "Users can view notifications for their matches."
      ON public.notifications FOR SELECT
      USING (auth.uid() = (
        SELECT upm.user_id FROM public.user_playlist_matches upm WHERE upm.id = user_playlist_match_id
      ));

    -- Users can update read_status on their notifications.
    CREATE POLICY "Users can update read_status on their notifications."
      ON public.notifications FOR UPDATE
      USING (auth.uid() = (
        SELECT upm.user_id FROM public.user_playlist_matches upm WHERE upm.id = user_playlist_match_id
      ))
      WITH CHECK (
        auth.uid() = (SELECT upm.user_id FROM public.user_playlist_matches upm WHERE upm.id = user_playlist_match_id)
        -- Add condition to ensure only read_status can be modified by the user if needed
        -- e.g. AND (OLD.column1 IS NOT DISTINCT FROM NEW.column1 AND OLD.column2 IS NOT DISTINCT FROM NEW.column2 ...)
      );

    -- Service role can manage all notifications (e.g., for creation).
    CREATE POLICY "Service role can manage all notifications."
      ON public.notifications FOR ALL
      USING (auth.role() = 'service_role');
    ```
*   **Indexes:**
    ```sql
    CREATE INDEX idx_notifications_user_playlist_match_id ON public.notifications(user_playlist_match_id);
    CREATE INDEX idx_notifications_trigger_event ON public.notifications(trigger_event);
    -- Optional: Index on actor_user_id if frequently queried
    -- CREATE INDEX idx_notifications_actor_user_id ON public.notifications(actor_user_id);
    ```

### 3.2. Data Flow for Notifications

1.  **Matching:** The taste-matching algorithm identifies a match between `UserA` and `PlaylistX`.
2.  **Match Record Creation:** A record is inserted into `user_playlist_matches`: `{ id: M1, user_id: UserA_ID, playlist_id: PlaylistX_ID, matched_at: now() }`.
3.  **Peer Interaction:** `UserB` interacts with `PlaylistX` (e.g., saves a track `TrackY` from `PlaylistX`, or saves `PlaylistX` itself).
4.  **Notification Trigger:**
    *   The application detects `UserB`'s action on `PlaylistX`.
    *   It queries `user_playlist_matches` to find all users matched with `PlaylistX`. This returns the match record `M1` for `UserA`.
    *   For each match found (e.g., `M1`):
        *   A new record is inserted into `notifications`.
        *   If `UserB` saved `TrackY` from `PlaylistX`:
            `{ user_playlist_match_id: M1, trigger_event: 'peer_saved_track_on_matched_playlist', actor_user_id: UserB_ID, acted_on_track_spotify_id: TrackY_SpotifyID, content: "Someone saved a track from [PlaylistX Name]!", ... }`
        *   If `UserB` saved `PlaylistX`:
            `{ user_playlist_match_id: M1, trigger_event: 'peer_saved_matched_playlist', actor_user_id: UserB_ID, acted_on_track_spotify_id: NULL, content: "Someone saved [PlaylistX Name]!", ... }`
5.  **Notification Delivery:** `UserA`'s client application queries the `notifications` table for unread notifications where the recipient (derived from `user_playlist_match_id`) is `UserA`.

## 4. Acceptance Criteria

-   The `user_playlist_matches` table correctly stores associations between users and playlists they are matched with.
-   The `notifications` table correctly stores notifications triggered by peer interactions on matched playlists.
-   `notifications.trigger_event` correctly reflects the type of peer interaction.
-   `notifications.actor_user_id` correctly identifies the user who performed the interaction.
-   RLS policies ensure users can only access/modify their own relevant data, while service roles can manage the data.
-   Database queries to fetch notifications for a user are performant.

## 5. Future Considerations

-   Add more `notification_trigger_event` types (e.g., when a matched playlist is updated by its owner).
-   Batching notifications if activity is high.
-   User preferences for which types of notifications to receive.
-   Push notifications in addition to in-app notifications.
-   More complex logic for generating the `content` field, possibly including names of users if privacy settings allow and friend relationships are modeled. 