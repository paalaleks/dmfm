# Epic 7: Persist Song Likes in Local Database

**ID:** EPIC-007

**Status:** To Do

**Priority:** High

**Assignee:** TBD

**Reporter:** Architect Agent

**Created Date:** 2024-07-28

**Last Updated Date:** 2024-07-28

## Goal

To allow users to "like" (save) songs, have these likes stored in the application's local Supabase database, and make these likes potentially visible or useful for features involving other users. This functionality will supplement the existing feature of saving songs to a user's Spotify library.

## Motivation

-   **Enable Social Features:** Storing likes locally is a prerequisite for features such as "see who liked this song," "popular songs among users," or "recommendations based on friends' likes."
-   **Application-Specific Data:** Provides a persistent record of user preferences within our application, independent of Spotify account status or changes.
-   **Data Analysis:** Allows for analysis of popular tracks and user engagement within the app's ecosystem.
-   **Enhanced Discovery:** Can be used to build internal recommendation algorithms or highlight trending tracks within the user community.

## Scope

-   **Database Changes:** Design and implement a new table to store song likes, including user ID, track Spotify ID, an optional `playlist_id` (to reference the source playlist, if any), and a timestamp.
-   **API Endpoints/Server Actions:** Create mechanisms to record a song like from the client to the new database table and to remove a like.
-   **Client-Side Integration:** Update the UI to trigger the new like/unlike actions that interact with our backend, in addition to the existing Spotify save.
-   **Data Synchronization (Consideration):** Determine if/how these local likes should be synchronized or related to Spotify's "Liked Songs" (e.g., if a user unlikes on Spotify, should it reflect locally, and vice-versa? Initial scope might be one-way: App -> DB + Spotify).
-   **RLS Policies:** Implement appropriate Row Level Security for the new table.

## Out of Scope (for initial version unless specified in stories)

-   Complex social feeds based on likes.
-   Advanced recommendation algorithms using like data.
-   Real-time synchronization of likes *from* Spotify to our database.

## User Stories

-   [Story 7.1: Implement Database Table and RLS for Song Likes](../stories/7.1.story-save-likes.md)
-   [Story 7.2: Implement API Endpoints (Server Actions) for Song Likes](../stories/7.2.story-api-song-likes.md)
-   [Story 7.3: Integrate Local Song Likes with Player UI](../stories/7.3.story-ui-integrate-song-likes.md)

## Acceptance Criteria (Epic Level)

-   Users can "like" a song, and this action is recorded in the local database.
-   Users can "unlike" a song, and this is reflected in the local database.
-   The database schema for song likes is well-defined, indexed, and secured with RLS.
-   The system remains stable and performant with the new liking functionality.

## Technical Considerations

-   Database schema design must adhere to guidelines from `postgres-sql-style-guide.mdc`.
-   Migrations must follow guidelines from `create-migration.mdc`.
-   RLS policies must follow guidelines from `create-rls-policies.mdc`.
-   Consider potential for duplicate entries if not handled correctly (e.g., unique constraint on `user_id`, `track_spotify_id`, and nullable `playlist_id`).
-   Ensure `user_id`, `track_spotify_id`, and `playlist_id` are appropriately indexed for performance.

## Risks

-   Data integrity issues if synchronization with Spotify (if any) is not handled carefully.
-   Performance impact on database with a large number of likes.
-   Scope creep if social features are pulled in too early.

## Dependencies

-   Existing user authentication system (`profiles` table).
-   Mechanism to identify tracks (e.g., `track_spotify_id`). 