# Playlist Chat Rooms: Environment Variables

This document lists the environment variables required for the "Playlist Chat Rooms" application to run correctly in various environments (local development, preview, production).

**File for Local Development:** `.env.local` (This file should be listed in `.gitignore`)
**Example File:** `.env.example` (This file should be committed to the repository with placeholder values)

### Variable Naming Conventions:

*   Client-side variables (accessible in the browser) **must** be prefixed with `NEXT_PUBLIC_`.
*   Server-side variables (only accessible in Server Actions, API routes, middleware, or during build) should not have this prefix.

---

### Supabase Variables

These variables are necessary for connecting to and interacting with your Supabase project.

1.  **`NEXT_PUBLIC_SUPABASE_URL`**
    *   **Scope:** Client-side & Server-side
    *   **Description:** The public URL for your Supabase project. This is used by the Supabase client library to connect to your Supabase instance.
    *   **Example:** `https://<your-project-ref>.supabase.co`
    *   **Required:** Yes

2.  **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
    *   **Scope:** Client-side & Server-side
    *   **Description:** The public anonymous key for your Supabase project. This key allows unauthenticated users to access your database according to your Row Level Security (RLS) policies for the `anon` role. It's safe to expose this in client-side code.
    *   **Example:** `eyJHbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
    *   **Required:** Yes

3.  **`SUPABASE_SERVICE_ROLE_KEY`**
    *   **Scope:** Server-side only (e.g., for build steps, administrative scripts, or highly privileged Supabase Edge Functions if used later - **NOT directly in Next.js Server Actions/API Routes unless absolutely necessary and handled with extreme care**).
    *   **Description:** The secret service role key for your Supabase project. This key bypasses all RLS policies and should be kept highly confidential. It's typically used for administrative tasks or backend processes that require full access.
    *   **Caution:** Avoid using this key directly in your Next.js application's server-side code if possible. Prefer using the user's context and RLS. If needed for specific backend processes (e.g., seeding, migrations run outside of Supabase dashboard), ensure it's only accessible in secure server environments.
    *   **Example:** `eyJHbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (different from anon key)
    *   **Required:** No (for typical application flow, but may be needed for specific admin tasks or some Supabase CLI operations locally if not logged in).

### Spotify Variables

These variables are necessary for integrating with the Spotify API for authentication and other features.

1.  **`SPOTIFY_CLIENT_ID`**
    *   **Scope:** Server-side (Primarily for Supabase Auth configuration)
    *   **Description:** The Client ID for your Spotify application, obtained from the Spotify Developer Dashboard. Used by Supabase Auth (server-side) during the OAuth flow.
    *   **Example:** `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
    *   **Required:** Yes (for Supabase Spotify Auth configuration in the Supabase Dashboard)

2.  **`SPOTIFY_CLIENT_SECRET`**
    *   **Scope:** Server-side (Primarily for Supabase Auth configuration)
    *   **Description:** The Client Secret for your Spotify application, obtained from the Spotify Developer Dashboard. Used by Supabase Auth (server-side) during the OAuth flow. **This must be kept secret.**
    *   **Example:** `yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`
    *   **Required:** Yes (for Supabase Spotify Auth configuration in the Supabase Dashboard)

### Application Variables

Custom variables for application behavior.

1.  **`NEXT_PUBLIC_APP_URL`** (Optional, but good practice)
    *   **Scope:** Client-side & Server-side
    *   **Description:** The canonical base URL of the deployed application. Useful for constructing absolute URLs for OAuth callbacks, links in emails, etc. This should match the site URL configured in Supabase Auth settings and Spotify Developer Dashboard redirect URIs.
    *   **Example (Local):** `http://localhost:3000`
    *   **Example (Production):** `https://www.yourdomain.com`
    *   **Required:** No (but highly recommended for consistency, especially for OAuth redirect URIs)

---

### How to Obtain and Configure:

*   **Supabase Variables:**
    *   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be found in your Supabase project settings under "API".
    *   `SUPABASE_SERVICE_ROLE_KEY` is also found in your Supabase project settings under "API". Handle with care.
*   **Spotify Variables:**
    *   `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are obtained when you register your application on the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
    *   These need to be configured in your Supabase project's authentication settings for the Spotify provider (Supabase Dashboard -> Authentication -> Providers -> Spotify).
*   **`NEXT_PUBLIC_APP_URL`:**
    *   Set this to `http://localhost:3000` in your local `.env.local`.
    *   For Vercel deployments, Vercel provides system environment variables like `VERCEL_URL` (which points to the Vercel-specific deployment URL) or you can set this variable explicitly for your production domain. Ensure your OAuth redirect URIs in Supabase Auth settings and Spotify Developer Dashboard are correctly configured to use this production URL (or the appropriate preview URLs).

### `.env.example` File Content:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
# SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key" # Only if needed locally for specific admin tasks that Supabase CLI can't handle when logged in

# Spotify (These are primarily configured in the Supabase Dashboard for the Spotify Auth Provider)
# SPOTIFY_CLIENT_ID="your-spotify-client-id-for-reference"
# SPOTIFY_CLIENT_SECRET="your-spotify-client-secret-for-reference"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Note on Spotify Variables:** The `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are primarily configured within the Supabase dashboard for the Spotify Auth provider. They are listed here for completeness as they are essential for the auth flow to work. They are not typically directly used as environment variables *within the Next.js application code itself for the auth flow handled by Supabase*. If your application were to make direct server-to-server calls to Spotify API outside of user context (e.g., for the client credentials grant flow for backend services), then you might need them as server-side environment variables in that specific context.

---

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Initial list of variables.   | Architect Agent | 