# Playlist Chat Rooms: Technology Stack Specification

This document details the specific technologies and their versions that will be used to build the "Playlist Chat Rooms" application. These choices are based on the project requirements (PRD NFR11), development preferences, and the goal of leveraging modern, efficient tools.

---

### 1. Frontend

*   **Framework:** **Next.js**
    *   **Version:** Latest stable version (as of project commencement, e.g., 14.x.x)
    *   **Rationale:** A full-stack React framework enabling server-side rendering (SSR), static site generation (SSG), API routes (though Server Actions are preferred), and a rich development experience. Its App Router provides improved routing and layout capabilities. Chosen as per PRD (NFR11).
*   **UI Library:** **React**
    *   **Version:** Latest stable version bundled with Next.js.
    *   **Rationale:** The underlying library for Next.js, providing a component-based architecture for building user interfaces.
*   **Styling:** **Tailwind CSS**
    *   **Version:** Latest stable version (e.g., 3.x.x)
    *   **Rationale:** A utility-first CSS framework that allows for rapid UI development and consistent styling. Chosen as per PRD (NFR11).
*   **UI Components:** **Shadcn UI**
    *   **Version:** Latest stable version.
    *   **Rationale:** A collection of beautifully designed, accessible, and customizable UI components built with Radix UI and Tailwind CSS. Provides copy-pasteable components that can be easily integrated and customized. Chosen as per PRD (NFR11).
*   **Rich Text Editor (for @mentions - Future Phase):** **`shadcn-editor`**
    *   **Version:** Latest stable version (as specified by its documentation: https://shadcn-editor.vercel.app/)
    *   **Rationale:** A Notion-style WYSIWYG editor built with Tiptap, Shadcn UI, and Next.js, specifically chosen for the @mention feature (FR6, NFR12).
*   **State Management:**
    *   **React Context API:** For global state like music player status (in `app/layout.tsx`) and potentially user session data if not handled by Supabase helpers directly at component level.
    *   **Local Component State (`useState`, `useReducer`):** For component-specific UI state.
    *   **Rationale:** Start with simpler built-in React solutions, consider more advanced state management libraries (like Zustand or Jotai) only if complexity demands it later.

### 2. Backend & Database

*   **Backend-as-a-Service (BaaS):** **Supabase**
    *   **Version:** Latest stable version provided by the cloud platform.
    *   **Rationale:** Provides an integrated suite of backend tools including a Postgres database, authentication, real-time subscriptions, and serverless functions, significantly accelerating development. Chosen as per PRD (NFR11).
    *   **Components Used:**
        *   **Supabase Database (PostgreSQL):**
            *   **Version:** Latest stable version managed by Supabase (e.g., PostgreSQL 15.x).
            *   **Rationale:** Robust, open-source relational database.
        *   **Supabase Auth:**
            *   **Rationale:** Handles user authentication, integrating with Spotify OAuth.
        *   **Supabase Realtime:**
            *   **Rationale:** Enables real-time features like live chat messages and user presence.
        *   **Supabase Storage (Potential Future Use):** For user-uploaded content if requirements expand.
        *   **Supabase Edge Functions (Potential Future Use):** For custom server-side logic beyond Server Actions if needed.

### 3. Spotify Integration

*   **Spotify Web API SDK:** **`@spotify/web-api-ts-sdk`**
    *   **Version:** Latest stable version.
    *   **Rationale:** A TypeScript SDK for interacting with the Spotify Web API, facilitating type-safe access to Spotify data (user profiles, playlists, tracks). Chosen as per PRD (NFR11).
*   **Spotify Web Playback SDK:**
    *   **Version:** Latest stable version provided by Spotify.
    *   **Rationale:** Allows playing music through the browser, controlling playback, and receiving player state updates. Essential for the music player functionality (FR7).

### 4. Development & Tooling

*   **Programming Language:** **TypeScript**
    *   **Version:** Latest stable version compatible with Next.js and other chosen tools.
    *   **Rationale:** Adds static typing to JavaScript, improving code quality, maintainability, and developer experience, especially for larger projects.
*   **Package Manager:** **npm** (or yarn/pnpm, to be decided by dev team, default npm)
    *   **Version:** Latest stable version.
    *   **Rationale:** Standard tools for managing project dependencies.
*   **Version Control:** **Git**
    *   **Hosting:** GitHub (or similar cloud-based Git provider).
    *   **Rationale:** Standard for version control and collaborative development.
*   **API and Data Validation:** **Zod**
    *   **Version:** Latest stable version.
    *   **Rationale:** A TypeScript-first schema declaration and validation library, useful for validating Server Action inputs, API responses, and environment variables. Chosen as per PRD (NFR14).
*   **Supabase Management:**
    *   **Supabase CLI:** For local development, generating types, and managing migrations.
    *   **Supabase Client Libraries:**
        *   `@supabase/supabase-js`: Core JavaScript library for interacting with Supabase.
        *   `@supabase/auth-helpers-nextjs` (or `@supabase/ssr` for App Router): Simplifies Supabase authentication in Next.js.
        *   Version: Latest stable.
    *   **Rationale:** Essential tools for working with the Supabase platform.

### 5. Deployment (Assumed)

*   **Frontend & Next.js Backend:** **Vercel**
    *   **Rationale:** Platform built by the creators of Next.js, offering seamless deployment, CI/CD, serverless functions, and global CDN, optimized for Next.js applications.
*   **Supabase Services:** **Supabase Cloud**
    *   **Rationale:** Fully managed Supabase hosting.

---

**Notes:**

*   "Latest stable version" implies using the most recent, non-beta release available at the time of dependency installation and periodically updating as part of maintenance.
*   Specific versions will be locked in `package.json` (and `package-lock.json` or `yarn.lock`) once the project is initialized.

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Initial draft based on PRD and discussion | Architect Agent | 