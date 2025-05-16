# Epic 12: Enhanced Playlist Shuffle - "Random First Song"

**Status:** Draft

**Goal:** To allow users to influence the first song played when a Spotify playlist is shuffled, by providing a mechanism to designate a specific track from the currently playing taste-matched playlist to appear first after the shuffle operation, enhancing user control over their listening experience.

**Context/Why:** Users often have a favorite song on a playlist or a song that sets a particular mood they want to start with, even when shuffling. Standard Spotify shuffle doesn't directly allow for "seeding" the shuffle with a specific first track. This feature provides a way to modify the playlist's fundamental order so that the desired track becomes position 0, thus making it the most likely candidate to play first when shuffle is engaged. This is particularly relevant for taste-matched playlists from other users that are played via the application's integrated Spotify player.

## Associated Functional Requirements

*   **FR12.1:** The system must provide a UI option for the user to select a track from the *currently playing taste-matched playlist* to be designated as the "next first song" if the playlist is re-shuffled or playback is restarted with shuffle active.
*   **FR12.2:** When a track is designated as the "next first song," the system must use the Spotify API to reorder the underlying Spotify playlist so that the selected track is moved to position 0 of the playlist's original (non-shuffled) order.
*   **FR12.3:** The system must obtain the necessary `snapshot_id` for the playlist before attempting reordering and use it in the API request.
*   **FR12.4:** After successfully reordering the playlist, the system should attempt to refresh the shuffle state on the active Spotify player (e.g., by toggling shuffle off and then on for the current device via the Spotify API) to help the change take effect for the current listening session.
*   **FR12.5:** The UI for selecting the "next first song" should be easily accessible, for example, from the player controls or alongside the current track's information.
*   **FR12.6:** The system must provide clear feedback to the user (e.g., a toast notification) confirming that the action to set the "next first song" has been initiated and whether it was successful.
*   **FR12.7:** This feature should operate on the Spotify playlists that are part of the application's taste-matching and playback ecosystem (as per Epic 2 and Epic 3). This implies the application has the necessary permissions (OAuth scopes: `playlist-modify-public` and/or `playlist-modify-private`) to modify these playlists.

## Stories

*   **Story 12.1: UI for Designating "Next First Song"**
    *   *Goal:* Implement the user interface element (e.g., a context menu item on the current track, an icon button within player controls) that allows a user to mark a track from the current taste-matched playlist as the desired "next first song."
    *   *Acceptance Criteria:*
        *   A clear and intuitive UI affordance exists to trigger the "set as next first song" action for a track within the currently playing taste-matched playlist.
        *   The UI is accessible from the main player interface.
        *   The action passes the relevant `playlist_id` and `track_spotify_id` (or its current index in the playlist) to the backend logic.

*   **Story 12.2: Server Action for Playlist Reordering**
    *   *Goal:* Implement a Server Action (e.g., in TypeScript) that receives a `playlist_id` and information to identify the target track (e.g., `track_spotify_id` or `current_index`), then uses the `@spotify/web-api-ts-sdk` to:
        1.  Fetch the playlist's current `snapshot_id` (if not already available or to ensure freshness).
        2.  Determine the `range_start` (current index of the target track).
        3.  Call the Spotify API method for reordering playlist items (e.g., `sdk.playlists.reorderItems()`) with `range_start`, `insert_before: 0`, `range_length: 1`, and the `snapshot_id`.
    *   *Acceptance Criteria:*
        *   The Server Action correctly interacts with the `@spotify/web-api-ts-sdk` to reorder the specified track to the beginning of the target Spotify playlist.
        *   It handles Spotify API errors gracefully and returns appropriate status/error messages.
        *   It ensures the required `playlist-modify-public` or `playlist-modify-private` scopes are implicitly handled by the SDK's authenticated instance.
        *   The action logs relevant information for debugging.

