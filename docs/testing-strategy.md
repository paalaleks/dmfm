# Playlist Chat Rooms: Testing Strategy (MVP)

This document outlines the testing strategy for the "Playlist Chat Rooms" application, focusing primarily on the MVP phase. The strategy will evolve as the application grows in features and complexity.

### 1. Overall Approach (MVP)

For the Minimum Viable Product (MVP), the primary approach to testing will be:

*   **Developer-Led Manual Testing:** As features are developed, the developer(s) will manually test the functionality to ensure it meets the requirements outlined in the PRD (`docs/prd.md`). This includes:
    *   Testing user authentication flows with Spotify.
    *   Verifying real-time chat message sending and receiving.
    *   Checking the display of user avatars and the avatar stack.
    *   Ensuring UI components render correctly and are responsive.
*   **Exploratory Testing:** Developers will perform exploratory testing around new features to identify edge cases or unexpected behaviors not explicitly covered by defined test cases.
*   **Informal User Acceptance Testing (UAT):** Potentially sharing development or preview builds with stakeholders or a small group for feedback and to catch usability issues.
*   **Ad-hoc Collaborative Testing:** For features that are difficult to test single-handedly (e.g., interactions involving multiple concurrent users in a chat room beyond what Supabase Realtime presence can easily simulate for one developer), additional team members or stakeholders may be called upon to assist in manual testing scenarios.

**Rationale for MVP Approach:**
This approach prioritizes rapid development and feedback in the early stages. Manual testing by the developer is often the quickest way to get initial validation of core functionality.

### 2. Future Considerations (Post-MVP / As Complexity Grows)

As the application matures, or if specific areas prove to be error-prone or critical, the following testing methodologies and tools may be introduced:

