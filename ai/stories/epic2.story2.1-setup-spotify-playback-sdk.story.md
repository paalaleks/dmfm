# Story 2.1: Setup Spotify Web Playback SDK and Basic Player UI Shell

**ID:** `epic2.story2.1`
**Parent Epic:** [Epic 2: Spotify Player and Music Interaction](./epic-2-spotify-player-interaction.epic.md)
**Status:** Draft

## Goal

Integrate the Spotify Web Playback SDK into the Next.js application, initialize it with the user's Spotify access token, set up the `MusicContext` for global player state management, and implement a basic UI shell for player information and controls. This story lays the groundwork for all subsequent player functionalities.

## Requirements

1.  The Spotify Web Playback SDK script must be included in the application.
2.  A `MusicContext` must be created (`context/MusicContext.tsx`) to manage and provide player state and SDK interactions globally.
3.  The `MusicContext.Provider` must be added to the root layout (`app/layout.tsx` or `app/(main)/layout.tsx`) to make it accessible throughout the authenticated parts of the application.
4.  A custom hook, `useSpotifyPlayer` (`hooks/useSpotifyPlayer.ts`), should encapsulate SDK initialization logic, event handling, and provide functions to interact with the player.
5.  The SDK must be initialized after a user is authenticated and their Spotify access token is available (obtained from the Supabase session).
6.  The `MusicContext` should store essential player states such as the SDK instance, device ID, player readiness, and basic error states.
7.  A basic, persistent UI component (`components/custom/SpotifyPlayerUI.tsx`) should be created to serve as a placeholder for player information and controls. This component will consume data from `MusicContext`.
8.  The `SpotifyPlayerUI.tsx` component should be integrated into the main application layout to be visible across relevant pages.
9.  Initial error handling for SDK initialization (e.g., no token, SDK script failed to load) must be implemented.

## Technical Tasks

- [ ] **TSD-1:** Define `MusicContext` and `MusicProvider`.
    - Create `context/MusicContext.tsx`.
    - Define the context shape (e.g., `player`, `deviceId`, `isReady`, `error`, `initPlayer`, etc.).
    - Implement the `MusicProvider` component.
- [ ] **TSD-2:** Integrate `MusicProvider` into the Root Layout.
    - Wrap the appropriate part of `app/layout.tsx` or `app/(main)/layout.tsx` with `MusicProvider`.
- [ ] **TSD-3:** Create `useSpotifyPlayer` Hook.
    - Create `hooks/useSpotifyPlayer.ts`.
    - This hook will consume `MusicContext` and contain logic to:
        - Load the Spotify Web Playback SDK script.
        - Initialize the `Spotify.Player` object once authenticated and token is available.
        - Handle SDK event listeners (`ready`, `not_ready`, `player_state_changed`, `authect_error`, `account_error`, `playback_error`).
        - Update `MusicContext` with player state (device ID, readiness, errors).
- [ ] **TSD-4:** Implement Spotify Access Token Retrieval.
    - Within `useSpotifyPlayer` or a helper in `lib/spotify.ts`, implement logic to retrieve the Spotify access token from the authenticated Supabase user's session (e.g., `session.provider_token`).
- [ ] **TSD-5:** Develop Basic `SpotifyPlayerUI` Component.
    - Create `components/custom/SpotifyPlayerUI.tsx`.
    - This component will consume `MusicContext`.
    - Initially, display basic information like "Player Loading...", "Player Ready (Device ID: {deviceId})", or "Player Error: {error}".
- [ ] **TSD-6:** Integrate `SpotifyPlayerUI` into Main Layout.
    - Add the `SpotifyPlayerUI.tsx` component to a persistent part of the UI (e.g., a footer or a specific section within `app/(main)/layout.tsx`).
- [ ] **TSD-7:** Implement Basic Error Handling for SDK Setup.
    - Ensure that errors during SDK script loading, initialization, or authentication are caught and reflected in the `MusicContext` and displayed in `SpotifyPlayerUI`.

## Acceptance Criteria

