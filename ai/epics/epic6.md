# Epic 6: Automated User-Playlist Taste Matching

## 1. Overview

This epic details the backend implementation for automatically identifying and recording taste matches between existing users and newly imported playlists. When a new playlist is imported and its aggregated artist data is saved, a PostgreSQL function will be triggered. This function will compare the new playlist's artist profile against each user's taste profile (derived from their top artists and the artists in their own imported playlists). If the similarity (calculated using Jaccard Index) exceeds a defined threshold, a record of this match will be stored in the `user_playlist_matches` table.

This process is designed to run entirely within the Supabase backend, ensuring no performance impact on the frontend application.

**Prerequisite Table:** The `public.user_playlist_matches` table, which stores these identified matches, has already been created and its RLS policies applied as per [Epic 4](epic4.md) and recent actions.

## 2. User Stories

-   **As a system,** I want to automatically evaluate if a newly imported playlist matches the taste of existing users, so that potential connections can be surfaced for notification or discovery features.
-   **As a platform administrator,** I want a reliable backend process for playlist-to-user matching without manual intervention, ensuring timely updates to the `user_playlist_matches` table.
-   **As a user,** I want the system to identify playlists that align with my musical taste, even if I don't actively search for them, potentially leading to new music discovery through subsequent features built upon these matches.

## 3. Technical Details

### 3.1. Prerequisite Table: `user_playlist_matches`

The `public.user_playlist_matches` table, created in a prior step, serves as the repository for user-playlist matches identified by the automated process.
SQL Definition recap:
```sql
CREATE TABLE public.user_playlist_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    matched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_user_playlist_match UNIQUE (user_id, playlist_id)
);
```
RLS policies are already in place for this table.

### 3.2. PostgreSQL Helper Function: `calculate_jaccard_index_text_arrays`

This function calculates the Jaccard Index between two arrays of text (e.g., arrays of artist Spotify IDs).

*   **Inputs:** `array1 TEXT[]`, `array2 TEXT[]`
*   **Output:** `FLOAT` (Jaccard Index score, between 0.0 and 1.0)
*   **Logic:**
    1.  Handle empty or NULL arrays to prevent division by zero; returns 0.0 in such cases.
    2.  Find the intersection of the two arrays (common elements).
    3.  Find the union of the two arrays (all unique elements from both).
    4.  Jaccard Index = (size of intersection) / (size of union).
*   **SQL Definition:**
    ```sql
    CREATE OR REPLACE FUNCTION public.calculate_jaccard_index_text_arrays(array1 TEXT[], array2 TEXT[])
    RETURNS FLOAT AS $$
    DECLARE
        intersection_count INTEGER;
        union_count INTEGER;
        element TEXT;
        unique_elements TEXT[];
    BEGIN
        IF array1 IS NULL OR array2 IS NULL OR array_length(array1, 1) IS NULL OR array_length(array2, 1) IS NULL OR (array_length(array1, 1) = 0 AND array_length(array2, 1) = 0) THEN
            RETURN 0.0;
        END IF;

        -- Calculate intersection
        SELECT count(*) INTO intersection_count
        FROM (
            SELECT unnest(array1) INTERSECT SELECT unnest(array2)
        ) AS intersect_elements;

        -- Calculate union
        SELECT array_agg(DISTINCT el) INTO unique_elements FROM (
            SELECT unnest(array1) AS el
            UNION
            SELECT unnest(array2) AS el
        ) AS union_source;
        
        union_count := array_length(unique_elements, 1);

        IF union_count = 0 THEN
            RETURN 0.0; -- Should be covered by initial check, but as a safeguard
        END IF;

        RETURN intersection_count::FLOAT / union_count::FLOAT;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;

    COMMENT ON FUNCTION public.calculate_jaccard_index_text_arrays(TEXT[], TEXT[]) IS 'Calculates the Jaccard Index between two arrays of text elements. Returns a score between 0.0 and 1.0.';
    ```

