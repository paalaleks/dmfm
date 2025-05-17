# Playlist Chat Rooms: Frontend Architecture

This document details the frontend architecture for the "Playlist Chat Rooms" application, built using Next.js and React. It covers key architectural decisions, component structure, state management, data flow, and real-time communication.

### 1. Overview and Core Technologies

The frontend is a modern web application designed for a responsive and interactive user experience.

*   **Framework:** **Next.js (App Router)**
    *   _Role:_ Provides the foundational structure, including server-side rendering (SSR), server components, client components, routing, and API handling via Server Actions.
    *   _Reference:_ `ai/docs/tech-stack.md`
*   **UI Library:** **React**
    *   _Role:_ Used for building reusable UI components and managing their state.
*   **UI Components Toolkit:** **Shadcn UI**
    *   _Role:_ Provides a set of accessible, customizable, and unstyled components (built with Radix UI and Tailwind CSS) that are copied into the project and can be modified. This accelerates UI development while maintaining control.
    *   _Reference:_ PRD NFR12.
*   **Styling:** **Tailwind CSS**
    *   _Role:_ A utility-first CSS framework for rapidly styling components and ensuring a consistent design language.
    *   _Reference:_ PRD NFR11.

### 2. Component Structure and Philosophy

*   **Atomic Design Principles (Inspired):** While not strictly adhering to Atomic Design, the philosophy of building UIs from small, reusable pieces (atoms, molecules, organisms) will be encouraged.
    *   **Atoms/Molecules:** Basic UI elements, many of which will come from Shadcn UI (e.g., `Button`, `Input`, `Card`) or be custom small components (e.g., `UserAvatar`).
    *   **Organisms:** More complex components composed of smaller ones (e.g., `ChatInput` combining an input field and a send button, `MessageList` displaying multiple message items).
    *   **Templates/Pages:** Route components in the `app/` directory that structure organisms and components into full page views.
*   **Reusable Components:**
    *   Shared components (e.g., `UserAvatar`, `SpotifyLoginButton`) will reside in `components/custom/`.
    *   Shadcn UI components will be installed into `components/ui/`.
*   **Feature-Specific Components:** Components specific to a particular feature or route (e.g., chat-specific components like `ChatInput`, `MessageList`) will be co-located within that feature's directory in `app/` (e.g., `app/(main)/chat/components/`).
*   **Server Components vs. Client Components:**
    *   **Server Components:** Used by default in the App Router. Ideal for fetching data that doesn't require client-side interactivity, reducing client-side JavaScript. Pages and layouts that primarily display data will be Server Components.
    *   **Client Components (`"use client";`):** Used for components that require interactivity, state, lifecycle effects (e.g., `useEffect`), or browser-only APIs. Examples include chat input fields, the Spotify player, and any component managing real-time subscriptions.

### 3. State Management

*   **Local Component State:**
    *   _Tools:_ `useState`, `useReducer` (React hooks).
    *   _Use Case:_ For managing UI state that is local to a single component or a small group of closely related components (e.g., form input values, toggle states).
*   **Global State (Cross-Component):**
    *   _Tool:_ **React Context API**.
    *   _Use Cases:_
        *   **`MusicContext` (located in `context/MusicContext.tsx`, provider in `app/layout.tsx`):**
            *   Manages the state of the Spotify Web Playback SDK (instance, device ID, playback state like current track, play/pause status, volume).
            *   Provides functions to control playback and interact with Spotify (save track, follow playlist).
            *   Ensures player state is persistent across all routes as per user requirements.
        *   **Authentication State:** While Supabase Auth helpers (`@supabase/ssr`, `@supabase/auth-helpers-nextjs`) handle much of the session management, a simple context might be used to easily propagate user object or auth status to components if needed, or this can be read directly in components/Server Actions.
*   **Server-Side State & Cache:** Next.js's caching mechanisms for Server Components and fetched data will be utilized. Server Actions manage server-side state mutations.

