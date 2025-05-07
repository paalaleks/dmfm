# Epic 2: Spotify Player and Music Interaction

**Epic Goal:** Allow users to control Spotify playback asynchronously within the application and interact with Spotify content (e.g., save tracks, follow playlists).

**Status:** To Do

## Description

This epic focuses on integrating the Spotify Web Playback SDK to enable in-app music control. It establishes the foundation for users to manage their listening experience directly within "Playlist Chat Rooms." This includes setting up the `MusicContext` for global state management of the player, initializing the SDK, and preparing for subsequent stories that will implement specific player controls and Spotify interactions like saving tracks or following playlists. This phase is crucial for transforming the application from a chat platform into an interactive music experience hub.

## Functional Requirements Covered (from PRD)

*   **FR7:** System must integrate with Spotify Web API and Web Playback SDK.
*   **FR8:** Users must be able to control Spotify playback (play, pause, skip, volume, shuffle) via an in-app player UI. (Foundation laid in this epic)
*   **FR9:** The player UI must display current track image, song name, artist name, and playlist name. (Foundation laid in this epic)
*   **FR10:** Users must be able to navigate to the previous/next song in the current playlist.
*   **FR12:** Users must be able to save the currently playing track to their Spotify library.
*   **FR13:** Users must be able to follow the currently playing playlist on Spotify.
*   **FR14:** The system must handle Spotify token refresh mechanisms.
*   **FR15:** The system must handle Spotify track relinking.

## Key Non-Functional Requirements Addressed

*   **NFR2:** UI interactions should be responsive.
*   **NFR5:** Application should maintain stable connections for real-time features (applies to Spotify SDK).
*   **NFR7:** User authentication and Spotify token management must be secure (provider token usage).
*   **NFR9:** User interface should be intuitive and easy to navigate.
*   **NFR11:** Adherence to specified Tech Stack (Next.js, Supabase, Tailwind CSS, Shadcn UI, Spotify SDKs).
*   **NFR13:** Spotify SDK Handling (token refresh, track relinking, graceful inactive device handling).
*   **NFR14:** Adherence to Development Preferences (Server Actions, Zod, Supabase MCP, Context7 MCP, central types file).

## Stories within this Epic (Initial Plan)

1.  **Story 2.1:** Setup Spotify Web Playback SDK and Basic Player UI Shell
    *   *Goal:* Integrate the Spotify Web Playback SDK, initialize it with the user's Spotify token, set up the `MusicContext` for global player state management, and implement a basic UI shell for player information and controls.
2.  **Story 2.2:** Implement Core Player Controls (Play, Pause, Volume) and State Display
    *   *Goal:* Develop the UI and functionality for core playback controls (play, pause, volume adjustment) and display essential player state information (current track, artist, album art).
3.  **Story 2.3:** Implement Track Navigation (Next/Previous Song) and Playlist Information Display
    *   *Goal:* Enable users to skip to the next or previous track in the current Spotify context (playlist/album) and display relevant playlist information.
4.  **Story 2.4:** Implement "Save Track to Spotify Library" Functionality
    *   *Goal:* Allow users to save the currently playing track to their personal Spotify library using the Spotify Web API.
5.  **Story 2.5:** Implement "Follow Playlist on Spotify" Functionality
    *   *Goal:* Allow users to follow the playlist currently associated with the player on their Spotify account using the Spotify Web API.
6.  **Story 2.6:** Advanced SDK Handling (Token Refresh, Track Relinking, Device Management)
    *   *Goal:* Ensure robust Spotify integration by implementing comprehensive token refresh logic, track relinking capabilities, and user-friendly active device management.

## Key Technical Context & References

*   `docs/prd.md` (Product Requirements Document)
*   `docs/architecture.md` (Overall system architecture, Spotify integration points)
*   `docs/frontend-architecture.md` (Details on `MusicContext`, client-side Spotify interactions)
*   `docs/tech-stack.md` (Specified Spotify SDKs)
*   `docs/project-structure.md` (File locations for context, hooks, components)
*   `docs/coding-standards.md`
*   `docs/environment-variables.md`
*   Official Spotify Web Playback SDK Documentation
*   Official Spotify Web API Documentation (and `@spotify/web-api-ts-sdk` documentation) 