### Epic Title: User Activity Notifications

**Description:**
This epic covers the implementation of a user notification system that informs users about activities related to tracks and playlists they save within the application. Notifications will be personalized, only showing items that align with the user's music taste profile derived from their top artists on Spotify. This system aims to enhance user engagement by highlighting relevant new content based on their actions and preferences.

**Goals:**
*   Notify users when they save a track in the app that matches their music taste profile (based on artist comparison).
*   Notify users when they save a playlist in the app that matches their music taste profile (based on artist comparison of tracks within the playlist).
*   Provide a robust backend mechanism to capture save events and process notification logic.
*   Efficiently store and manage generated notifications.
*   Enable users to view and manage their notifications on the frontend.

**User Stories:**

*   **Story 1: Capture Track Saves**
    *   As a developer, I need a system to record when a user saves an individual track, so this event can trigger notification processing.
*   **Story 2: Capture Playlist Saves**
    *   As a developer, I need a system to record when a user saves a playlist, so this event can trigger notification processing.
*   **Story 3: Define User Taste for Notifications**
    *   As a developer, I need a way to define a user's music taste profile (based on their top Spotify artists) at the time of notification processing.
*   **Story 4: Track Match Notification Generation**
    *   As a developer, I need a backend process that, upon a track save, compares the track's artist(s) against the user's taste profile and creates a notification if there's a match.
*   **Story 5: Playlist Match Notification Generation**
    *   As a developer, I need a backend process that, upon a playlist save, analyzes its tracks against the user's taste profile and creates a notification if a significant portion matches.
*   **Story 6: Notification Storage**
    *   As a developer, I need a dedicated database table to store generated notifications with all relevant details.
*   **Story 7: Notification Retrieval API**
    *   As a developer, I need API endpoints for the frontend to fetch user notifications (all, unread), get unread counts, and mark notifications as read.
*   **Story 8: Frontend Notification Display & Management**
    *   As a user, I want to see my new notifications clearly within the application and be able to mark them as read.
*   **Story 9: Notification React Context**
    *   As a developer, I need a new React context (`notifications-context.tsx`) to manage notification state (list, unread count, loading/error) and interaction logic on the frontend.

**Technical Design & Implementation Details:**

**1. Data Models (New Tables):**

*   **`user_saved_tracks`**:
    *   Purpose: Logs user saves of individual tracks.
    *   Columns: `id (bigint PK)`, `user_id (uuid FK > profiles.id)`, `track_spotify_id (text)`, `saved_at (timestamptz)`, `source (text optional)`.
    *   RLS: User can only access/delete their own.
*   **`user_saved_playlists`**:
    *   Purpose: Logs user saves of playlists.
    *   Columns: `id (bigint PK)`, `user_id (uuid FK > profiles.id)`, `playlist_id (uuid FK > playlists.id)`, `saved_at (timestamptz)`, `source (text optional)`.
    *   RLS: User can only access/delete their own.
*   **`user_notifications`**:
    *   Purpose: Stores generated notifications.
    *   Columns: `id (bigint PK)`, `user_id (uuid FK > profiles.id)`, `type (text e.g., 'new_track_match', 'new_playlist_match')`, `item_spotify_id (text nullable, Spotify ID of track/playlist)`, `related_playlist_table_id (uuid nullable FK > playlists.id)`, `triggering_saved_track_id (bigint nullable FK > user_saved_tracks.id)`, `triggering_saved_playlist_id (bigint nullable FK > user_saved_playlists.id)`, `title (text)`, `message (text)`, `item_name (text nullable)`, `item_image_url (text nullable)`, `created_at (timestamptz)`, `is_read (boolean default false)`, `read_at (timestamptz nullable)`, `metadata (jsonb nullable)`.
    *   RLS: User can only select their own.
    *   Indexes: `(user_id)`, `(user_id, is_read, created_at)`.
*   *(Note: These tables and their initial RLS policies and indexes are defined in the SQL migration file `supabase/migrations/20240401120000_create_notification_system.sql`.)*

**2. User Taste Profile Definition (On-the-fly):**

*   When a save event occurs, the user's taste profile is derived by:
    *   Fetching their top artists from `user_top_artists` (primarily `artist_spotify_id`, `genres`).
    *   (Optional enhancement: supplement with data from `user_top_tracks`).
*   The profile will consist of a set of `topArtistIds` and potentially `topArtistGenres`.

**3. Notification Generation Logic (Supabase Edge Functions):**