*   **Unit Testing:**
    *   **Purpose:** To test individual functions, components, or modules in isolation.
    *   **Scope:** Utility functions (`lib/`), helper functions, individual React components (especially those with complex logic), Server Actions (testing their logic without actual DB/API calls, using mocks).
    *   **Tools:** [Jest](https://jestjs.io/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for components.
*   **Integration Testing:**
    *   **Purpose:** To test the interaction between different parts of the application (e.g., component interaction with a Server Action that then calls Supabase).
    *   **Scope:** Testing Server Actions with a test Supabase instance, interactions between client-side components and context, client-side interactions with mocked Spotify SDK responses.
    *   **Tools:** Jest, React Testing Library, potentially MSW (Mock Service Worker) for mocking API calls. Supabase provides guidance on testing with their tools.
*   **End-to-End (E2E) Testing:**
    *   **Purpose:** To test complete user flows through the application's UI, simulating real user scenarios.
    *   **Scope:** Critical user paths like Spotify login, sending and receiving chat messages, (future) controlling Spotify player.
    *   **Tools:** [Playwright](https://playwright.dev/) or [Cypress](https://www.cypress.io/).
*   **Database Testing (for Supabase):**
    *   **Purpose:** To test RLS policies, database functions, and triggers.
    *   **Tools:** [pgTAP](https://pgtap.org/) (a unit testing framework for PostgreSQL) can be used with Supabase. Supabase also provides local development tools that can aid in testing schema changes and policies.

### 3. Test Environment

*   **Local Development:** Developers will test against their local Next.js development server and a local or development Supabase instance.
*   **Preview Deployments (Vercel):** Preview deployments for each pull request can be used for manual testing and UAT in a cloud environment.
*   **Production:** Limited smoke testing post-deployment to ensure critical paths are functional.

### 4. Quality Assurance Focus Areas (Manual Testing for MVP)

*   **Authentication:** Successful login/logout with Spotify, correct user profile data (avatar, username) display.
*   **Chat Functionality:** Sending/receiving messages in real-time, message content integrity, display of sender's avatar.
*   **User Presence:** Real-time avatar stack updates correctly as users join/leave (simulated).
*   **UI/UX:** Basic usability, responsiveness across different screen sizes (as per Tailwind CSS), and adherence to Shadcn UI component behavior.
*   **Error Handling:** Graceful display of errors for common issues (e.g., failed message send, auth errors).

### 5. Defect Management

*   Issues found during testing will be tracked (e.g., using GitHub Issues).
*   Prioritization of bug fixes will be based on severity and impact on core functionality.

### 6. Testing Specific Features

#### 6.1 Spotify Token Refresh (Development Only)

To facilitate efficient testing of the Spotify token refresh logic and its impact on the application, development-only tools have been implemented. These tools allow simulating or forcing token expiry events without waiting for the standard one-hour expiry period.

**Important:** These mechanisms are strictly for development and debugging purposes and are not active in production builds.

**Mechanisms:**

1.  **Shortened Token Lifetime (Environment Variable):**
    *   **How to use:** Set the `NEXT_PUBLIC_DEV_TOKEN_LIFETIME_SECONDS` environment variable in your local `.env.local` file.
        ```env
        NEXT_PUBLIC_DEV_TOKEN_LIFETIME_SECONDS=120 # Example: Token expires in 2 minutes
        ```
    *   **Effect:** When the application initializes or a new token is fetched in development mode, if this variable is set to a positive number, the token's effective lifetime will be overridden to this value. The proactive refresh logic in `music-context/user-session.ts` will then attempt to refresh the token based on this shortened lifetime (typically a few minutes before it's set to expire).
    *   **Observation:** Check the browser console for logs from `[user-session.ts]` indicating the use of the dev token lifetime and the scheduling of the refresh.
    *   **Caution:** Setting this value too low (e.g., less than 60 seconds) can lead to very frequent refresh attempts. While the system has safeguards against concurrent refreshes, this can still generate significant log noise and is not recommended for typical testing.

2.  **Force Token Expiry (Browser Console Function):**
    *   **How to use:** Open your browser's developer console and execute the following global function:
        ```javascript
        window._dev_forceExpireTokenNow();
        ```
    *   **Effect:** This function (available only in development builds) will instruct `music-context/user-session.ts` to immediately mark the current Spotify token as if it has just expired. This should trigger the proactive refresh logic to attempt a new token fetch from Spotify.
    *   **Observation:** The console will log messages from `[dev-debug-tools.ts]` indicating the function call and its outcome. Subsequently, you should observe logs from `[user-session.ts]` related to the refresh attempt (e.g., "Attempting to refresh Spotify token...", "Scheduling token refresh...") and logs from `[MusicContext.tsx]` showing the new token being propagated (e.g., in `getOAuthToken` or `tokenRef.current` updates).
    *   **Rate Limiting & Caution:**
        *   This function has an internal cooldown period (currently 30 seconds) to prevent accidental spamming of the Spotify API.
        *   If called during the cooldown, a warning will be logged to the console, and the action will be skipped.
        *   **It is crucial not to abuse this function.** While safeguards are in place, excessively forcing refreshes could still contribute to hitting Spotify API rate limits if done persistently. Use it judiciously when you specifically need to test an on-demand refresh scenario.

**What to Verify (as per Story 7.6 ACs):**

When using these tools, observe and verify:
*   Background refresh initiation and successful completion (console logs).
*   Player stability and uninterrupted playback during a token refresh cycle (if applicable).
*   Correct and timely updating of token references (`tokenRef.current` in `MusicContext`, internal state in `user-session.ts`).
*   The `Spotify.Player` instance receiving the new token via its `getOAuthToken` callback.
*   Correct behavior of any queued or deferred API calls (Story 7.2).
*   Successful execution of player actions and API calls with the new token immediately post-refresh.

By using these development tools, you can more reliably and efficiently test the robustness of the token refresh mechanism and its integration with other parts of the application.

---

## Change Log

| Change        | Date       | Version | Description                                     | Author         |
| ------------- | ---------- | ------- | ----------------------------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Reflects MVP manual testing approach, outlines future considerations. | Architect Agent | 