# Story 1.1: Project & Environment Setup (Technical Foundation)

**ID:** `epic1.story1.1`
**Parent Epic:** [Epic 1: Core User Authentication & Chat Setup](./epic-1-core-auth-chat-setup.epic.md)
**Status:** Done

## Goal

Establish the foundational Next.js project, configure Supabase integration (including Spotify Auth provider), set up essential development tooling (linters, formatters), and define environment variables to prepare for core feature development.

## Requirements

1.  A functional Next.js project initialized with TypeScript, Tailwind CSS, and Shadcn UI.
2.  Supabase project configured, including enabling the Spotify authentication provider with necessary credentials and callback URLs.
3.  Supabase client libraries (specifically `@supabase/ssr`) integrated into the Next.js project for server-side and client-side interactions, including authentication middleware.
4.  Necessary environment variables for Supabase and Spotify integration defined in `.env.local` and documented in `.env.example`.
5.  ESLint and Prettier configured and operational for code linting and formatting, adhering to project coding standards.

## Technical Tasks

- [x] **TSA-1:** Initialize Next.js Project (with TypeScript, Tailwind CSS, Shadcn UI). (*User confirmed completion.*)
- [x] **TSA-2:** Configure Supabase Project (including Spotify Auth provider and OAuth redirects). (*User confirmed completion.*)
- [x] **TSA-3:** Implement Supabase Client & Auth Helpers (using `@supabase/ssr`). (*User confirmed completion. Using `@supabase/ssr` as per discussion.*)
- [x] **TSA-4:** Set up Environment Variables (`.env.local`, `.env.example`). (*User confirmed completion.*)
- [x] **TSA-5:** Configure ESLint & Prettier for code linting and formatting. (*Set up based on `docs/coding-standards.md`.*)

## Acceptance Criteria

*   The Next.js application runs locally without errors (`npm run dev` or equivalent).
*   The Supabase client instance can be successfully created and can (theoretically) connect to the Supabase project (actual connection test might come with first DB interaction story).
*   The Supabase authentication middleware structure (using `@supabase/ssr`) is in place in `lib/supabase/middleware.ts` (or equivalent path as per `project-structure.md`).
*   Required environment variables (as defined in `docs/environment-variables.md`) are accessible within the application as appropriate (e.g., `NEXT_PUBLIC_` variables on client, others server-side).
*   An `.env.example` file exists, mirroring `.env.local` but with placeholder values.
*   ESLint and Prettier commands (`npm run lint`, `npm run format` or equivalent) run successfully and enforce the coding styles defined in `docs/coding-standards.md`.
*   Attempting to access a protected route (once defined) without authentication correctly triggers the middleware (e.g., redirects to login, or blocks access as configured - full test in auth story).

## Technical Context & References

*   **Project Initialization:** Next.js documentation, Tailwind CSS setup, Shadcn UI installation.
*   **Supabase Setup:**
    *   Supabase Project Dashboard.
    *   Supabase SSR Documentation: [Server-Side Rendering with Next.js](https://supabase.com/docs/guides/auth/server-side-rendering/nextjs) (for `@supabase/ssr` setup).
    *   `docs/environment-variables.md` (for Supabase URL and Anon Key).
    *   Configuring Spotify Auth Provider in Supabase Dashboard.
*   **Tooling:**
    *   ESLint documentation (for Next.js, TypeScript plugins).
    *   Prettier documentation.
    *   `docs/coding-standards.md` (for linting/formatting rules).
*   **Project Structure:** `docs/project-structure.md` (for file/folder locations).

## Notes for Developer Agent

*   The primary remaining task for this story is TSA-5: Configure ESLint & Prettier.
*   Ensure all setup aligns with the decisions and standards documented in the `docs/` folder.
*   Verify that the Supabase middleware is correctly implemented using the `@supabase/ssr` package as discussed. 