*   The Spotify Web Playback SDK script is successfully loaded by the application.
*   Upon successful user authentication, the `MusicContext` is initialized.
*   The `useSpotifyPlayer` hook attempts to initialize the Spotify Web Playback SDK using the user's Spotify access token from their Supabase session.
*   If SDK initialization is successful, the `MusicContext` reflects a ready state and the Spotify device ID.
*   The basic `SpotifyPlayerUI` component is visible and displays the current status of the SDK (e.g., "Loading", "Ready", "Error").
*   If SDK initialization fails (e.g., due to an invalid token or SDK error), an appropriate error state is reflected in the context and UI.
*   The application remains stable even if the Spotify Web Playback SDK fails to initialize.
*   Console errors related to unhandled promise rejections from the SDK are minimized.

## Technical Context & References

*   **Guidance:** This story is foundational for Epic 2. The primary goal is to get the SDK script loaded, initialized, and connected to a global React context.
*   **Relevant Files:**
    *   Files to Create:
        *   `context/MusicContext.tsx`
        *   `hooks/useSpotifyPlayer.ts`
        *   `components/custom/SpotifyPlayerUI.tsx`
    *   Files to Modify:
        *   `app/layout.tsx` (or `app/(main)/layout.tsx`)
        *    Potentially `lib/spotify.ts` for token helper functions.
*   **Key Technologies:**
    *   Next.js (App Router, React Server & Client Components, Hooks)
    *   React Context API
    *   Spotify Web Playback SDK (Note: This is typically included as a script, not an npm package. Refer to official Spotify documentation.)
    *   TypeScript
*   **API Interactions / SDK Usage:**
    *   Spotify Web Playback SDK:
        *   Loading the `spotify-player.js` script.
        *   `window.onSpotifyWebPlaybackSDKReady = () => { ... }`
        *   `new Spotify.Player({ name: 'Playlist Chat Rooms Player', getOAuthToken: callback, volume: 0.5 })`
        *   Player event listeners: `ready`, `not_ready`, `player_state_changed`, `autherr`, `account_error`.
    *   Supabase Client: To access the authenticated user's session and `provider_token` for Spotify.
*   **Data Structures:**
    *   Shape of `MusicContext` state (e.g., `sdkReady: boolean`, `deviceId: string | null`, `playerInstance: Spotify.Player | null`, `error: string | null`).
*   **Environment Variables:**
    *   `NEXT_PUBLIC_APP_URL` (potentially useful for SDK initialization if any redirect URIs are involved, though less common for Playback SDK itself).
*   **Coding Standards Notes:**
    *   Use `async/await` for token retrieval and any async SDK interactions.
    *   Manage client-side state effectively using `useState`, `useEffect`, and `useContext`.
    *   Refer to `docs/coding-standards.md` and `docs/frontend-architecture.md`.
*   **Official Documentation:**
    *   Developer MUST refer to the official Spotify Web Playback SDK documentation for detailed setup, API, and event handling.
    *   Supabase documentation for accessing `provider_token` from user session.

## Testing Requirements

*   **Manual Testing:**
    *   Log in with a Spotify account that has Spotify Premium (required by Playback SDK).
    *   Verify the `SpotifyPlayerUI` component appears and shows a "Loading" or "Ready" state.
    *   Check browser developer console for SDK initialization messages or errors.
    *   Verify the application ("Playlist Chat Rooms Player") appears as an available playback device in the native Spotify app ("Connect to a device" menu).
    *   Test with an invalid/expired token scenario (if feasible to simulate) to observe error handling.
    *   Test on different browsers if possible (Chrome, Firefox, Safari).
*   _(Hint: See `docs/testing-strategy.md` for the overall approach. Unit/Integration tests for this specific SDK setup might be complex for MVP and deferred)._

## Story Wrap Up (Agent Populates After Execution)

- **Agent Model Used:** `<Agent Model Name/Version>`
- **Completion Notes:** {Any notes about implementation choices, difficulties, or follow-up needed}
- **Change Log:**
  - Initial Draft 