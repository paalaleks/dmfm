# Epic: App Notifications

**Goal:** To implement a system that notifies users about relevant activities and connections within the application, enhancing engagement and user experience.

**Stakeholders:** Users, Product Team

**Metrics:**
*   Increase in user engagement (e.g., daily active users, session duration).
*   User opt-in rates for different notification types.
*   Click-through rates on notification calls-to-action.

## User Stories:

### Story 1: Establish User Music Taste Similarity Foundation

*   **As a:** System
*   **I want to:** Calculate and store music taste similarity scores between users based on their top artists
*   **So that:** This information can be used to identify users with similar tastes for future notification purposes (e.g., "User X also likes many artists you like," or "Users with similar taste to you are discussing playlist Y").

*   **Technical Tasks:**
    1.  **Create `user_music_similarity` table:**
        *   Columns: `id` (bigint, PK), `user_id_1` (uuid, FK to profiles.id), `user_id_2` (uuid, FK to profiles.id), `similarity_score` (real), `similarity_metrics` (jsonb, optional), `calculated_at` (timestamptz), `created_at` (timestamptz), `updated_at` (timestamptz).
        *   Add a unique constraint: `UNIQUE (user_id_1, user_id_2)`.
        *   Ensure RLS is enabled and appropriate policies are considered (e.g., should users be able to query this directly? Likely not, service role access primarily).
    2.  **Create PL/pgSQL function `calculate_user_similarity_score(user_A_id UUID, user_B_id UUID) RETURNS REAL`:**
        *   Calculates the Jaccard index based on common `artist_spotify_id`s from the `user_top_artists` table for the two provided user IDs.
        *   Returns 1.0 if `user_A_id` = `user_B_id`.
        *   Returns 0.0 if the union of artists is empty.
    3.  **Create PL/pgSQL trigger function `handle_music_data_change() RETURNS TRIGGER`:**
        *   Triggered by changes to `user_top_artists`.
        *   Identifies the `user_id` whose data changed.
        *   Iterates through all other users in the `profiles` table.
        *   For each pair, calls `calculate_user_similarity_score`.
        *   Ensures user IDs are ordered (e.g., `user1_id < user2_id`) before storing to prevent duplicate pairs.
        *   Performs an `INSERT ... ON CONFLICT (user_id_1, user_id_2) DO UPDATE` on the `user_music_similarity` table, updating `similarity_score`, `calculated_at`, and `similarity_metrics` (e.g., `jsonb_build_object('source', 'user_top_artists_trigger')`).
    4.  **Create Database Trigger:**
        *   `CREATE TRIGGER update_similarity_after_artist_change AFTER INSERT OR UPDATE ON user_top_artists FOR EACH ROW EXECUTE FUNCTION handle_music_data_change();`

*   **Acceptance Criteria:**
    *   When a new user's top artists are added via `user_top_artists`, similarity scores are calculated and stored in `user_music_similarity` between this new user and all existing users.
    *   When an existing user's top artists are updated in `user_top_artists`, their similarity scores with all other users are recalculated and updated in `user_music_similarity`.
    *   The `user_music_similarity` table correctly stores the Jaccard index (0.0 to 1.0) for artist similarity.
    *   The calculation correctly handles cases where one or both users have no top artists (resulting in a score of 0.0 unless both are empty and union is 0).
    *   Comparing a user to themselves yields a similarity score of 1.0.
    *   The pair of users in `user_music_similarity` is stored uniquely, with `user_id_1` always being the "lesser" UUID to ensure consistency.
    *   The `calculated_at` timestamp is updated upon each calculation.

### Story 2: (Placeholder) Notify User of Highly Similar New User

*   **As a:** User
*   **I want to:** Receive a notification when a new user joins who has a very high music taste similarity to me
*   **So that:** I can discover and potentially connect with them.

--- 