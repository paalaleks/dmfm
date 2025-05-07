# Story 1.3: Implement User Authentication Flow (Spotify)

**ID:** `epic1.story1.3`
**Parent Epic:** [Epic 1: Core User Authentication & Chat Setup](./epic-1-core-auth-chat-setup.epic.md)
**Status:** DONE

## Goal

Develop the UI and server-side logic for users to log in via their Spotify accounts, establish an authenticated session within the application, and ensure their profiles are correctly populated or available. This includes handling the OAuth callback and managing user sessions.

## Requirements

1.  Users can initiate login via a "Login with Spotify" button.
2.  The application correctly redirects users to Spotify for authentication and authorization.
3.  Upon successful Spotify authentication, users are redirected back to a specified callback URL within the application.
4.  The callback handler exchanges the Spotify authorization code for a Supabase session.
5.  An entry in the `public.profiles` table is automatically created or verified for the authenticated user (leveraging the `handle_new_user` trigger).
6.  The user session is established in the Next.js application, and authenticated users can access protected routes.
7.  Unauthenticated users attempting to access protected routes are redirected to the login page.
8.  Basic error handling is in place for login failures, directing users to an appropriate error page.
9.  Up-to-date TypeScript types for the database schema are generated and available for use in the codebase.

## Technical Tasks

- [x] **TSB-3:** Generate and Integrate Database Types. (*Run `npx supabase gen types typescript ...` and ensure `types/database.ts` is updated and used.*)
- [x] **TSC-2:** Implement Spotify Login UI & Flow.
    - [x] Create the login page UI (`app/(auth)/login/page.tsx`) with a "Login with Spotify" button.
    - [x] Implement client-side logic to trigger the Supabase Spotify OAuth flow.
    - [x] Implement the OAuth callback route handler (`app/(auth)/oauth/route.ts`) to exchange the code for a session using `@supabase/ssr`.
    - [x] Ensure correct redirection after login (e.g., to `/chat` or a previous page).
- [x] **TSC-7:** Implement Basic Error Handling UI for Login. (*Ensure `app/(auth)/error/page.tsx` correctly displays relevant error messages passed via query parameters from the OAuth callback or other auth logic.*)
- [x] Verify Supabase middleware (`lib/supabase/middleware.ts`) correctly protects routes and handles session refreshes with `@supabase/ssr`.
- [x] Test the `handle_new_user` trigger functionality by logging in with a new Spotify user and verifying profile creation in the `public.profiles` table.

## Acceptance Criteria

*   Clicking "Login with Spotify" initiates the OAuth flow with Spotify.
*   After successful Spotify authentication and authorization, the user is redirected back to the application.
*   A valid Supabase session is created for the user.
*   The `public.profiles` table contains an entry for the authenticated user, with `spotify_user_id` and `avatar_url` populated (if available from Spotify and configured in `handle_new_user` function).
*   Authenticated users can access a designated protected route (e.g., `/chat`).
*   Unauthenticated users are redirected from protected routes to `/auth/login`.
*   If Spotify authentication fails or the callback results in an error, the user is redirected to `/auth/error` with a meaningful message.
*   TypeScript types in `types/database.ts` are up-to-date with the current Supabase schema.

## Technical Context & References

*   `docs/prd.md` (FR1)
*   `docs/architecture.md` (Authentication Flow)
*   `docs/project-structure.md` (File paths for login page, callback route, middleware)
*   `docs/data-models.md` (`profiles` table, `handle_new_user` trigger)
*   `docs/environment-variables.md` (Relevant Supabase and App URLs)
*   `docs/coding-standards.md` (Error handling strategy, Server Action structure if any are added)
*   `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`
*   Supabase SSR Documentation: [Server-Side Rendering with Next.js](https://supabase.com/docs/guides/auth/server-side-rendering/nextjs)
*   Spotify OAuth Documentation (for understanding the flow managed by Supabase).

## Notes for Developer Agent

*   Start with TSB-3 to ensure database types are current.
*   Focus on leveraging `@supabase/ssr` correctly for all auth operations (client-side login initiation, server-side callback handling, middleware).
*   Pay attention to the redirect URIs configured in both Supabase Auth settings and the Spotify Developer Dashboard; they must match `NEXT_PUBLIC_APP_URL` + callback path.
*   Ensure the `handle_new_user` trigger correctly extracts necessary metadata from `NEW.raw_user_meta_data` (e.g., `provider_id`, `avatar_url`, `full_name`/`user_name`). This might require inspecting a live `auth.users` record after the first successful test login to confirm field names. 