### 4. Data Fetching and Mutation

*   **Server Actions (Primary for Mutations & Authenticated Data Fetching):**
    *   _Use Case:_ Creating chat messages, updating user profiles (future), fetching data that requires user authentication or server-side processing.
    *   _Implementation:_ Defined in `app/_actions/` or `lib/actions/`. Called directly from Client Components.
    *   _Reference:_ `ai/docs/api-reference.md`.
*   **Client-Side Fetching (for Spotify API):**
    *   _Tool:_ `@spotify/web-api-ts-sdk` and `fetch` API, encapsulated within `lib/spotify.ts` and exposed via `MusicContext`.
    *   _Use Case:_ Fetching playlist data, track information, user's top artists/tracks, searching Spotify. This is done client-side as it often depends on the active user's Spotify session and permissions, and for interacting with the Web Playback SDK.
*   **Route Handlers (Next.js `app/api/`):**
    *   _Use Case:_ Reserved for scenarios where Server Actions are not suitable, such as webhook endpoints or specific RESTful API needs. The Spotify OAuth callback (`app/(auth)/oauth/route.ts`) is an example.
*   **Initial Data for Pages (Server Components):**
    *   Server Components can directly `await` data fetching functions (e.g., calling Supabase client functions from `lib/supabase/server.ts`) within their render logic.

### 5. Real-time Communication (Chat & Presence)

*   **Technology:** Supabase Realtime.
*   **Implementation:**
    *   Client Components (e.g., `MessageList`, `AvatarStack`) will use the Supabase client (`lib/supabase/client.ts`) to subscribe to:
        *   **New messages:** On the `chat_messages` table for the current `room_id`.
        *   **Presence:** On a specific channel for the current chat room to track active users.
    *   Received events will trigger state updates in these components, re-rendering the UI.
*   **Optimistic Updates for Chat:**
    1.  When a user submits a message, the UI (e.g., `MessageList`) will immediately add the message to its local state with a "pending" or temporary status.
    2.  The `sendMessage` Server Action is called.
    3.  When the Supabase Realtime broadcast for that message is received (confirming it was successfully saved to the database), the local state in `MessageList` is updated/reconciled with the confirmed message data (e.g., updating its status from "pending" to "sent", or replacing the temporary message with the one from the DB which includes the final `id` and `created_at`).
    4.  If the Server Action returns an error, the optimistic update can be reverted, and an error message displayed.
*   **Message Editing/Deletion:**
    *   UI controls for edit/delete will appear on user's own messages (e.g., on hover for mouse, long-press for touch).
    *   Realtime subscriptions will now also handle `UPDATE` and `DELETE` events on the `chat_messages` table to reflect these changes live for all connected clients.

### 6. Routing

*   **Framework:** Next.js App Router.
*   **Structure:**
    *   Defined by the directory structure within `app/`.
    *   **Route Groups:** `(auth)` and `(main)` will be used to organize routes and apply different layouts without affecting URL paths.
    *   **Dynamic Routes:** Will be used for future features like viewing specific user profiles or playlists.
*   **Protected Routes:**
    *   Supabase middleware (`lib/supabase/middleware.ts`) will protect routes that require authentication, redirecting unauthenticated users to the login page.

### 7. Error Handling and Loading States

*   **Loading States:** Components responsible for fetching data (or actions) will implement loading states (e.g., showing spinners or skeleton loaders) to provide user feedback. Shadcn UI components often support loading states.
*   **Error Boundaries (React):** Consider using error boundaries around major sections of the UI to catch rendering errors in client components and display fallback UI.
*   **Server Action Errors:** Client components calling Server Actions will check the `success` field of the returned `ActionResult` and display appropriate error messages from the `error` field. The `app/(auth)/error/page.tsx` provides a generic error page for auth-related issues.

---

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Initial frontend architecture. | Architect Agent | 