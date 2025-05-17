# Product Requirements Document: Playlist Chat Rooms

## 1. Introduction

This document outlines the requirements for the "Playlist Chat Rooms" application. The application aims to provide a space for users to chat and discover music, using Spotify playlists as the background for discussions, fostering a music-oriented community.

## 2. Goals

*   Create a platform for users to engage in real-time chat discussions centered around music.
*   Enable music discovery through shared Spotify playlists and user interactions.
*   Foster a community of users with similar music tastes.
*   Provide a seamless and engaging user experience for both chat and music playback (asynchronously).

## 3. Target Audience

*   Music enthusiasts looking for new music and discussions.
*   Users of platforms like YouTube music live streams who desire a more Spotify-integrated and music-focused chat experience.
*   Individuals interested in sharing their music taste and discovering others'.

## 4. MVP Scope

Based on the project brief's preference for a phased rollout, the initial MVP will focus on establishing the core chat functionalities. Subsequent phases will introduce Spotify player integration and advanced features.

**Phase 1 (Core MVP):**

*   User authentication via Spotify.
*   Basic real-time chat room functionality (one or more default rooms to start).
*   Display of current user's avatar in chat.
*   Display of a real-time avatar stack of users in a chat room.

**Subsequent Phases (Post-MVP / Iterative Enhancements):**

*   Spotify Player Integration:
    *   SDK setup (handling token refresh, track relinking).
    *   Player UI with described sections (track/playlist info, controls like play/pause, next/last song, volume, shuffle).
    *   Ability to save songs and follow playlists via Spotify API.
    *   Asynchronous listening capability (users control their own playback).
*   Advanced Chat Features:
    *   @mention functionality for songs, artists, or playlists within the chat (using shadcn-editor) with UI cards.
*   Taste-Driven Dynamic Room System:
    *   Dynamic chat room creation (splitting at 50 users to 2 rooms of 25).
    *   Matching users by music taste for room assignments.
    *   Storing playlist data (artists, songs) for taste comparison.
    *   Fetching top artists from users' Spotify accounts to enhance taste mapping.
    *   Filtering and cueing playlists based on taste matching.
    *   Users play playlists from other users, not their own.

## 5. High-Level Functional Requirements

### 5.1. User Management
*   FR1: Users must be able to sign up/log in using their Spotify account.
*   FR2: The system must display the user's Spotify avatar.

### 5.2. Chat Functionality (Core MVP)
*   FR3: Users must be able to send and receive real-time messages in a chat room.
*   FR3.1: The system will start with one main default chat room, which will always exist.
*   FR3.2: Authenticated users must be able to edit their own sent messages.
*   FR3.3: Authenticated users must be able to delete their own sent messages.
*   FR4: The system must display a list of currently active users in a chat room (e.g., avatar stack).
*   FR5: (Future) Users should be able to @mention songs, artists, or playlists in messages.
*   FR6: (Future) @mentions should display as rich UI cards (song image, artist image, playlist image).

### 5.3. Spotify Integration & Playback (Future Phases)
*   FR7: The system must integrate with the Spotify Web API and Web Playback SDK.
*   FR8: Users must be able to control Spotify playback (play, pause, skip, volume, shuffle) via an in-app player UI.
*   FR9: The player UI must display current track image, song name, artist name, and playlist name.
*   FR10: Users must be able to navigate to the previous/next song in the current playlist.
*   FR11: Users must be able to navigate to the previous/next playlist from a curated or suggested list.
*   FR12: Users must be able to save the currently playing track to their Spotify library.
*   FR13: Users must be able to follow the currently playing playlist on Spotify.
*   FR14: The system must handle Spotify token refresh mechanisms.
*   FR15: The system must handle Spotify track relinking.
*   FR16: Users in a chat room listen to music asynchronously (i.e., their playback is independent of others).

### 5.4. Dynamic Room Management & Music Matching (Future Phases)
*   FR17: The system should dynamically create new chat rooms when a room reaches a threshold (e.g., 50 users, splitting into two rooms of 25).
*   FR18: When splitting rooms, the system should attempt to group users with similar music tastes. The criteria for a match will involve comparing shared artists, songs, and track features, with a threshold (e.g., requiring at least 5% similarity or a certain number of overlapping items based on this percentage).
*   FR19: The system must store artist and song data from user-shared/played playlists (e.g., as JSONB arrays) for taste comparison.
*   FR20: The system may fetch top artists from a user's Spotify account to improve taste mapping.
*   FR21: The system should allow users to discover and play playlists from other users with overlapping music tastes. The "last playlist" and "next playlist" navigation in the player will operate within this pool of taste-matched playlists.
*   FR22: Users will not play their own playlists within the app; they will play playlists from other users.

## 6. Non-Functional Requirements

### 6.1. Performance
*   NFR1: Real-time chat messages should appear with minimal latency (e.g., < 500ms).
*   NFR2: UI interactions (player controls, page loads) should be responsive.

### 6.2. Scalability
*   NFR3: The system should be able to handle a growing number of concurrent users and chat rooms.
*   NFR4: Dynamic room creation should efficiently manage user distribution.

### 6.3. Reliability
*   NFR5: The application should maintain stable connections for real-time features.
*   NFR6: Spotify integration (auth, playback, API calls) should be resilient to transient errors.

### 6.4. Security
*   NFR7: User authentication and Spotify token management must be secure.
*   NFR8: Standard security practices for web applications should be followed.

