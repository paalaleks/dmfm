# Epic 7: Robust Spotify SDK Integration and Error Handling

**Goal:** To significantly improve the resilience and reliability of the Spotify Web Playback SDK integration within the application. This involves implementing robust error handling, proactive connection management, and refined authentication recovery mechanisms to ensure a seamless user experience, especially after events like system sleep, network interruptions, or token expiry.

**Background:** Users have reported "Authentication failed" errors with the Spotify player, particularly when resuming the application after the computer has been asleep. This indicates a need for a more sophisticated approach to managing the SDK's lifecycle, token validity, and error states.

**Primary Reference:** `docs/architecture.md` (Section 6: Spotify SDK Integration: Resilience and Error Handling)

## Stories / Key Features:

### Story 7.1: Enhance Spotify Token Management for Resilience

*   **Goal:** Ensure the application's Spotify token fetching mechanism (`getSpotifyAccessToken` or equivalent) can reliably refresh expired tokens and clearly communicate its success or failure.
*   **Acceptance Criteria:**
    *   The token management function attempts to refresh an expired Spotify token.
    *   A new, valid token is provided to the SDK upon successful refresh.
    *   A clear error status or null is returned if token fetch/refresh fails.
    *   The Spotify SDK's `getOAuthToken` callback correctly utilizes the token or handles the failure state from the token management function.
*   **Tasks:**
    1.  Modify token acquisition logic to include refresh capabilities for Spotify access tokens.
    2.  Ensure return values clearly distinguish between success (with token) and failure.
    3.  Update integration points with the Spotify SDK to handle these return states.

### Story 7.2: Implement Robust SDK `authentication_error` Handling

*   **Goal:** Develop a reliable recovery process when the Spotify SDK explicitly reports an `authentication_error`.
*   **Acceptance Criteria:**
    *   An `authentication_error` event from the Spotify SDK is caught and processed.
    *   The application's internal state (e.g., `auth_error`, `isReady=false`, `isActive=false`) is correctly updated.
    *   The existing Spotify player instance is cleanly disconnected.
    *   A re-connection attempt (including re-initialization and token acquisition) is automatically initiated.
    *   The authentication error event and recovery attempt are logged.
*   **Tasks:**
    1.  Implement or enhance the `authentication_error` event listener for the Spotify Player.
    2.  Define and manage application states related to authentication errors.
    3.  Develop a sequence for disconnecting, re-initializing, and re-connecting the player.
    4.  Add logging for these events.

### Story 7.3: Develop Proactive Connection Health Checks for Spotify SDK

*   **Goal:** Proactively attempt to re-establish or verify the Spotify SDK connection when the application becomes active after a period of inactivity (e.g., system wake-up, tab becoming visible) or on network status changes.
*   **Acceptance Criteria:**
    *   When the application tab becomes visible after being hidden, if the Spotify player was previously disconnected or in an error state, a connection/re-connection attempt is made.
    *   (Optional) When the browser detects a transition from offline to online, a Spotify connection check/attempt is initiated.
    *   The main `connect()` function for the player is idempotent and handles these proactive calls gracefully.
*   **Tasks:**
    1.  Utilize the browser's Page Visibility API (`visibilitychange` event) to trigger connection checks.
    2.  (Optional) Implement listeners for browser `online`/`offline` events.
    3.  Ensure the player's `connect()` method can be safely called in these scenarios.

### Story 7.4: Refine Spotify Player `connect()` Function for Idempotency and Error Recovery

*   **Goal:** Ensure the primary function responsible for connecting the Spotify player is robust, can be called multiple times without adverse effects, and can intelligently recover from known error states.
*   **Acceptance Criteria:**
    *   Calling `connect()` when the player is already connected or connecting does not cause errors or duplicate processes.
    *   Calling `connect()` when a known `auth_error` state is present initiates a full and clean re-connection attempt (potentially including player re-instantiation).
    *   The function handles transitions gracefully, preventing race conditions.
*   **Tasks:**
    1.  Review and refactor the player's `connect()` method.
    2.  Implement state checks (e.g., `isConnecting`, `hasAuthError`) to manage behavior.
    3.  Consider if full player re-instantiation is necessary after certain errors versus a simple `disconnect()` and `connect()`.

### Story 7.5: Comprehensive Testing of Spotify SDK Resilience

*   **Goal:** Thoroughly validate that the implemented resilience mechanisms function as expected across various common and edge-case scenarios.
*   **Acceptance Criteria:**
    *   The application gracefully recovers Spotify player functionality after the system wakes from sleep, without requiring manual user re-authentication for Spotify.
    *   Expired Spotify access tokens are automatically refreshed by the system, allowing playback to continue or resume.
    *   Simulated or induced `authentication_error` events trigger the defined recovery flow, and the player becomes operational again.
    *   Hiding and then showing the application tab correctly re-validates/re-establishes player connectivity if needed.
    *   (If implemented) Disconnecting and then reconnecting the network triggers appropriate player connection checks.
    *   Player state (e.g., `isReady`, `isActive`, `currentTrack`, `error`) is accurately reported throughout these test scenarios.
*   **Tasks:**
    1.  Develop test cases for wake-from-sleep.
    2.  Test token expiry and refresh scenarios (may require manual token manipulation or a mock server during development).
    3.  Simulate `authentication_error` conditions.
    4.  Test tab visibility changes.
    5.  Test network connectivity changes.
    6.  Perform end-to-end testing of the player experience under these conditions.

**Dependencies:**
*   Access to Spotify Developer credentials for testing token refresh and SDK interactions.
*   Understanding of the existing Spotify SDK integration (`useSpotifySDK.ts` or similar).

**Risks:**
*   Complexity of Spotify SDK behavior and token lifecycle.
*   Potential for race conditions if state management is not handled carefully.
*   Variations in browser behavior regarding sleep modes and network events. 