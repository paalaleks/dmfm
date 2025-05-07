# Playlist Chat Rooms: Architecture Document

## Technical Summary

This document outlines the high-level architecture for the Minimum Viable Product (MVP) of the "Playlist Chat Rooms" application. The MVP focuses on core functionalities: user authentication via Spotify, basic real-time chat in a default room, display of user avatars, and a real-time avatar stack of users in the chat room. The architecture is designed to leverage Next.js for the frontend and Supabase for backend services, ensuring a scalable and maintainable foundation for future enhancements including Spotify player integration and taste-driven dynamic room systems.

## High-Level Overview

The system follows a client-server model with a modern web stack. The primary user interaction involves a Next.js frontend application communicating with Supabase for backend services including authentication, database persistence, and real-time messaging. Spotify services are integrated for authentication and (in later phases) music data and playback.

```mermaid
graph TD
    subgraph User Interaction Layer
        Client[Web Browser - User]
    end

    subgraph Application Layer (Next.js on Vercel/Node.js)
        NextApp[Next.js Application Frontend]
        ServerActions[Next.js Server Actions]
    end

    subgraph Backend Services (Supabase)
        SupabaseAuth[Supabase Auth]
        SupabaseDB[Supabase Database (PostgreSQL)]
        SupabaseRT[Supabase Realtime]
    end

    subgraph External Services
        SpotifyAuth[Spotify Accounts Service]
    end

    Client -- HTTPS --> NextApp
    NextApp -- Displays UI --> Client
    NextApp -- Uses --> ServerActions

    ServerActions -- Inserts/Queries (SQL/RPC) --> SupabaseDB
    NextApp -- Subscribes/Receives Events --> SupabaseRT

    %% Authentication Flow
    Client -- "1. Login Request" --> NextApp
    NextApp -- "2. Redirect for Spotify OAuth" --> SpotifyAuth
    SpotifyAuth -- "3. User Authenticates & Authorizes" --> SpotifyAuth
    SpotifyAuth -- "4. Redirect with Auth Code" --> SupabaseAuth
    SupabaseAuth -- "5. Validates & Creates Session" --> SupabaseAuth
    SupabaseAuth -- "6. Creates User in auth.users" --> SupabaseDB
    SupabaseDB -- "Trigger: on_auth_user_created" --> SupabaseDB[/"public.profiles table updated via handle_new_user()"/]
    SupabaseAuth -- "7. Returns Session Info" --> NextApp
    NextApp -- "8. Establishes Authenticated Session" --> Client

    %% Chat Flow
    Client -- "1. Send Message (optimistic UI)" --> NextApp
    NextApp -- "2. Calls Server Action" --> ServerActions
    ServerActions -- "3. Insert Message" --> SupabaseDB[chat_messages table]
    SupabaseDB -- "4. Triggers Realtime Event" --> SupabaseRT
    SupabaseRT -- "5. Broadcasts New Message & Presence" --> NextApp
    NextApp -- "6. Updates Chat UI & Avatar Stack" --> Client

    %% Presence
    NextApp -- "Manages Presence Channel" --> SupabaseRT

    classDef supabase fill:#3ecf8e,stroke:#333,color:#fff;
    class SupabaseAuth,SupabaseDB,SupabaseRT supabase;

    classDef nextjs fill:#000,stroke:#fff,color:#fff;
    class NextApp,ServerActions nextjs;

    classDef spotify fill:#1DB954,stroke:#333,color:#fff;
    class SpotifyAuth spotify;
```

## Component View

The system comprises the following major components:

*   **Client (Web Browser):**
    *   The user interface, built as a Next.js application.
    *   Handles user interactions, renders chat messages, displays user avatars, and manages optimistic UI updates for chat.
    *   Interacts with Supabase for authentication, real-time messaging, and data fetching/submission.
    *   Initiates authentication flow with Spotify.

*   **Next.js Application (Frontend Server & Client-side):**
    *   Serves the single-page application to the client.
    *   Utilizes Next.js features like Server Components, Client Components, and Server Actions.
    *   Manages client-side state (e.g., using React Context for UI state and later for Spotify player state, which will be in `app/layout.tsx` for global access).
    *   Handles routing and API interactions (via Server Actions to Supabase).

*   **Supabase (Backend-as-a-Service):**
    *   **Supabase Auth:** Manages user authentication, specifically integrating with Spotify OAuth as a provider. Securely stores user identities.
    *   **Supabase Database (PostgreSQL):** Persists application data, including:
        *   `profiles`: User profile information linked to `auth.users`, storing Spotify avatars and usernames.
        *   `chat_rooms`: Information about chat rooms (initially one default room).
        *   `chat_messages`: Stores all chat messages with sender and room associations.
    *   **Supabase Realtime:** Provides real-time capabilities for:
        *   Broadcasting new chat messages to all connected clients in a room.
        *   Managing and broadcasting user presence (avatar stack) within chat rooms.

