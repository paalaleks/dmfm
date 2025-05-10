# Epic 4: Enhanced Chat Experience (@mentions)

**Status:** Draft

## Goal

Enrich chat with @mention capabilities for songs, artists, and playlists, and define asynchronous music listening behavior.

## Associated Functional Requirements

*   **FR5:** Users should be able to @mention songs, artists, or playlists in messages.
*   **FR6:** @mentions should display as rich UI cards (song image, artist image, playlist image).
*   **FR16:** Users in a chat room listen to music asynchronously (i.e., their playback is independent of others).

## Stories

*   **Story 4.1: Configure @mention Trigger and Search Interface in Chat Input**
    *   *Goal:* Enable users to initiate an @mention by typing "@" in the `shadcn-editor`, triggering a search UI for Spotify content.
    *   *Details:*
        *   Configure `shadcn-editor` to detect the "@" trigger.
        *   Implement a (debounced) client-side search call to the Spotify API for tracks, artists, and playlists based on user input after "@".
        *   Design and implement a dropdown/modal UI to display selectable search results (showing item name, type, and small image).
        *   Ensure the selected item is correctly inserted into the `shadcn-editor` (e.g., as a special node or data object that the editor understands).
    *   *Acceptance Criteria:* Typing "@" followed by text initiates a search. Relevant results from Spotify are displayed. User can select an item. Selected item appears in the chat input.

*   **Story 4.2: Implement Rich Card Rendering for Displayed @mentions**
    *   *Goal:* Visually represent @mentioned Spotify items as informative and styled cards within the chat message display area (not just the editor).
    *   *Details:*
        *   When a message containing an @mention is displayed, it should render as a card.
        *   The card should display the item's image (track album art, artist photo, playlist cover), name, type (Song/Artist/Playlist), and potentially a direct link to the item on Spotify.
        *   Ensure consistent styling for these cards.
    *   *Acceptance Criteria:* @mentioned items in sent/received messages render as distinct cards. Cards show correct image, name, type. Link to Spotify (if implemented) works.

*   **Story 4.3: Persist and Retrieve @mention Data in Chat Messages**
    *   *Goal:* Ensure that @mention information is saved to the `chat_messages` table and can be accurately reconstructed when messages are loaded.
    *   *Details:*
        *   Determine how `shadcn-editor` outputs mention data (e.g., structured JSON within the content, or if it requires separate metadata).
        *   Adapt the `sendMessage` Server Action to store this mention data appropriately in the `chat_messages` table (e.g., in the `content` field if it's part of the editor's output, or potentially a new `mentions` JSONB column if the data is complex and needs to be queryable separately).
        *   Ensure RLS policies allow saving and retrieving this data.
    *   *Acceptance Criteria:* Messages containing @mentions are saved to the database. When messages are fetched, the @mention data is available and allows for correct card rendering.

*   **Story 4.4: Verify and Document Asynchronous Playback Behavior (FR16)**
    *   *Goal:* Confirm that the Spotify player, as implemented in Epic 3, operates entirely asynchronously for each user, regardless of their presence in a chat room or interaction with other users, aligning with FR16.
    *   *Details:*
        *   This involves testing scenarios with multiple simulated or actual users in the same chat room.
        *   Verify that one user's playback actions (play, pause, skip, volume, track selection, playlist selection) have no impact on any other user's playback.
        *   Document this individual playback control as a key aspect of the user experience.
    *   *Acceptance Criteria:* Clear evidence and documentation show that individual users have full, independent control over their Spotify playback within the app, and this is not affected by other users in the same "room" or context.

*   **(Optional Future Story): Story 4.5: Handle Edge Cases for @mentions**
    *   *Goal:* Address potential issues like an @mentioned Spotify item no longer being available.
    *   *Details:* Decide on fallback rendering for cards if a Spotify URI becomes invalid or the item is removed from Spotify (e.g., show a "Content unavailable" message in the card).
    *   *Acceptance Criteria:* The application handles broken/invalid @mentions gracefully. 