### 3.3. PostgreSQL Main Function: `match_playlist_to_users`

This function is responsible for iterating through users and checking if their taste profile matches a newly added/updated playlist's artist profile.

*   **Triggered by:** Changes to `public.playlist_track_artist_aggregates`.
*   **Inputs (from trigger context):** `NEW.playlist_id UUID`, `NEW.artists_json JSONB`.
*   **Configuration:** Uses a hardcoded `SIMILARITY_THRESHOLD` (e.g., 0.02).
*   **Logic:**
    1.  Extract the Spotify artist IDs from `NEW.artists_json` for the new/updated playlist. If no artists, exit.
    2.  Fetch `submitted_by_user_id` for `NEW.playlist_id` from `public.playlists` table to exclude this user from matching against their own playlist.
    3.  Iterate through each user in `public.profiles` (excluding the submitter of the current playlist).
    4.  For each user:
        a.  Initialize an empty array for the user's artist IDs.
        b.  Fetch and add artist Spotify IDs from `public.user_top_artists` for the current user.
        c.  Fetch and add artist Spotify IDs from `public.playlist_track_artist_aggregates.artists_json` for all playlists submitted by the current user. This requires parsing the JSONB array of artists for each aggregate record.
        d.  Ensure the collected user artist IDs are distinct.
        e.  If the user has no artists in their profile, skip to the next user.
        f.  Calculate Jaccard Index using `public.calculate_jaccard_index_text_arrays` with the new playlist's artists and the current user's aggregated artists.
        g.  If the similarity score is greater than or equal to `SIMILARITY_THRESHOLD`, insert a record into `public.user_playlist_matches` (`user_id`, `playlist_id`). Use `ON CONFLICT (user_id, playlist_id) DO NOTHING` to handle cases where a match might already exist or the trigger fires multiple times.