*   **Spotify API & Services:**
    *   **Spotify Accounts Service:** Used for OAuth 2.0 authentication, allowing users to log in with their Spotify credentials.
    *   **(Future Phases):** Spotify Web API (for fetching user data, playlists, track info) and Spotify Web Playback SDK (for controlling music playback in the client). For the MVP, its role is primarily focused on authentication.

## Key Architectural Decisions & Patterns (MVP)

- **Technology Stack:** Next.js (Frontend), Supabase (Backend: Auth, DB, Realtime), TailwindCSS, Shadcn UI. (Rationale: As per PRD NFR11, modern, efficient, and well-integrated stack).
- **Authentication:** Spotify OAuth via Supabase Auth. (Rationale: Directly meets FR1, secure and standard).
- **Real-time Chat:** Supabase Realtime for messages and presence. (Rationale: Simplifies real-time implementation, meets FR3, FR4).
- **Optimistic Updates:** Client-side UI updates immediately on message send, reconciled with Supabase Realtime broadcast. (Rationale: Enhances user perceived performance NFR1).
- **Server-Side Logic:** Next.js Server Actions for database mutations (e.g., sending messages). (Rationale: Simplifies client-to-server communication, aligns with Next.js best practices, PRD NFR14).
- **Global Music Player State:** React Context located in `app/layout.tsx` for managing Spotify player state across all routes (as per user request for future article/blog pages).
- **Database Schema:** Relational model in Supabase Postgres with tables for `profiles`, `chat_rooms`, `chat_messages`. RLS enabled for security. (Rationale: Structured data, clear relationships, leverages Supabase features).
- **Automatic Profile Creation:** Postgres trigger on `auth.users` to populate `public.profiles`. (Rationale: Keeps user profile data in sync automatically).

## Core Workflow / Sequence Diagrams (MVP)

### User Authentication

1.  **Initiation:** The User (Client) clicks "Login with Spotify" in the Next.js application.
2.  **Redirect to Spotify:** The Next.js app (using Supabase Auth helpers) redirects the User to the Spotify Accounts Service for authorization.
3.  **Spotify Authorization:** User logs in to Spotify and authorizes the application.
4.  **Callback to Supabase:** Spotify redirects back to a Supabase callback URL. Supabase Auth handles the OAuth callback, exchanges the authorization code for tokens, and creates a user session.
5.  **User Session & Profile:**
    *   Supabase Auth creates an entry in `auth.users`.
    *   A database trigger (`on_auth_user_created`) on `auth.users` calls a function (`handle_new_user`) to create a corresponding entry in the `public.profiles` table, populating it with Spotify avatar URL and username.
6.  **Session Propagation:** The user session is established in the Next.js application, allowing authenticated access.

### Real-time Chat

1.  **Connection & Subscription:**
    *   Authenticated User (Client using Next.js app) connects to Supabase Realtime.
    *   Client subscribes to message events for the default chat room and presence events.
2.  **Sending a Message:**
    *   User types and submits a message in the Next.js chat UI.
    *   **Optimistic Update:** The UI immediately displays the message as if sent.
    *   The Next.js app calls a Server Action.
    *   The Server Action inserts the message into the `public.chat_messages` table in Supabase Database (associating it with the `user_id` and `room_id`).
3.  **Receiving Messages:**
    *   The insert into `chat_messages` triggers a Supabase Realtime event.
    *   Supabase Realtime broadcasts the new message to all clients subscribed to that chat room.
    *   The Client's Next.js app receives the message and updates the chat display (this also serves to confirm or correct the optimistic update).
4.  **Displaying Avatar Stack (Presence):**
    *   Clients joining the room establish a presence state with Supabase Realtime.
    *   Supabase Realtime broadcasts presence updates (joins/leaves) to subscribed clients.
    *   The Next.js app updates the real-time avatar stack based on these presence events.

## Infrastructure and Deployment Overview

- **Cloud Provider(s):** Supabase Cloud (for BaaS), Vercel (for Next.js frontend/backend hosting).
- **Core Services Used:** Supabase (Auth, Database, Realtime), Vercel (Hosting, Serverless Functions for Server Actions).
- **Infrastructure as Code (IaC):** Supabase migrations (SQL) for database schema. Vercel manages its own infrastructure.
- **Deployment Strategy:**
    - Next.js App: Git push to Vercel for CI/CD.
    - Supabase Schema: Migrations applied via Supabase CLI or Supabase Studio (or MCP in our case).
- **Environments:** Development (local, Supabase dev project), Production (Supabase prod project, Vercel production deployment).

## Key Reference Documents

- `docs/prd.md`
- `docs/tech-stack.md`
- `docs/project-structure.md` (to be created)
- `docs/coding-standards.md` (to be created)
- `docs/api-reference.md` (to be created)
- `docs/data-models.md` (to be created)
- `docs/environment-vars.md` (to be created)
- `docs/testing-strategy.md` (to be created)

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Initial draft based on PRD and discussion | Architect Agent | 