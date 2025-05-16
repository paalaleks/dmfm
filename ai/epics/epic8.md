# Epic 8: Taste Match Adjustment

**Goal:** To refine and improve the accuracy and relevance of playlist matching by incorporating more nuanced data about track and artist popularity/occurrence within playlists.

**Owner:** TBD
**Status:** To Do
**Priority:** TBD
**Success Metrics:**
*   TBD

**Technical Considerations/Assumptions:**
*   The `playlist_track_artist_aggregates` table will be the primary source for fetching top artists/tracks for matching algorithms.
*   The chosen JSONB structures for tracks and artists are sufficient for initial matching needs.
*   Updates to the aggregate table occur during the playlist import process.

**Out of Scope:**
*   Real-time updates to aggregates (e.g., via database triggers on `playlist_tracks` table changes).
*   Advanced analytics or UI based directly on the aggregate table beyond its use in matching.

**Dependencies:**
*   None currently identified.

## Stories

### Story 1.1: Create Aggregate Table for Playlist Tracks and Artist Occurrences

*   **Description:** Design and implement a new database table (`playlist_track_artist_aggregates`) to store aggregated information about tracks and artist occurrences for each imported playlist. This table will facilitate more efficient querying for "top tracks" and "top artists" based on their frequency within playlists, serving as a foundational step for enhancing taste-based playlist matching.

*   **Database Schema Details:**
    *   **Table Name:** `playlist_track_artist_aggregates`
    *   **SQL DDL:**
        ```sql
        CREATE TABLE public.playlist_track_artist_aggregates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            playlist_id UUID NOT NULL UNIQUE REFERENCES public.playlists(id) ON DELETE CASCADE,
            tracks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            artists_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            total_tracks INTEGER NOT NULL DEFAULT 0,
            distinct_artist_count INTEGER NOT NULL DEFAULT 0,
            last_aggregated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        ALTER TABLE public.playlist_track_artist_aggregates ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow authenticated users to read playlist aggregates"
        ON public.playlist_track_artist_aggregates
        FOR SELECT
        TO authenticated
        USING (true);

        COMMENT ON TABLE public.playlist_track_artist_aggregates IS 'Stores aggregated track and artist data for each playlist.';
        COMMENT ON COLUMN public.playlist_track_artist_aggregates.playlist_id IS 'FK to the playlists table.';
        COMMENT ON COLUMN public.playlist_track_artist_aggregates.tracks_json IS 'JSONB array of track objects from the playlist.';
        COMMENT ON COLUMN public.playlist_track_artist_aggregates.artists_json IS 'JSONB array of unique artists, each with their occurrence count in the playlist.';
        COMMENT ON COLUMN public.playlist_track_artist_aggregates.total_tracks IS 'Total number of tracks in tracks_json.';
        COMMENT ON COLUMN public.playlist_track_artist_aggregates.distinct_artist_count IS 'Total number of distinct artists in artists_json.';
        COMMENT ON COLUMN public.playlist_track_artist_aggregates.last_aggregated_at IS 'Timestamp of the last aggregation update.';

        CREATE OR REPLACE FUNCTION public.update_playlist_aggregates_last_aggregated_at_on_update()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.last_aggregated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_update_playlist_aggregates_last_aggregated_at
        BEFORE UPDATE ON public.playlist_track_artist_aggregates
        FOR EACH ROW
        EXECUTE FUNCTION public.update_playlist_aggregates_last_aggregated_at_on_update();
        ```
    *   **JSONB Structures:**
        *   `tracks_json`:
            ```json
            [
              {
                "spotify_track_id": "string",
                "name": "string",
                "duration_ms": "integer"
              }
            ]
            ```
        *   `artists_json`:
            ```json
            [
              {
                "spotify_artist_id": "string",
                "name": "string",
                "playlist_occurrences": "integer"
              }
            ]
            ```