*   **SQL Definition:**
    ```sql
    CREATE OR REPLACE FUNCTION public.match_playlist_to_users()
    RETURNS TRIGGER AS $$
    DECLARE
        playlist_artist_ids TEXT[];
        playlist_submitter_id UUID;
        current_user RECORD;
        user_artist_ids TEXT[];
        current_user_top_artists TEXT[];
        current_user_playlist_aggregate_artists JSONB;
        artist_record JSONB;
        similarity_score FLOAT;
        -- Configuration:
        SIMILARITY_THRESHOLD FLOAT := 0.02; -- 2% similarity threshold
    BEGIN
        -- 1. Extract artist IDs from the new/updated playlist's aggregates
        SELECT array_agg(DISTINCT artist_data->>'spotify_artist_id')
        INTO playlist_artist_ids
        FROM jsonb_array_elements(NEW.artists_json) AS artist_data
        WHERE artist_data->>'spotify_artist_id' IS NOT NULL;

        IF playlist_artist_ids IS NULL OR array_length(playlist_artist_ids, 1) = 0 THEN
            RAISE NOTICE 'Playlist ID % has no artists in its aggregate. Skipping matching.', NEW.playlist_id;
            RETURN NULL; -- No artists in the new playlist to match against
        END IF;

        -- 2. Get the submitter of the playlist to exclude them from matching
        SELECT submitted_by_user_id INTO playlist_submitter_id
        FROM public.playlists
        WHERE id = NEW.playlist_id;

        -- 3. Loop through each user in public.profiles
        FOR current_user IN SELECT id FROM public.profiles LOOP
            -- Skip if the current user is the one who submitted this playlist
            IF playlist_submitter_id IS NOT NULL AND current_user.id = playlist_submitter_id THEN
                CONTINUE;
            END IF;

            user_artist_ids := ARRAY[]::TEXT[]; -- Initialize/reset for each user

            -- 4a. Fetch user's top artists
            SELECT array_agg(artist_spotify_id)
            INTO current_user_top_artists
            FROM public.user_top_artists
            WHERE user_id = current_user.id;

            IF current_user_top_artists IS NOT NULL THEN
                user_artist_ids := array_cat(user_artist_ids, current_user_top_artists);
            END IF;

            -- 4b. Fetch artists from user's other playlist aggregates
            FOR current_user_playlist_aggregate_artists IN
                SELECT ptaa.artists_json
                FROM public.playlist_track_artist_aggregates ptaa
                JOIN public.playlists p ON ptaa.playlist_id = p.id
                WHERE p.submitted_by_user_id = current_user.id AND ptaa.playlist_id != NEW.playlist_id -- Exclude the current playlist being processed
            LOOP
                FOR artist_record IN SELECT * FROM jsonb_array_elements(current_user_playlist_aggregate_artists) LOOP
                    IF artist_record->>'spotify_artist_id' IS NOT NULL THEN
                        user_artist_ids := array_append(user_artist_ids, artist_record->>'spotify_artist_id');
                    END IF;
                END LOOP;
            END LOOP;
            
            -- Ensure unique artist IDs for the user
            IF array_length(user_artist_ids, 1) > 0 THEN
                 SELECT array_agg(DISTINCT e) INTO user_artist_ids FROM unnest(user_artist_ids) e;
            END IF;

            IF user_artist_ids IS NULL OR array_length(user_artist_ids, 1) = 0 THEN
                CONTINUE; -- User has no artists in their profile, skip.
            END IF;

            -- 5. Calculate Jaccard Index
            similarity_score := public.calculate_jaccard_index_text_arrays(playlist_artist_ids, user_artist_ids);

            -- 6. If score meets threshold, insert into user_playlist_matches
            IF similarity_score >= SIMILARITY_THRESHOLD THEN
                RAISE NOTICE 'Match found for user % and playlist % with score %', current_user.id, NEW.playlist_id, similarity_score;
                INSERT INTO public.user_playlist_matches (user_id, playlist_id, matched_at)
                VALUES (current_user.id, NEW.playlist_id, now())
                ON CONFLICT (user_id, playlist_id) DO NOTHING;
            END IF;

        END LOOP;

        RETURN NULL; -- Result of trigger is not used
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Error in match_playlist_to_users trigger for playlist_id %: %', NEW.playlist_id, SQLERRM;
            RETURN NULL;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER; -- Run with definer's permissions

    COMMENT ON FUNCTION public.match_playlist_to_users() IS 'Trigger function to match a newly aggregated playlist against all users based on artist similarity. Inserts matches into user_playlist_matches.';
    ```

### 3.4. PostgreSQL Trigger: `trigger_playlist_user_matching_on_aggregates`

This trigger calls the `match_playlist_to_users` function after a playlist's aggregate data is inserted or its `artists_json` field is updated.

*   **Table:** `public.playlist_track_artist_aggregates`
*   **Event:** `AFTER INSERT OR UPDATE OF artists_json`
*   **Action:** `FOR EACH ROW EXECUTE FUNCTION public.match_playlist_to_users()`
*   **SQL Definition:**
    ```sql
    CREATE TRIGGER trigger_playlist_user_matching_on_aggregates
    AFTER INSERT OR UPDATE OF artists_json ON public.playlist_track_artist_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION public.match_playlist_to_users();

    COMMENT ON TRIGGER trigger_playlist_user_matching_on_aggregates ON public.playlist_track_artist_aggregates IS 'When playlist aggregates are inserted or artists_json is updated, triggers the matching logic to find relevant users.';
    ```

### 3.5. Configuration

The Jaccard similarity threshold is currently defined as `SIMILARITY_THRESHOLD FLOAT := 0.02;` within the `match_playlist_to_users` function. This can be adjusted directly in the function definition if needed.

## 4. Data Flow

