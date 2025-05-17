# Epic 4: Playlist Match Notifications

## 1. Overview

Enable users to receive timely, relevant notifications when matched with new playlists or when peers interact with matched playlists, enhancing music discovery.

## 2. User Stories

- As a user, I want to be notified **once** when I am matched with a new playlist, so I can explore it without redundant alerts.
- As a user, I want to be notified **the first time** another user saves a track from a playlist I was matched with, so I can discover new activity without spam.
- As a user, I want to control which notification types I receive (e.g., opt out of "peer_saved_track" alerts), so I can tailor my experience.

## 3. Technical Details

### 3.1. New Database Tables

Two tables are key to this system. One, `user_playlist_matches`, already exists. The second, `notifications`, will be created.

#### 3.1.1. `user_playlist_matches`

This table stores records of users matched with candidate playlists by the taste-matching algorithm.
*This table is assumed to already exist in the `public` schema as per recent checks.*

*   **Original SQL Definition (Reference only - table exists):**
    ```sql
    -- CREATE TABLE public.user_playlist_matches (
    --     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    --     playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    --     matched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    --     CONSTRAINT uq_user_playlist_match UNIQUE (user_id, playlist_id)
    -- );

    -- COMMENT ON TABLE public.user_playlist_matches IS 'Stores records of users matched with candidate playlists by the taste-matching algorithm.';
    -- COMMENT ON COLUMN public.user_playlist_matches.id IS 'Unique identifier for the playlist match instance.';
    -- COMMENT ON COLUMN public.user_playlist_matches.user_id IS 'The user who was matched with the playlist. References public.profiles(id).';
    -- COMMENT ON COLUMN public.user_playlist_matches.playlist_id IS 'The playlist the user was matched with. References public.playlists(id).';
    -- COMMENT ON COLUMN public.user_playlist_matches.matched_at IS 'Timestamp when the match was identified.';
    ```
*   **Original RLS Policies (Reference only - policies should be verified on existing table):**
    ```sql
    -- Users can view their own playlist matches.
    -- CREATE POLICY "Users can view their own playlist matches."
    --   ON public.user_playlist_matches FOR SELECT
    --   USING (auth.uid() = user_id);

    -- Service role can manage all playlist matches (e.g., for creation by the matching algorithm).
    -- CREATE POLICY "Service role can manage playlist matches."
    --   ON public.user_playlist_matches FOR ALL
    --   USING (auth.role() = 'service_role');
    ```

#### 3.1.2. `notifications`

Stores notifications for users, linked to their specific playlist matches, triggered by peer activity or new matches.

*   **Supporting ENUM Type:**
    ```sql
    CREATE TYPE public.notification_trigger_event AS ENUM (
        'peer_saved_track_on_matched_playlist', -- Another user saved a track from the matched playlist
        'new_playlist_match'                  -- The user has been matched with a new playlist
    );
    ```
