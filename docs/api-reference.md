# Playlist Chat Rooms: API Reference (MVP & Future)

This document provides a reference for the server-side APIs and actions available in the Playlist Chat Rooms application. For the MVP, these are primarily Next.js Server Actions. For future phases, client-side interactions with the Spotify Web API will also be significant.

### 1. Overview of Internal APIs (Server Actions)

Server Actions are used to handle mutations (data creation, updates, deletions) and some data fetching initiated from the client, providing a streamlined way to interact with the backend (Supabase) directly from React components. All Server Actions are defined in TypeScript and enforce type safety for their inputs and outputs.

**Location of Server Actions:**
As per `docs/project-structure.md`, Server Actions will be co-located within the `app/` directory (e.g., `app/_actions/chat-actions.ts`) or in a dedicated `lib/actions/` directory.

**Common Return Type Structure for Server Actions:**
Most Server Actions will adhere to a common return structure to indicate success or failure:

```typescript
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; errorCode?: string };
```

*   `success: boolean`: Indicates if the operation was successful.
*   `data: T`: The data returned on success (type `T` will vary per action). For actions that don't return data (e.g., a simple create), `T` might be `void` or a simple confirmation like `{ id: string }`.
*   `error: string`: A user-friendly error message if `success` is `false`.
*   `errorCode?: string`: (Optional) A machine-readable error code for specific error handling if needed.

**Authentication for Server Actions:**
All Server Actions that perform sensitive operations or require user context (e.g., sending a message) must verify that the user is authenticated by calling `await supabase.auth.getUser()` using the server Supabase client. Unauthorized attempts should return an appropriate error.

---

### 2. Chat Actions (MVP)

File: `app/_actions/chat-actions.ts` (or `lib/actions/chat-actions.ts`)

#### 2.1. `sendMessage`

*   **Description:** Creates a new message record in the `chat_messages` table associated with the authenticated user and the given room ID.
*   **Permissions:** Requires an authenticated user. The user must have a profile.
*   **Inputs:**
    *   `formData: FormData` (if called directly from a form) or an object payload:
        *   `roomId: string` (UUID) - The ID of the chat room to send the message to.
        *   `content: string` - The text content of the message.
*   **Input Validation (Zod Schema):**
    ```typescript
    // Example Zod schema (to be defined in the action file)
    // const SendMessageSchema = z.object({
    //   roomId: z.string().uuid(),
    //   content: z.string().min(1).max(5000), // As per DB constraint
    // });
    ```
*   **Returns:** `Promise<ActionResult<{ messageId: number }>>`
    *   On success: `{ success: true, data: { messageId: <ID of new message> } }`
    *   On failure: `{ success: false, error: "Error message" }`
*   **Side Effects:**
    *   Inserts a new row into the `public.chat_messages` table.
    *   This will trigger a Supabase Realtime event, broadcasting the new message to subscribed clients.
*   **Usage Example (Client Component):**
    ```typescript
    // async function handleSubmit(formData: FormData) {
    //   const result = await sendMessage(formData);
    //   if (!result.success) {
    //     // Handle error
    //     console.error(result.error);
    //   } else {
    //     // Message sent (optimistic update might have already handled UI)
    //     console.log("Message sent, ID:", result.data.messageId);
    //   }
    // }
    ```

#### 2.2. `editMessage`

*   **Description:** Edits the content of an existing message in the `chat_messages` table. The user must be the original sender of the message.
*   **Permissions:** Requires an authenticated user. User must be the owner of the message.
*   **Inputs:**
    *   `messageId: number` - The ID of the message to edit.
    *   `newContent: string` - The new text content for the message.
*   **Input Validation (Zod Schema Example):**
    ```typescript
    // const EditMessageSchema = z.object({
    //   messageId: z.number().int().positive(),
    //   newContent: z.string().min(1).max(5000),
    // });
    ```