*   **Acceptance Criteria:**
    *   A new database table `playlist_track_artist_aggregates` is created with the schema detailed above (columns: `id`, `playlist_id`, `tracks_json`, `artists_json`, `total_tracks`, `distinct_artist_count`, `last_aggregated_at`, `created_at`).
    *   The `artists_json` column in the new table correctly stores an array of unique artist objects, each including a `playlist_occurrences` count, as per the defined JSONB structure.
    *   The `tracks_json` column in the new table correctly stores an array of track objects, as per the defined JSONB structure.
    *   A Supabase migration file is created and successfully applied to implement this table schema.
    *   The migration includes enabling Row Level Security (RLS) for the table.
    *   The migration includes appropriate RLS policies (e.g., authenticated read access).
    *   The migration includes a trigger function to automatically update the `last_aggregated_at` column on row updates.
    *   Migration script comments clearly describe the table, columns, and trigger function.
    *   Aggregation logic includes console logs for debugging.

### Story 1.2: Populate Aggregate Table in Playlist Import Process

*   **Description:** Modify the `importPlaylist` server action (`app/_actions/import-playlist.ts`) to populate the newly created `playlist_track_artist_aggregates` table with aggregated track and artist data after a playlist is successfully imported or updated.
*   **Depends On:** Story 1.1 (Create Aggregate Table for Playlist Tracks and Artist Occurrences)
*   **Acceptance Criteria:**
    *   The `importPlaylist` server action (`app/_actions/import-playlist.ts`) is updated to perform the following steps after successfully saving playlist metadata and tracks to `playlists` and `playlist_tracks` tables:
        *   Construct the `tracks_json` data by mapping track details (e.g., `spotify_track_id`, `name`, `duration_ms`) from the imported playlist's tracks.
        *   Construct the `artists_json` data by:
            *   Iterating through all tracks of the imported playlist.
            *   For each track, iterating through its artists.
            *   Aggregating occurrences for each unique artist (based on `spotify_artist_id`), storing their `spotify_artist_id`, `name`, and total `playlist_occurrences`.
        *   Calculate `total_tracks` (count of items in `tracks_json`).
        *   Calculate `distinct_artist_count` (count of items in `artists_json`).
    *   An UPSERT (insert or update on conflict) operation is performed on the `playlist_track_artist_aggregates` table using `playlist_id` as the conflict target.
        *   If a record for the `playlist_id` exists, it's updated with the new aggregated data.
        *   If no record exists, a new one is inserted.
    *   The `last_aggregated_at` column in `playlist_track_artist_aggregates` is correctly updated by the database trigger (verified by checking timestamp post-operation, or implicitly by successful UPSERT).
    *   The logic for preparing `tracks_json` and `artists_json` correctly matches the JSONB structures defined in Story 1.1.
    *   The `importPlaylist` action handles potential errors during the aggregation and UPSERT process gracefully, ensuring that failure to update aggregates does not necessarily roll back the primary playlist import if partial success is acceptable (e.g., logs an error but returns success for playlist import itself, or returns a specific status indicating partial success).
    *   Console logs are added to trace the aggregation data preparation and the result of the UPSERT operation for debugging purposes.
    *   The changes are made without negatively impacting the existing functionality of the `importPlaylist` action for saving primary playlist and track data.

### Story 8.3: Enhance User Taste Profile with Playlist Aggregate Artist Data

*   **Description:** Modify the `getTasteMatchedPlaylistsAction` in `taste-matching/tastematched-playlists.ts` to incorporate artist data from the user's imported playlists (via `playlist_track_artist_aggregates.artists_json`, filtered by `user_id`) into their taste profile, complementing artist data from `user_top_artists`.
*   **Depends On:** Story 8.1, Story 8.2
*   **Acceptance Criteria:**
    *   `getTasteMatchedPlaylistsAction` queries `playlist_track_artist_aggregates` for records matching the current `user_id`.
    *   `spotify_artist_id`s from the `artists_json` field of these records are extracted.
    *   These extracted artist IDs are combined with the results from `getUserTopArtistIds` to create the final `userTasteProfile` (a `Set<string>`).
    *   The combined `userTasteProfile` is used for calculating Jaccard Index against candidate playlists.
    *   If a user has no top artists from `user_top_artists` but has imported playlists with artists, their taste profile is populated from the latter.
    *   Error handling is implemented for the new data retrieval step, with fallback or graceful degradation if necessary.
    *   Console logs trace the new data retrieval and merging. 