*   **Story 12.3: Player Integration and Shuffle State Refresh**
    *   *Goal:* Connect the "designate first song" UI to the Server Action. After a successful playlist reordering, trigger a refresh of the Spotify player's shuffle state for the active device.
    *   *Details:* This involves calling the Server Action and, upon its success, using the Spotify SDK (or another Server Action) to set shuffle to `false` and then back to `true` for the current playback device, aiming to make the new playlist order effective for subsequent shuffled play.
    *   *Acceptance Criteria:*
        *   The UI action correctly calls the reordering Server Action.
        *   Upon successful reordering, the system attempts to toggle the shuffle state (off then on) for the user's active Spotify device.
        *   The user receives a toast notification indicating success or failure of the overall operation (e.g., "Song X will now be the first song on shuffle.").

*   **Story 12.4: State Management and User Feedback**
    *   *Goal:* Manage any UI state related to this feature (e.g., loading indicators while the API calls are in progress) and ensure robust user feedback.
    *   *Acceptance Criteria:*
        *   The UI provides visual feedback (e.g., loading spinner on the button) when the reordering process is active.
        *   Comprehensive toast notifications are displayed for success and various error conditions (e.g., API error, permission error).

## Dependencies

*   **Epic 2 (Playlist Management and Taste Profiling):** The feature operates on taste-matched playlists from the app's ecosystem.
*   **Epic 3 (Spotify Player and Music Interaction):** Relies on the integrated Spotify player, `MusicContext`, and methods to interact with player state (like current device ID for shuffle toggle).
*   `@spotify/web-api-ts-sdk`: Essential for all Spotify API communications.
*   Supabase (Backend): Server Actions will be Supabase Edge Functions or similar, interacting with the Spotify SDK.

## Technical Implementation Notes

*   The core Spotify API endpoint is `PUT /v1/playlists/{playlist_id}/tracks`. The `@spotify/web-api-ts-sdk` will provide a method like `playlists.reorderItems()`.
*   **Permissions:** The application must have `playlist-modify-public` or `playlist-modify-private` scopes for the playlists it intends to modify. This needs to be handled during the Spotify OAuth authentication flow.
*   **Determining Track Index (`range_start`):** If the UI element is tied to a specific track that's not necessarily the *currently playing* one (e.g., selecting from a list of tracks in the playlist), the system will need to fetch the current items of the playlist via `sdk.playlists.getPlaylistItems(playlistId)` to find the `index` of the selected `track_spotify_id` before calling the reorder function. If it's always the *currently playing track*, its context might already be available.
*   **Shuffle Refresh:** Use `sdk.player.setShuffleState(false, { device_id: XYZ })` followed by `sdk.player.setShuffleState(true, { device_id: XYZ })`. The `device_id` can be obtained from the player state.

## Risks & Mitigations

*   **Playlist Ownership/Permissions:** Modifying playlists requires careful handling of permissions.
    *   *Mitigation:* Ensure the feature only operates on playlists the application legitimately controls or has explicit user permission to modify. Clearly define which playlists are eligible.
*   **Impact on Shared Playlists:** If the modified playlist is a common source for multiple users in the app, one user's action affects all.
    *   *Mitigation:* This could be a feature ("collaborative shuffle seeding") or a drawback. Consider if temporary copies for sessions are needed, though this adds complexity and deviates from directly reordering "the" playlist. For now, assume direct modification of the app-managed playlist.
*   **API Rate Limits:** Frequent reordering could hit Spotify rate limits.
    *   *Mitigation:* The UI should not encourage rapid/repeated use. Perhaps temporarily disable the button after a successful operation.
*   **User Expectation vs. Shuffle Reality:** Users must understand this doesn't *guarantee* the song is first every time with shuffle, but rather that it becomes the first track in the playlist's base order, strongly influencing the shuffle outcome.
    *   *Mitigation:* Clear explanatory text in UI (e.g., tooltips, confirmation messages).

## Future Considerations

*   Allowing users to pick any song from the current playlist (not just the currently playing one) to be the "next first song."
*   A "clear designated first song" option that perhaps reverts the playlist to a previous known order or shuffles it randomly again without a specific seed. 