*   **Returns:** `Promise<ActionResult<{ messageId: number }>>`
    *   On success: `{ success: true, data: { messageId: <ID of edited message> } }`
    *   On failure: `{ success: false, error: "Error message" }`
*   **Side Effects:**
    *   Updates a row in the `public.chat_messages` table.
    *   This will trigger a Supabase Realtime event (UPDATE), broadcasting the edited message to subscribed clients.

#### 2.3. `deleteMessage`

*   **Description:** Deletes a message from the `chat_messages` table. The user must be the original sender of the message.
*   **Permissions:** Requires an authenticated user. User must be the owner of the message.
*   **Inputs:**
    *   `messageId: number` - The ID of the message to delete.
*   **Input Validation (Zod Schema Example):**
    ```typescript
    // const DeleteMessageSchema = z.object({
    //   messageId: z.number().int().positive(),
    // });
    ```
*   **Returns:** `Promise<ActionResult<{ messageId: number }>>`
    *   On success: `{ success: true, data: { messageId: <ID of deleted message> } }`
    *   On failure: `{ success: false, error: "Error message" }`
*   **Side Effects:**
    *   Deletes a row from the `public.chat_messages` table.
    *   This will trigger a Supabase Realtime event (DELETE), broadcasting the deletion to subscribed clients.

---

### 3. Spotify Web API Interactions (Client-Side - Future Phases)

Interactions with the Spotify Web API will primarily occur on the client-side, managed via the `MusicContext` and helper functions in `lib/spotify.ts` (using the `@spotify/web-api-ts-sdk`). These are crucial for player functionality, music discovery, and taste-matching features planned for post-MVP phases.

**Reference:** [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)

**Key Functional Areas & Corresponding API Usage (Illustrative):**

*   **Player Control & Information (PRD: FR7, FR8, FR9, FR10, FR11, FR16):**
    *   **Actions:** Get current playback state, available devices, currently playing track.
    *   **Relevant Spotify API Endpoints (Conceptual - via SDK):** `Player` category (e.g., `Get Playback State`, `Get Currently Playing Track`, `Get Available Devices`).
    *   **Note:** Actual playback control (play, pause, skip) is primarily handled by the Spotify Web Playback SDK, but Web API calls might supplement state or context.

*   **Saving Tracks & Following Playlists (PRD: FR12, FR13):**
    *   **Actions:** Save the currently playing track to the user's Spotify library; follow the currently playing playlist on Spotify.
    *   **Relevant Spotify API Endpoints (Conceptual - via SDK):**
        *   `Tracks` -> `Save Tracks for Current User`
        *   `Users` -> `Follow Playlist`

*   **Fetching User Data & Taste Information (PRD: FR18, FR19, FR20, FR21):**
    *   **Actions:** Fetch user's top artists/tracks; fetch playlist details and tracks; fetch track audio features.
    *   **Relevant Spotify API Endpoints (Conceptual - via SDK):**
        *   `Users` -> `Get User's Top Items`
        *   `Playlists` -> `Get Playlist`, `Get Playlist Items`
        *   `Tracks` -> `Get Several Tracks' Audio Features`

*   **Searching for Content (for @mentions - PRD: FR5, FR6):**
    *   **Actions:** Search for songs, artists, playlists to enable the @mention feature within chat.
    *   **Relevant Spotify API Endpoints (Conceptual - via SDK):** `Search` -> `Search for Item`.

**Note on Client-Side Implementation:**
These Spotify interactions will be encapsulated in functions within `lib/spotify.ts` and exposed through the `MusicContext` to relevant UI components. Error handling, token management (via Supabase session and Spotify SDK helpers), and data transformation will be handled within these client-side modules.

---

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Initial draft for MVP chat actions. | Architect Agent |
| Revision 1    | YYYY-MM-DD | 0.2     | Added section for Spotify Web API Interactions (Client-Side) for future phases. | Architect Agent | 