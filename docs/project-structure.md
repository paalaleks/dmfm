# Playlist Chat Rooms: Project Structure

This document outlines the proposed folder and file structure for the "Playlist Chat Rooms" Next.js application. The structure is designed to promote organization, scalability, and ease of navigation, following Next.js best practices with the App Router.

```plaintext
playlist-chat-rooms/
├── .github/                    # GitHub Actions workflows (CI/CD)
│   └── workflows/
│       └── main.yml            # Example CI/CD workflow
├── .vscode/                    # VSCode specific settings (optional)
│   └── settings.json
├── app/                        # Next.js App Router directory
│   ├── (auth)/                 # Route group for authentication pages
│   │   ├── login/
│   │   │   └── page.tsx        # Path: app/auth/login/page.tsx
│   │   ├── error/
│   │   │   └── page.tsx        # Path: app/auth/error/page.tsx
│   │   └── oauth/              # For Spotify auth callback
│   │       └── route.ts        # Path: app/auth/oauth/route.ts
│   ├── (main)/                 # Route group for main authenticated app sections
│   │   ├── layout.tsx          # Layout for authenticated sections
│   │   └── chat/
│   │       ├── page.tsx        # Main chat room page
│   │       └── components/     # Components specific to the chat feature
│   │           ├── ChatInput.tsx
│   │           ├── MessageList.tsx
│   │           └── AvatarStack.tsx
│   ├── _actions/               # Next.js Server Actions (co-located or in lib/actions)
│   │   └── chatActions.ts
│   ├── api/                    # API routes (if Server Actions are not sufficient)
│   │   └── health/
│   │       └── route.ts
│   ├── layout.tsx              # Root layout (includes MusicContext.Provider)
│   ├── page.tsx                # Homepage / entry point
│   └── globals.css             # Global styles (Tailwind base, custom global styles)
├── components/                 # Shared/reusable UI components (Shadcn UI based)
│   ├── ui/                     # Shadcn UI components (as installed)
│   └── custom/                 # Custom reusable components
│       ├── UserAvatar.tsx
│       └── SpotifyLoginButton.tsx
├── config/                     # Application configuration (e.g., site metadata, feature flags)
│   └── site.ts
├── context/                    # React Context providers
│   └── MusicContext.tsx        # Spotify player context
├── docs/                       # Project documentation (PRD, Architecture, etc.)
│   ├── architecture.md
│   ├── tech-stack.md
│   ├── project-structure.md
│   └── ...                     # Other .md files
├── hooks/                      # Custom React hooks
│   └── useSpotifyPlayer.ts
├── lib/                        # Utility functions and libraries
│   ├── supabase/               # Supabase client and helper functions
│   │   ├── client.ts           # Path: lib/supabase/client.ts
│   │   ├── middleware.ts       # Path: lib/supabase/middleware.ts
│   │   └── server.ts           # Path: lib/supabase/server.ts
│   ├── utils.ts                # General utility functions
│   └── spotify.ts              # Spotify SDK client and helper functions
├── public/                     # Static assets (images, fonts, etc.)
│   ├── favicons/
│   └── images/
├── supabase/                   # Supabase specific configuration
│   ├── migrations/             # Database migration files (SQL)
│   │   └── YYYYMMDDHHMMSS_initial_schema_and_seed.sql
│   └── seed.sql                # (Optional) Additional seed data
├── types/                      # TypeScript type definitions
│   ├── database.ts             # Supabase generated DB types
│   ├── spotify.ts              # Types related to Spotify API/SDK
│   └── index.ts                # General application types
├── .env.local                  # Local environment variables (git-ignored)
├── .env.example                # Example environment variables
├── .gitignore                  # Git ignore rules
├── next.config.mjs             # Next.js configuration
├── package.json                # Project manifest and dependencies
├── postcss.config.js           # PostCSS configuration (for Tailwind CSS)
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project overview and setup instructions
```

### Key Directory Descriptions:

*   **`.github/workflows/`**: Contains CI/CD pipeline configurations (e.g., for Vercel deployment, running tests).
*   **`app/`**: Core of the Next.js application using the App Router. Root for pages, layouts, and route handlers.
    *   **`(auth)` / `(main)`**: Route groups to organize sections of the application and apply specific layouts without affecting URL paths.
    *   **`_actions/`**: Convention for co-locating Server Actions near the routes that use them. Alternatively, these can be in `lib/actions/`.
    *   **`api/`**: For traditional API route handlers, if Server Actions are not sufficient for a use case.
    *   **`layout.tsx`**: Defines the UI shell for a route segment and its children. The root `app/layout.tsx` will include the `MusicContext.Provider`.
    *   **`page.tsx`**: The UI for a specific route.
    *   **`globals.css`**: For Tailwind CSS base styles and any custom global CSS.
*   **`components/`**:
    *   **`ui/`**: Where Shadcn UI components are typically installed by the CLI.
    *   **`custom/`**: Project-specific reusable components built from Shadcn UI primitives or from scratch.
*   **`config/`**: Application-wide configuration that is not environment-specific (e.g., site title, navigation links, constants).
*   **`context/`**: React Context API providers for global state management (e.g., `MusicContext.tsx` for Spotify player state).
*   **`docs/`**: All project documentation, including PRD, architecture, tech stack, etc.
*   **`hooks/`**: Custom React hooks to encapsulate reusable component logic.
*   **`lib/`**: Utility functions, helper modules, client configurations, and core service interactions.
    *   **`supabase/`**: For Supabase client instances (browser, server, middleware) and related utility functions.
    *   **`spotify.ts`**: For initializing and interacting with the Spotify SDKs.
*   **`public/`**: Static assets accessible directly via URL (e.g., images, favicons).
*   **`supabase/migrations/`**: SQL files for database schema changes, managed by Supabase CLI.
*   **`types/`**: Global TypeScript definitions for the project.
    *   **`database.ts`**: Auto-generated types from Supabase schema (using `supabase gen types typescript`).

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