### 6.5. Usability
*   NFR9: The user interface should be intuitive and easy to navigate.
*   NFR10: Pre-selected UI components (Supabase UI, shadcn-editor) should be integrated seamlessly.

### 6.6. Known Technical Constraints & Preferences
*   NFR11: **Tech Stack:**
    *   Next.js (latest)
    *   Supabase (latest)
    *   Tailwind CSS (latest)
    *   Shadcn UI (latest)
    *   Spotify Web API & Web Playback SDK, specifically using the `@spotify/web-api-ts-sdk` TypeScript SDK.
*   NFR12: **Pre-defined UI Components:**
    *   Login with Spotify: Supabase UI (`@supabase/auth-helpers-nextjs` or similar for Next.js 13+ App Router if `supabase/ui` components are for older Next versions)
    *   Chat room UI: Supabase UI (`realtime-chat` example)
    *   Current user avatar: Supabase UI (`current-user-avatar` example)
    *   Real-time avatar stack: Supabase UI (`realtime-avatar-stack` example)
    *   @mention editor: `shadcn-editor` (https://shadcn-editor.vercel.app/)
*   NFR13: **Spotify SDK Handling:**
    *   Implement robust token refresh mechanism.
    *   Handle track relinking.
    *   The Spotify player needs to gracefully handle scenarios where the device was inactive, potentially requiring a reset and remount of the player to avoid runtime errors.
*   NFR14: **Development Preferences:**
    *   Prefer Next.js Server Actions over traditional API routes where appropriate.
    *   Use Zod for API/data validation.
    *   Utilize Supabase MCP for all database interactions and schema changes.
    *   Utilize Context7 MCP for reading external library documentation.
    *   Maintain a central TypeScript types file for database types (e.g., `types/database.ts`).
    *   Update pre-installed/scaffolded components with correct database types from the central file.
    *   Always print out the latest database types using Supabase MCP after any database schema modification.
*   NFR15: **Development Order Preference:**
    1.  Core Chat functionality.
    2.  Playlist Management and Taste Profiling.
    3.  Spotify player and related Spotify functions.
    4.  @mention functionality.
    5.  Taste-Driven Dynamic Room System.

## 7. Integrations

*   **Spotify API:** For authentication, user data, playlist data, track data, playback control, saving tracks, following playlists.
*   **Supabase:** For backend services including database, real-time messaging, authentication.

## 8. Epic Overview (Initial)

The project will be broken down into the following epics, aligned with the phased approach:

*   **Epic 1: Core User Authentication & Chat Setup**
    *   *Goal:* Enable users to log in and participate in basic real-time chat.
*   **Epic 2: Playlist Management and Taste Profiling**
    *   *Goal:* Establish mechanisms for ingesting user-related playlist data (from shared/played playlists and user's Spotify top items) and performing initial taste profiling. This will enable later matching for room assignments and playlist recommendations (supports FR19, FR20, FR21, FR22).
*   **Epic 3: Spotify Player and Music Interaction**
    *   *Goal:* Allow users to control Spotify playback asynchronously (playing playlists from other users based on taste profiles) and interact with Spotify content (save, follow) (supports FR7-FR15).
*   **Epic 4: Enhanced Chat Experience (@mentions)**
    *   *Goal:* Enrich chat with @mention capabilities for songs, artists, and playlists (supports FR5, FR6, FR16).
*   **Epic 5: Taste-Driven Dynamic Room System**
    *   *Goal:* Implement dynamic room creation, leveraging taste profiles to group users and enhance music discovery (supports FR17, FR18).

## 9. Future Scope / Out of Initial MVP

*   Detailed analytics on music taste overlaps.
*   Advanced playlist curation tools beyond basic matching.
*   User profiles with detailed music taste summaries.
*   Gamification elements for music discovery.

## 10. Success Metrics (Preliminary)

*   Number of active users.
*   Average session duration.
*   Number of messages sent per user/session.
*   Number of chat rooms dynamically created.
*   (Future) Number of songs/playlists saved/followed via the app.
*   (Future) Usage rate of @mention feature.

## 11. Open Questions & Assumptions

*   **Assumption:** The Supabase UI components mentioned (`supabase.com/ui/docs/nextjs/...`) are compatible with the latest Next.js version and App Router, or suitable alternatives from `@supabase/ssr` and custom components will be used.
*   **Answered Question (Taste Mapping Criteria):** The criteria for "mapping out music taste" and determining "overlapping music taste" will involve comparing shared artists, songs, and track features. A match could be defined by, for example, at least a 5% overlap in these features between a user's profile/listening history and a playlist, or between users. (Further refinement of the algorithm details may be needed during development).
*   **Answered Question (Playlist Navigation):** The "last playlist" and "next playlist" functionality in the player UI will navigate through playlists that match the user's taste profile from the available pool of shared playlists.
*   **Answered Question (Initial Room Setup):** The application will start with one main default chat room. This room will be a persistent entity, likely represented as a default row in the database. Dynamic splitting into new rooms will occur from this base.
*   **Answered Question (Fallback for Room Splitting):** For dynamic room creation, if music taste matching for distributing users into the new rooms is not immediately perfect or clear for all users, the fallback logic for user distribution will be based on the order of user registration (e.g., grouping by newest or oldest registered users, TBD during implementation detail design).

---
*This PRD is a living document and will be updated as the project progresses.* 