*   **Database Triggers:**
    *   `AFTER INSERT ON user_saved_tracks FOR EACH ROW EXECUTE FUNCTION supabase_functions.edge_request('process-saved-track-notification', NEW.*);` (Conceptual - actual invocation might vary)
    *   `AFTER INSERT ON user_saved_playlists FOR EACH ROW EXECUTE FUNCTION supabase_functions.edge_request('process-saved-playlist-notification', NEW.*);`
    *   *(Note: These database triggers and shell trigger functions are also defined in `supabase/migrations/20240401120000_create_notification_system.sql`. The shell functions are designed to invoke the Edge Functions below.)*
*   **Edge Function: `process-saved-track-notification`**
    *   Input: `userId`, `track_spotify_id`.
    *   Fetches user's taste profile (`topArtistIds`).
    *   Fetches the saved track's primary artist(s) from Spotify API.
    *   Match: If any track artist is in `topArtistIds`.
    *   If match, insert into `user_notifications`.
    *   *(Skeleton created at: `supabase/functions/process-saved-track-notification/index.ts`)*
*   **Edge Function: `process-saved-playlist-notification`**
    *   Input: `userId`, `playlist_id` (internal UUID).
    *   Fetches user's taste profile (`topArtistIds`).
    *   Fetches tracks for the playlist from `playlist_tracks`.
    *   For each track in the playlist, check if its primary artist(s) (from `playlist_tracks.track_artists` or Spotify API) are in `topArtistIds`.
    *   Match: If >= 20% of playlist tracks meet the artist match criteria.
    *   If match, insert into `user_notifications`.
    *   *(Skeleton created at: `supabase/functions/process-saved-playlist-notification/index.ts`)*
*   Helper functions for taste profile generation and matching logic will reside in `lib/taste-comparison.ts` or a new `lib/notification-matcher.ts`.

**4. API Endpoints for Frontend (Supabase RPC Functions):**

*   **`get_user_notifications(p_limit INT DEFAULT 20, p_offset INT DEFAULT 0, p_include_read BOOLEAN DEFAULT false)`**: Fetches paginated notifications for `auth.uid()`.
*   **`mark_notification_as_read(p_notification_id BIGINT)`**: Marks a specific notification as read for `auth.uid()`.
*   **`mark_all_notifications_as_read()`**: Marks all unread notifications as read for `auth.uid()`.
*   **`get_unread_notification_count()`**: Returns count of unread notifications for `auth.uid()`.
*   *(Note: These RPC functions are defined in the SQL migration file `supabase/migrations/20240401120100_create_notification_rpcs.sql`.)*

**5. Frontend (`components/contexts/notifications-context.tsx`):**

*   **State:** `notifications: Notification[]`, `unreadCount: number`, `isLoading: boolean`, `error: Error | null`.
*   **Functions:**
    *   `fetchNotifications(...)`: Calls `get_user_notifications` RPC.
    *   `markAsRead(notificationId)`: Calls `mark_notification_as_read` RPC.
    *   `markAllAsRead()`: Calls `mark_all_notifications_as_read` RPC.
    *   `refreshUnreadCount()`: Calls `get_unread_notification_count` RPC.
*   The context will be consumed by UI components like `components/nav/notifications.tsx`.
*   *(File created at: `components/contexts/notifications-context.tsx`)*

**Acceptance Criteria:**

*   New tables (`user_saved_tracks`, `user_saved_playlists`, `user_notifications`) are created and function as specified.
*   Saving a track (via client action resulting in `user_saved_tracks` insert) correctly triggers `process-saved-track-notification` Edge Function.
*   Saving a playlist (via client action resulting in `user_saved_playlists` insert) correctly triggers `process-saved-playlist-notification` Edge Function.
*   Edge Functions correctly derive user taste, call Spotify API for necessary details, and apply matching logic (artist-based, 20% threshold for playlists).
*   Matching events result in a new record in the `user_notifications` table.
*   Frontend can fetch and display notifications using the `notifications-context.tsx` and RPC functions.
*   Users can mark notifications as read.
*   Unread notification count is available and accurate.

**Out of Scope (for this Epic - potential follow-ups):**

*   Real-time push notifications using Supabase Realtime (current plan is polling/fetch-on-action via context).
*   Advanced notification settings/preferences (e.g., opting out, changing frequency).
*   Deleting notifications (marking as read is sufficient for now).
*   More complex taste matching (e.g., genre, audio features beyond V1 artist matching).
*   Handling "unsave" actions to remove/retract notifications.
*   Admin interface for viewing/managing notifications.

This updated epic provides a comprehensive overview of the plan. 