# Story 1.4: Develop Core Chat UI & Functionality

**ID:** `epic1.story1.4`
**Parent Epic:** [Epic 1: Core User Authentication & Chat Setup](./epic-1-core-auth-chat-setup.epic.md)
**Status:** Done

## Goal

Implement the main chat interface allowing authenticated users to send and receive messages in real-time within the default chat room, see their own and others' avatars, and view a list of currently active users in the room.

## Requirements

1.  An authenticated user can access the main chat page.
2.  The chat page displays an input area for sending messages.
3.  The chat page displays a list of messages for the default chat room.
4.  New messages sent by the user appear optimistically in the message list.
5.  New messages sent by other users appear in real-time.
6.  The sender's avatar (from `public.profiles`) is displayed next to each message.
7.  A visual component (avatar stack) displays the avatars of users currently present in the chat room in real-time.

## Technical Tasks

- [x] **TSC-1:** Create Root Layout with Global Providers. (*Ensure `app/layout.tsx` is set up, including necessary providers like a placeholder `MusicContext`.*)
- [x] **TSC-3:** Implement Chat Page UI Shell. (*Create `app/(main)/chat/page.tsx`. Integrate the existing and adapted `RealtimeChat` component. Pass necessary props like initial messages, room name, username.*)
- [x] **TSB-2:** Implement `sendMessage` Server Action. (*This is a key remaining task for persisting messages. The existing `RealtimeChat` component's `useRealtimeChat` hook sends messages via Supabase broadcast; this action will handle DB persistence.*)
    - [x] Define the action in `app/_actions/chat-actions.ts` (or `lib/actions/`).
    - [x] Include input validation using Zod for `roomId` and `content`.
    - [x] Perform authentication check to ensure only logged-in users can send messages.
    - [x] Insert the message into `public.chat_messages` using the Supabase server client.
    - [x] Return an `ActionResult` indicating success/failure.
- [x] **TSC-4:** Verify and Adapt `RealtimeChat` Input Functionality. (*The core input UI/logic exists within `realtime-chat.tsx` and has been type-aligned. Focus is on integration and ensuring it correctly triggers the `sendMessage` Server Action (TSB-2) for persistence, while maintaining optimistic updates via Supabase broadcast.*)
    - [x] Confirm the input form within `realtime-chat.tsx` calls the `sendMessage` function from `useRealtimeChat`.
    - [x] Ensure `useRealtimeChat`'s `sendMessage` correctly handles optimistic UI updates via Supabase broadcast (as it currently does) AND that the flow for calling the *new* `sendMessage` Server Action (TSB-2) for persistence is added/triggered.
    - [x] Ensure loading/disabled states are handled appropriately if/when calling a Server Action directly (though primary send might remain client-side broadcast with server-side persistence as a secondary step).
- [x] **TSC-5:** Verify and Adapt `RealtimeChat` Message List Functionality. (*The core message display and realtime subscription logic exists within `realtime-chat.tsx` and `chat-message.tsx` and has been type-aligned. Focus is on integration and data flow.*)
    - [x] Verify `realtime-chat.tsx` fetches/receives initial messages correctly (e.g., passed as props from the parent Server Component in TSC-3).
    - [x] Confirm Supabase Realtime subscription in `useRealtimeChat` (used by `realtime-chat.tsx`) correctly receives new messages broadcast by clients.
    - [x] Confirm optimistic update logic within `useRealtimeChat` works as expected after type changes.
    - [x] Ensure `chat-message.tsx` correctly displays sender's avatar and username (using the `profile` field of the `ChatMessage` type).
- [x] Implement Real-time Avatar Stack display.
    *   [x] Ensure `app/(main)/chat/components/realtime-avatar-stack.tsx` (from TSC-6) is integrated into the chat page UI (TSC-3).
    *   [x] Verify it subscribes to Supabase Realtime presence for the default chat room channel.
    *   [x] Verify it displays avatars of present users correctly.

## Acceptance Criteria

*   Authenticated users navigating to the designated chat route (e.g., `/chat`) see the chat interface.
*   The chat interface includes an input field and send button, a message display area, and an avatar stack.
*   Users can type a message and click send.
*   The sent message appears immediately (optimistically) in the message list, styled appropriately (e.g., different background for own messages).
*   The message is successfully persisted in the `chat_messages` table in Supabase.
*   Other users connected to the same room see the new message appear in real-time without needing to refresh.
*   Each message displays the sender's avatar (fetched from `profiles`) and username.
*   The avatar stack correctly reflects users joining and leaving the chat room in real-time.
*   Error handling is present for failed message sends.

## Technical Context & References

*   `docs/prd.md` (FR2, FR3, FR3.1, FR4)
*   `docs/architecture.md` (Chat Flow, Real-time)
*   `docs/frontend-architecture.md` (Component Structure, Real-time, Optimistic Updates)
*   `docs/data-models.md` (`chat_messages`, `profiles`, `chat_rooms` schema)
*   `docs/api-reference.md` (`sendMessage` Server Action)
*   `docs/coding-standards.md` (Component Naming, Error Handling)
*   `lib/supabase/client.ts` (for Realtime subscriptions)
*   `lib/supabase/server.ts` (for `sendMessage` Server Action)
*   `types/database.ts` (for typed database interactions)
*   Supabase Realtime Documentation: [Realtime Subscriptions](https://supabase.com/docs/guides/realtime/subscriptions), [Presence](https://supabase.com/docs/guides/realtime/presence)
*   Existing Components: `components/chat-message.tsx`, `components/realtime-chat.tsx` (These have been provided and type-adapted).
*   Avatar/Presence Components: `components/custom/current-user-avatar.tsx`, `components/custom/realtime-avatar-stack.tsx`

## Notes for Developer Agent

*   **Existing Components & Adaptation:** The `components/chat-message.tsx` and `components/realtime-chat.tsx` components, along with the `hooks/use-realtime-chat.tsx` hook, provide a strong foundation for the chat UI. These have been **adapted to align with the `types/database.ts` (ChatMessage, MessageSenderProfile)**.
*   **Focus Areas:**
    *   Integrating these existing and adapted components into the main chat page (`app/(main)/chat/page.tsx` - Task TSC-3).
    *   Implementing the **`sendMessage` Server Action (TSB-2)** for persistent storage of messages.
    *   **Verifying and potentially adapting** the `useRealtimeChat` hook's `sendMessage` function. It currently handles optimistic client-side broadcast. A strategy is needed to ALSO trigger the `sendMessage` Server Action (TSB-2) to persist the message to the database. Consider if the client broadcast is sufficient for real-time feel and persistence happens in the background, or if the Server Action should also return the persisted message for consistency.
    *   Efficiently fetching/managing profile data (usernames, avatars) needed for `chat-message.tsx`. The optimistic messages in `useRealtimeChat` currently set `profile: null`. This will need to be populated eventually, either by the server action response or a subsequent fetch/join when messages are loaded.
    *   Integrating and verifying the `realtime-avatar-stack.tsx` component.
*   Fetching initial messages efficiently and joining profile data (avatars/usernames) needs careful consideration. Should the initial fetch be done in the parent Server Component (TSC-3)? How are profiles fetched/managed for subsequent messages or existing messages?
*   Ensure Supabase Realtime is enabled for `chat_messages` and `profiles` tables in the Supabase Dashboard.
*   The current `useRealtimeChat` sends the entire `ChatMessage` object (including the client-generated UUID) via broadcast. When the `sendMessage` Server Action persists this, it will get a new database ID. This difference in IDs for optimistic vs. persisted messages is handled by the `ChatMessage.id` type (`string | number`).