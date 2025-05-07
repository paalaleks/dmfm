# Story 1.5: Implement Message Edit and Delete Functionality

**ID:** `epic1.story1.5`
**Parent Epic:** [Epic 1: Core User Authentication & Chat Setup](./epic-1-core-auth-chat-setup.epic.md)
**Status:** DONE

## Goal

Enable authenticated users to edit and delete their own sent messages within the chat interface, with these changes reflected in real-time for all users in the room. Provide intuitive UI/UX for these actions on both mouse-hover and touch-based (long-press) interactions.

## Requirements

1.  Authenticated users can edit the content of their own messages.
2.  Authenticated users can delete their own messages.
3.  Users cannot edit or delete messages sent by other users.
4.  Message edits are reflected in real-time for all users viewing the chat.
5.  Message deletions are reflected in real-time (e.g., message removed or marked as deleted) for all users.
6.  On devices with mouse input, edit and delete options appear when a user hovers over their own message.
7.  On touch devices, edit and delete options appear after a long press on the user's own message.
8.  A confirmation step is required before a message is permanently deleted.
9.  The UI for editing a message should be clear (e.g., inline editing or a modal).

## Technical Tasks

- [x] **TSB-4:** Implement `editMessage` Server Action.
    - [x] Define the action in `app/_actions/chat-actions.ts` (or `lib/actions/`).
    - [x] Inputs: `messageId (number)`, `newContent (string)`.
    - [x] Perform input validation (e.g., Zod for non-empty content, respecting max length).
    - [x] Verify user authentication and ownership of the message.
    - [x] Update the `content` and potentially an `updated_at` field in `public.chat_messages`.
    - [x] Return an `ActionResult` indicating success/failure.
- [x] **TSB-5:** Implement `deleteMessage` Server Action.
    - [x] Define the action in `app/_actions/chat-actions.ts` (or `lib/actions/`).
    - [x] Input: `messageId (number)`.
    - [x] Verify user authentication and ownership of the message.
    - [x] Delete the message from `public.chat_messages`.
    - [x] Return an `ActionResult` indicating success/failure.
- [x] **TSC-8:** Update Chat Message UI for Edit/Delete Controls.
    - [x] Modify `chat-message.tsx` (or equivalent component displaying individual messages).
    - [x] Add UI elements (e.g., icons or buttons) for edit and delete.
    - [x] Implement hover detection to show controls on mouse-enabled devices (only for user's own messages).
    - [x] Implement long-press detection to show controls on touch devices (only for user's own messages).
- [x] **TSC-9:** Implement Message Editing UI Flow.
    - [x] Develop UI for message editing (e.g., an inline input field replacing message text, or a modal).
    - [x] Handle saving the edited message by calling the `editMessage` Server Action.
    - [x] Handle canceling the edit.
- [x] **TSC-10:** Implement Message Deletion UI Flow.
    - [x] Develop UI for deletion confirmation (e.g., a confirmation dialog/modal).
    - [x] Handle confirmed deletion by calling the `deleteMessage` Server Action.
- [x] **TSC-11:** Update Realtime Handling for Message Edits & Deletes.
    - [x] Modify `useRealtimeChat.ts` (or equivalent hook/component managing Realtime subscriptions).
    - [x] Handle `UPDATE` events on `chat_messages` table: update the message content in the local state/UI.
    - [x] Handle `DELETE` events on `chat_messages` table: remove the message from the local state/UI.
    - [x] Ensure optimistic updates (if any) are reconciled correctly.

## Acceptance Criteria

*   When a user hovers over their own message with a mouse, "edit" and "delete" options become visible.
*   When a user long-presses their own message on a touch device, "edit" and "delete" options become visible.
*   These options do not appear for messages sent by other users.
*   Clicking "edit" allows the user to change the message content; saving the change updates the message for all users in real-time.
*   Clicking "delete" prompts for confirmation; confirming deletes the message for all users in real-time.
*   Attempting to edit/delete another user's message (e.g., via a crafted API call if UI prevents it) fails.
*   Server Actions for edit and delete correctly update/remove data in the `chat_messages` table.
*   RLS policies effectively enforce that users can only modify/delete their own messages.

## Technical Context & References

*   `docs/prd.md` (Updated with FR3.2, FR3.3)
*   `docs/api-reference.md` (Updated with `editMessage`, `deleteMessage` actions)
*   `docs/frontend-architecture.md` (Updated with UI patterns and Realtime handling for edit/delete)
*   `docs/data-models.md` (`chat_messages` RLS policies for UPDATE, DELETE)
*   `docs/coding-standards.md`
*   `app/_actions/chat-actions.ts` (or `lib/actions/`)
*   `components/chat-message.tsx` (or equivalent)
*   `hooks/use-realtime-chat.tsx` (or equivalent)
*   Supabase Realtime Documentation for `UPDATE` and `DELETE` events.

## Notes for Developer Agent

*   Focus on clear and intuitive UI for both mouse and touch interactions.
*   Ensure robust error handling for server actions and UI flows.
*   Pay close attention to Supabase RLS policies to ensure data integrity and security.
*   Consider how "edited" state might be visually indicated on a message, if desired (e.g., a small "(edited)" label). This is optional for the core functionality.
*   For deletion, decide if the message is completely removed or if it's marked as "deleted" (e.g., "This message was deleted"). For MVP, complete removal is simpler. 