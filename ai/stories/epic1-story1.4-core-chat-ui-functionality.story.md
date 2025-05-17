# Story 1.4: Develop Core Chat UI & Functionality

**ID:** `epic1.story1.4`
**Parent Epic:** [Epic 1: Core User Authentication & Chat Setup](./epic-1-core-auth-chat-setup.epic.md)
**Status:** Review

## Goal

Implement the main chat interface allowing authenticated users to send and receive messages in real-time within a specific chat room (initially the default chat room), see their own and others' avatars, and view a list of currently active users in the room. The chat page will be accessible via a dynamic route like `/chat/[chatId]`.

## Requirements

1.  An authenticated user can access the main chat page by navigating to `/chat/[chatId]`, where `[chatId]` is the ID of an existing chat room. For this story, this will be the ID of the default chat room.
2.  The chat page displays an input area for sending messages.
3.  The chat page displays a list of messages for the chat room specified by `[chatId]`.
4.  New messages sent by the user appear optimistically in the message list.
5.  New messages sent by other users appear in real-time for the current `[chatId]`.
6.  The sender's avatar (from `public.profiles`) is displayed next to each message.
7.  A visual component (avatar stack) displays the avatars of users currently present in the chat room (identified by `[chatId]`) in real-time.

## Technical Tasks

- [x] **TSC-1:** Create Root Layout with Global Providers. (*Ensure `app/layout.tsx` is set up, including necessary providers like a placeholder `MusicContext`.*)
- [x] **TSC-3:** Implement Chat Page UI Shell. (*Create `app/(protected)/chat/[chatId]/page.tsx`. This page will receive `chatId` as a parameter. It should fetch initial chat room data (e.g., room name) and messages for the given `chatId`. For this story, assume `chatId` corresponds to the default chat room. Integrate the existing and adapted `RealtimeChat` component (`components/chat-ui/realtime-chat.tsx`). Pass necessary props like initial messages, the `chatId` (as `roomId`), and username.*)
- [x] **TSB-2:** Implement `sendMessage` Server Action. (*This is a key remaining task for persisting messages. The existing `RealtimeChat` component's (`components/chat-ui/realtime-chat.tsx`) `useRealtimeChat` hook sends messages via Supabase broadcast; this action will handle DB persistence.*)
    - [x] Define the action in `app/_actions/chat.ts`.
    - [x] Include input validation using Zod for `roomId` (which will be the `chatId` from the page) and `content`.
    - [x] Perform authentication check to ensure only logged-in users can send messages.
    - [x] Insert the message into `public.chat_messages` using the Supabase server client.
    - [x] Return an `ActionResult` indicating success/failure.
- [x] **TSC-4:** Verify and Adapt `RealtimeChat` Input Functionality. (*The core input UI/logic exists within `components/chat-ui/realtime-chat.tsx` and has been type-aligned. Focus is on integration and ensuring it correctly triggers the `sendMessage` Server Action (TSB-2) for persistence, using the correct `roomId` (derived from `chatId`), while maintaining optimistic updates via Supabase broadcast.*)
    - [x] Confirm the input form within `components/chat-ui/realtime-chat.tsx` calls the `sendMessage` function from `useRealtimeChat` with the correct `roomId`.
    - [x] Ensure `useRealtimeChat`'s `sendMessage` correctly handles optimistic UI updates via Supabase broadcast (as it currently does) AND that the flow for calling the *new* `sendMessage` Server Action (TSB-2) for persistence is added/triggered with the correct `roomId`.
    - [x] Ensure loading/disabled states are handled appropriately if/when calling a Server Action directly (though primary send might remain client-side broadcast with server-side persistence as a secondary step).
- [x] **TSC-5:** Verify and Adapt `RealtimeChat` Message List Functionality. (*The core message display and realtime subscription logic exists within `components/chat-ui/realtime-chat.tsx` and `components/chat-ui/chat-message.tsx` and has been type-aligned. Focus is on integration and data flow for the specified `roomId`.*)
    - [x] Verify `components/chat-ui/realtime-chat.tsx` fetches/receives initial messages correctly (e.g., passed as props from the parent Server Component `app/(protected)/chat/[chatId]/page.tsx` including avatar data).
    - [x] Ensure `ChatMessageItem` (`components/chat-ui/chat-message.tsx`) is adapted to display the sender's avatar (from `public.profiles` via the message data).
    - [x] Ensure the realtime subscription within `useRealtimeChat` correctly updates the message list for the specified `roomId`, including avatar data for new messages.

## Open Questions / Clarifications Needed

- (None at the moment)

## Testing Notes

- Manual verification of chat functionality in the default room will be needed.
- Check optimistic updates, real-time message reception, and avatar display.
- Verify server-side persistence of messages.