*   **SQL Definition:**
    ```sql
    CREATE TABLE public.notifications (
        id BIGSERIAL PRIMARY KEY,
        user_playlist_match_id UUID NOT NULL REFERENCES public.user_playlist_matches(id) ON DELETE CASCADE,
        trigger_event public.notification_trigger_event NOT NULL,
        actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- User whose action triggered this (NULL for new_playlist_match).
        acted_on_track_spotify_id TEXT, -- Spotify ID of the track, if event is 'peer_saved_track_on_matched_playlist'. NULL otherwise.
        content TEXT NOT NULL, -- The actual message to display to the user.
        read_status BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    COMMENT ON TABLE public.notifications IS 'Stores notifications for users, linked to their specific playlist matches, triggered by peer activity or new matches.';
    COMMENT ON COLUMN public.notifications.id IS 'Unique identifier for the notification.';
    COMMENT ON COLUMN public.notifications.user_playlist_match_id IS 'Links to the user_playlist_matches record. Defines recipient and playlist context.';
    COMMENT ON COLUMN public.notifications.trigger_event IS 'The type of event that caused this notification.';
    COMMENT ON COLUMN public.notifications.actor_user_id IS 'The user whose action triggered this notification for the matched user (NULL for system-generated events like new_playlist_match). References public.profiles(id).';
    COMMENT ON COLUMN public.notifications.acted_on_track_spotify_id IS 'Spotify ID of the track involved in the trigger_event, if applicable (e.g., peer_saved_track_on_matched_playlist). NULL otherwise.';
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
3.  **Notification for New Match:**
    *   A new record is inserted into `notifications` for `UserA`:
        `{ user_playlist_match_id: M1, trigger_event: 'new_playlist_match', actor_user_id: NULL, acted_on_track_spotify_id: NULL, content: "You have a new playlist match: [PlaylistX Name]!", ... }`
4.  **Peer Interaction (Example: Song Like on Matched Playlist):** `UserB` interacts with `PlaylistX` by liking/saving a track `TrackY` from `PlaylistX`.
5.  **Notification Trigger (for Song Like):**
    *   The application detects `UserB`'s action (saving `TrackY`) on `PlaylistX`.
    *   It queries `user_playlist_matches` to find all users matched with `PlaylistX`. This returns the match record `M1` for `UserA`.
    *   For each match found (e.g., `M1` for `UserA`):
        *   A new record is inserted into `notifications`.
            `{ user_playlist_match_id: M1, trigger_event: 'peer_saved_track_on_matched_playlist', actor_user_id: UserB_ID, acted_on_track_spotify_id: TrackY_SpotifyID, content: "Someone saved a track from [PlaylistX Name]!", ... }`
6.  **Notification Delivery:** `UserA`'s client application queries the `notifications` table for unread notifications where the recipient (derived from `user_playlist_match_id`) is `UserA`.

### 3.3. Edge Cases

- **Playlist Deletion:** Notifications and matches are cascaded if a playlist is deleted (`ON DELETE CASCADE`).
- **Concurrent Saves:** Row locking ensures no duplicate notifications for simultaneous track saves.
- **User Unmatching:** Notifications stop if a user is manually unmatched from a playlist.

## 4. Acceptance Criteria

1. **Notification Scope**
   - Users only receive notifications for playlists with which they have an active match in the `user_playlist_matches` table.
   - Users do not receive notifications for playlists they are not matched with.

2. **Notification Triggers**
   - A notification is generated when a user is newly matched with a playlist.
   - A notification is generated when another user saves (likes) a track from a playlist the recipient is matched with, and the notification references the specific track and actor.

3. **Notification Content**
   - Each notification clearly states the event (e.g., "You have a new playlist match: [Playlist Name]" or "Someone saved a track from [Playlist Name]!").
   - The notification includes relevant context, such as playlist name and, if applicable, the track's Spotify ID.

4. **Read Status**
   - Users can mark notifications as read.
   - Only the recipient can update the read status of their notifications.

5. **Access Control (RLS)**
   - Users can only view notifications related to their own playlist matches.
   - Users cannot view or modify notifications belonging to other users.
   - Service roles can manage all notifications for system operations.

6. **No Duplicate Notifications**
   - The system prevents duplicate notifications for the same event (e.g., a user should not receive multiple notifications for the same song like on the same playlist by the same actor).

7. **Performance**
   - Fetching notifications for a user is performant (e.g., queries are indexed and return results within an acceptable time frame for up to N notifications).

8. **Data Integrity**
   - All notifications reference valid `user_playlist_matches` records.
   - All foreign key constraints are enforced (e.g., `actor_user_id` references a valid user or is NULL for system events).

9. **Auditability**
   - All notification events are timestamped (`created_at`).
   - The system can distinguish between read and unread notifications.

10. **Negative Cases**
    - Users do not receive notifications for activity on playlists after their match has been removed (e.g., if the `user_playlist_matches` record is deleted).
    - Users do not receive notifications for their own actions (e.g., liking a song on a matched playlist does not notify themselves).

## 5. Dependencies

- Requires `user_playlist_matches` table (defined in [Epic X](../epics/epicX.md)).
- Relies on `song_likes` table ([Story 7.1](../stories/7.1.story-save-likes.md)) for tracking peer activity.

## 6. Non-Functional Requirements

- **Performance:** Notifications load within <500ms for 95% of requests.
- **Privacy:** Users cannot infer playlist ownership unless explicitly shared.
- **Logging:** All notification events are logged (e.g., `event_type`, `user_id`, `timestamp`).

## 7. Future Considerations

### Short-Term (Next Release)
- Add `playlist_updated_by_owner` trigger event.
- User preferences for notification types.

### Long-Term
- Push notifications.
- Batched notifications for high-frequency events.
- Friend-based visibility (e.g., "[Friend] liked a track"). 