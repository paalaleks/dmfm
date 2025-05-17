# Epic 12: Enhanced Playlist Shuffling

**Goal:** To provide users with a more robust and truly random playlist shuffling experience by implementing a custom shuffling mechanism, addressing limitations and perceived non-randomness of Spotify's native shuffle.

**Context:** Users have reported that Spotify's native shuffle often starts from similar positions or follows predictable patterns. This epic aims to deliver a superior shuffle feature that fetches all playable tracks from a playlist, shuffles them locally, and then plays this custom-ordered queue. This epic will also incorporate track relinking logic (similar to Story 3.6) to maximize track availability.

**Business Value:**
*   Improves user satisfaction by providing a shuffle feature that meets expectations of randomness.
*   Increases playback reliability by intelligently handling unplayable/relinked tracks.
*   Differentiates the application with a premium playback feature.

**Scope:**
*   Fetching all tracks from a selected Spotify playlist, including handling pagination.
*   Identifying playable tracks, considering `is_playable` flags, market restrictions, and utilizing Spotify's track relinking (`linked_from`) to find alternatives for unplayable tracks.
*   Implementing a true random shuffling algorithm (e.g., Fisher-Yates) for the list of playable track URIs.
*   Initiating playback of this custom-shuffled queue on Spotify.
*   Ensuring Spotify's native shuffle is disabled when the custom shuffle is active.
*   Providing a user interface option to activate the custom shuffle for playlists.

**Functional Requirements (FRs):**

*   **FR12.1:** The system must be able to fetch all track items from a given Spotify playlist ID, handling API pagination to retrieve the complete list.
*   **FR12.2:** For each track item fetched, the system must determine its playability in the user's market. This includes:
    *   Checking the `is_playable` attribute of the track.
    *   If a track is not `is_playable` or has market restrictions, checking its `linked_from.id` attribute.
    *   If `linked_from.id` exists, fetching the relinked track and assessing its playability.
    *   Filtering out any tracks that are ultimately unplayable (e.g., local files, or no playable version found after relinking).
*   **FR12.3:** The system must implement a client-side or server-side random shuffling algorithm (e.g., Fisher-Yates) that can take a list of Spotify track URIs and return a new, randomly ordered list of these URIs.
*   **FR12.4:** The system must be able to command the Spotify player to play a specific, ordered list of track URIs (the custom shuffled queue).
*   **FR12.5:** When initiating playback with the custom shuffle, the system must ensure that Spotify's native shuffle mode is turned OFF for the active device.
*   **FR12.6:** The user interface must provide a clear option (e.g., a button or toggle) for users to choose to play a playlist using the custom shuffle mechanism instead of Spotify's default playback.
*   **FR12.7:** The system should provide feedback to the user if a playlist cannot be custom shuffled (e.g., playlist is empty after filtering unplayable tracks).

**Stories:**
*   **Story 12.1: Implement Core Custom Shuffle Logic and API Integration**
*   Story 12.2: Integrate Custom Shuffle Option into Playlist UI
*   Story 12.3: User Feedback for Custom Shuffle Operations (e.g., loading, errors) 