# Epic 2: Playlist Management and Taste Profiling

**Status:** Ready

## Goal

Establish mechanisms for ingesting user-related playlist data (from shared/played playlists and user's Spotify top items) and performing initial taste profiling. This will enable later matching for room assignments and playlist recommendations.

## Associated Functional Requirements

*   **FR19:** The system must store artist and song data from user-shared/played playlists (e.g., as JSONB arrays) for taste comparison.
*   **FR20:** The system may fetch top artists/tracks from a user's Spotify account to improve taste mapping.
*   **FR21:** The system should allow users to discover and play playlists from other users with overlapping music tastes. The "last playlist" and "next playlist" navigation in the player will operate within this pool of taste-matched playlists.
*   **FR22:** Users will not play their own playlists within the app; they will play playlists from other users.

## Stories

*   **Story 2.1: Define Database Schema for Playlist and Taste Data**
    *   *Goal:* Define and implement the necessary database schema changes (new tables, alterations) to store user top items, playlists, tracks, and interactions.
    *   *Status:* Complete
*   **Story 2.2: Fetch and Store User Top Artists/Tracks from Spotify**
    *   *Goal:* Implement a mechanism (likely a Server Action) to fetch the authenticated user's top artists and top tracks from the Spotify API and store them in the corresponding database tables (`user_top_artists`, `user_top_tracks`).
    *   *Status:* Done
*   **Story 2.3: Implement Playlist Submission/Import**
    *   *Goal:* Allow users (or the system) to submit/import Spotify playlist IDs, fetch playlist metadata and track details from Spotify, and store them in the `playlists` and `playlist_items` tables.
    *   *Status:* Done
*   **Story 2.4: Develop Initial Taste Comparison Logic**
    *   *Goal:* Create basic functions or logic to compare user taste profiles (based on stored top items and playlist data) to identify potential matches or similarities (e.g., calculating overlap percentage).
    *   *Status:* Done

*(Note: Story breakdown and goals are preliminary and may be refined.)* 