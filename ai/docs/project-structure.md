# Playlist Chat Rooms: Project Structure

This document outlines the proposed folder and file structure for the "Playlist Chat Rooms" Next.js application. The structure is designed to promote organization, scalability, and ease of navigation, following Next.js best practices with the App Router.

```plaintext
playlist-chat-rooms/
├── app/
│   ├── (protected)/
│   │   ├── chat/
│   │   │   ├── [chatId]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── profile/
│   │       ├── page.tsx
│   │       ├── play-history/
│   │       │   └── page.tsx
│   │       ├── playlists/
│   │       │   ├── page.tsx
│   │       │   ├── playlist-import-form.tsx
│   │       │   └── user-playlists-display.tsx
│   │       └── top-chart/
│   │           └── page.tsx
│   ├── _actions/
│   │   ├── chat.ts
│   │   ├── delete-playlist.ts
│   │   ├── import-playlist.ts
│   │   └── top-items.ts
│   ├── api/
│   │   └── spotify/
│   │       └── refresh-token/
│   │           └── route.ts
│   ├── auth/
│   │   ├── error/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── oauth/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── nav/
│   │   ├── logout-action.ts
│   │   ├── logout-button.tsx
│   │   ├── nav.tsx
│   │   └── notifications.tsx
│   ├── player/
│   │   ├── player-trigger.tsx
│   │   ├── player.tsx
│   │   └── VolumePopover.tsx
│   ├── ui/
│   │   ├── avatar.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── popover.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   └── tooltip.tsx
│   ├── avatar-stack.tsx
│   ├── chat-message.tsx
│   ├── current-user-avatar.tsx
│   ├── login-form.tsx
│   ├── realtime-chat-loader.tsx
│   └── realtime-chat.tsx
├── hooks/
│   ├── use-chat-scroll.tsx
│   ├── use-current-user-image.ts
│   ├── use-current-user-name.ts
│   ├── use-realtime-chat.tsx
│   ├── use-realtime-presence-room.ts
│   └── useLocalStorage.ts
├── lib/
│   ├── supabase/
│   │   ├── __mocks__/
│   │   │   └── server.ts
│   │   ├── client.ts
│   │   ├── middleware.ts
│   │   └── server.ts
│   ├── cloudinary-urls.ts
│   ├── spotify-accesstoken.ts
│   └── utils.ts
├── music-context/
│   ├── music-context.tsx
│   ├── playlist-actions.ts
│   ├── spotify-api.ts
│   ├── spotify-helpers.ts
│   ├── token-manager.ts
│   └── user-session.ts
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── supabase/
│   └── migrations/
│       ├── 20240401120000_create_notification_system.sql
│       ├── 20240401120100_create_notification_rpcs.sql
│       ├── 20250512065750_create_playlist_track_artist_aggregates_table.sql
│       ├── temp_add_album_spotify_id_to_user_top_tracks.sql
│       └── YYYYMMDDHHMMSS_create_playlist_and_taste_tables.sql
├── types/
│   ├── actions.ts
│   ├── auth.ts
│   ├── database.ts
│   ├── music-context.ts
│   └── spotify.ts
├── .eslintrc.json
├── .gitignore
├── .prettierrc.json
├── components.json
├── eslint.config.mjs
├── jest.config.js
├── middleware.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
├── repomix.config.json
└── tsconfig.json
```

### Key Directory Descriptions:

*   **`app/`**: Core of the Next.js application using the App Router. Root for pages, layouts, and route handlers.
    *   **`(protected)`**: Route group for sections of the application requiring authentication (e.g., chat, user profile).
    *   **`_actions/`**: Server Actions, primarily for backend logic related to data mutations and specific features.
    *   **`api/`**: API routes. For example, `api/spotify/refresh-token/` handles Spotify token refreshing.
    *   **`auth/`**: Contains routes related to user authentication (login, error pages, OAuth callbacks).
    *   **`layout.tsx`**: Defines the UI shell for a route segment and its children. (e.g., `app/layout.tsx`, `app/(protected)/layout.tsx`).
    *   **`page.tsx`**: The UI for a specific route.
    *   **`globals.css`**: For Tailwind CSS base styles and any custom global CSS.
*   **`components/`**: Shared/reusable UI components.
    *   **`nav/`**: Components specifically for site navigation.
    *   **`player/`**: Components related to the music player functionality.
    *   **`ui/`**: Base UI components, potentially from a library like Shadcn UI.
    *   Other component files directly under `components/` are for specific, shared UI elements (e.g., `AvatarStack.tsx`, `ChatMessage.tsx`).
*   **`hooks/`**: Custom React hooks to encapsulate reusable component logic (e.g., `useSpotifyPlayer.ts` was an example, actual hooks are listed in the tree).
*   **`lib/`**: Utility functions, helper modules, client configurations, and core service interactions.
    *   **`supabase/`**: For Supabase client instances (browser, server, middleware) and related utility functions. Includes `__mocks__/` for testing.
    *   **`spotify-accesstoken.ts`**: Manages Spotify access tokens.
    *   **`utils.ts`**: General utility functions.
*   **`music-context/`**: Contains React Context and related logic for managing music player state and Spotify API interactions.
*   **`public/`**: Static assets accessible directly via URL (e.g., images, favicons, SVGs).
*   **`supabase/migrations/`**: SQL files for database schema changes, managed by Supabase CLI.
*   **`types/`**: Global TypeScript definitions for the project.
    *   **`database.ts`**: Auto-generated types from Supabase schema (using `supabase gen types typescript`).
    *   Specific type files like `actions.ts`, `auth.ts`, `music-context.ts`, `spotify.ts` define shapes for those domains.

### Notes:

*   This structure is a recommendation and can be adjusted as the project evolves.
*   File naming conventions (e.g., `PascalCase` for React components/pages, `camelCase` or `kebab-case` for utilities and other files) should be consistently applied (to be defined in `docs/coding-standards.md`).
*   The PRD preference for Next.js Server Actions over traditional API routes is reflected.
*   The placement of the `MusicContext.Provider` in the root `app/layout.tsx` addresses the requirement for a global, persistent music player.

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Initial draft based on PRD and technical discussions | Architect Agent |
| Revision 1    | YYYY-MM-DD | 0.2     | Adjusted auth paths, removed src/ dir, removed styles/ dir, added middleware.ts path based on user feedback and provided files. | Architect Agent |


</rewritten_file> 