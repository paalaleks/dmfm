# Epic 3: Spotify Player and Music Interaction

**Status:** Draft

## Goal

Integrate the Spotify Web Playback SDK to allow users to control Spotify playback asynchronously within the application, playing playlists suggested based on taste profiles (from Epic 2), and interact with Spotify content (save track, follow playlist).

## Associated Functional Requirements

*   **FR7:** The system must integrate with the Spotify Web API and Web Playback SDK.
*   **FR8:** Users must be able to control Spotify playback (play, pause, skip, volume, shuffle) via an in-app player UI.
*   **FR9:** The player UI must display current track image, song name, artist name, and playlist name.
*   **FR10:** Users must be able to navigate to the previous/next song in the current playlist.
*   **FR11:** Users must be able to navigate to the previous/next playlist from a curated or suggested list (based on taste profiles from Epic 2).
*   **FR12:** Users must be able to save the currently playing track to their Spotify library.
*   **FR13:** Users must be able to follow the currently playing playlist on Spotify.
*   **FR14:** The system must handle Spotify token refresh mechanisms. 
*   **FR15:** The system must handle Spotify track relinking.
*   (Relies on output from Epic 2): The playlists available for navigation (FR11) should be sourced from the pool of taste-matched playlists discovered in Epic 2.

## Stories

*   **Story 3.1: Setup Spotify Web Playback SDK and Music Context**
    *   *Goal:* Initialize the Spotify Web Playback SDK when a user is authenticated and create a global React context (`MusicContext`) to manage the player state, providing the foundation for player UI and controls.
    *   *Status:* Draft
*   **(Future Stories - Examples):**
    *   Story 3.2: Implement Basic Player UI (Display track info, play/pause)
    *   Story 3.3: Implement Player Controls (Next/Previous Track, Volume, Shuffle)
    *   Story 3.4: Implement Playlist Navigation (Next/Previous Taste-Matched Playlist)
    *   Story 3.5: Implement Save Track/Follow Playlist Functionality

*(Note: Story breakdown beyond 3.1 is preliminary and will be refined.)* 