1.  A Spotify playlist is imported into the system. The `importPlaylist` server action (in `app/_actions/import-playlist.ts`) saves playlist metadata to `playlists`, track data to `playlist_tracks`, and then calculates and upserts aggregate data (including `artists_json`) into `playlist_track_artist_aggregates`.
2.  The `AFTER INSERT OR UPDATE OF artists_json` on `playlist_track_artist_aggregates` fires the `trigger_playlist_user_matching_on_aggregates`.
3.  The `match_playlist_to_users()` PostgreSQL function is executed for the newly inserted/updated row (`NEW`).
4.  The function extracts the list of Spotify artist IDs from `NEW.artists_json`.
5.  It identifies the `submitted_by_user_id` of the playlist from the `playlists` table.
6.  It iterates through each user profile in the `profiles` table (excluding the playlist submitter).
    *   For each user, it constructs a comprehensive taste profile by collecting unique artist Spotify IDs from:
        *   `user_top_artists` table (for that user).
        *   `playlist_track_artist_aggregates.artists_json` (for all *other* playlists submitted by that user).
7.  The `calculate_jaccard_index_text_arrays` function is called to compare the new playlist's artist set with the current user's artist set.
8.  If the resulting Jaccard Index score meets or exceeds the `SIMILARITY_THRESHOLD` (0.02):
    *   A new record `{ user_id: current_user_id, playlist_id: NEW.playlist_id, matched_at: now() }` is inserted into the `user_playlist_matches` table.
    *   The `ON CONFLICT (user_id, playlist_id) DO NOTHING` clause prevents duplicate entries.
9.  The process repeats for all applicable users.

## 5. Acceptance Criteria

-   The `user_playlist_matches` table exists and is correctly populated by this process (Confirmed table existence).
-   The `calculate_jaccard_index_text_arrays` PostgreSQL function accurately computes the Jaccard Index score between two `TEXT[]` inputs.
-   The `match_playlist_to_users` PostgreSQL function:
    -   Correctly extracts artist IDs from `artists_json`.
    -   Correctly aggregates a user's taste profile from `user_top_artists` and their other `playlist_track_artist_aggregates`.
    -   Excludes the playlist's submitter from being matched with their own playlist.
    -   Identifies and records matches in `user_playlist_matches` when the Jaccard score is `>= SIMILARITY_THRESHOLD`.
-   The `trigger_playlist_user_matching_on_aggregates` on `public.playlist_track_artist_aggregates` successfully executes `match_playlist_to_users` after relevant `INSERT` or `UPDATE` operations on `artists_json`.
-   The system handles users with no taste profile data (no top artists, no prior playlist submissions) and playlists with no artists in their aggregates gracefully (i.e., no errors, no matches generated).
-   RLS policies on `user_playlist_matches` are respected for subsequent access, and the trigger function operates with sufficient privileges (e.g., `SECURITY DEFINER`) to insert records.

## 6. Future Considerations

-   **Configurable Threshold:** Move `SIMILARITY_THRESHOLD` to a dedicated configuration table for easier adjustments without altering function code.
-   **Opt-Out:** Allow users to opt-out of being included in this automated matching process or receiving related notifications.
-   **Performance Optimization:** For very large user bases or high rates of playlist imports, monitor performance. Consider batching updates or optimizing user profile aggregation if it becomes a bottleneck.
-   **Advanced Matching Logic:** Explore more sophisticated matching algorithms beyond simple Jaccard Index on artists (e.g., incorporating genres, audio features, or weighted artist importance).
-   **Notification System Integration:** This epic focuses on recording matches. A subsequent epic will handle generating notifications based on these matches as outlined in Epic 4.

## 7. Security Considerations

-   The `match_playlist_to_users` function is defined with `SECURITY DEFINER`. This means it executes with the privileges of the user who defines the function (typically a superuser or administrative role during migrations). This is necessary for the trigger to reliably insert data into `user_playlist_matches` across different user contexts. Ensure the function owner has the necessary `INSERT` permissions on `user_playlist_matches` and `SELECT` permissions on `profiles`, `playlists`, `user_top_artists`, and `playlist_track_artist_aggregates`.
-   The function logic itself does not use any user-supplied input directly in dynamic SQL that could lead to SQL injection beyond the `NEW` record data, which is structured. 