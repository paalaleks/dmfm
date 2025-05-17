# Playlist Chat Rooms: Coding Standards and Patterns

This document outlines the coding standards, patterns, and best practices to be followed during the development of the "Playlist Chat Rooms" application. Adherence to these standards will ensure code consistency, readability, maintainability, and quality.

### 1. Architectural / Design Patterns Adopted

*   **Client-Server Architecture:** With Next.js handling frontend (client-side and server-side rendering/components) and Supabase providing Backend-as-a-Service (BaaS).
    *   _Rationale/Reference:_ Chosen for its modern approach, leveraging managed services to accelerate development. See `docs/architecture.md`.
*   **Server Actions (Next.js):** Preferred for mutations and data fetching initiated from client components.
    *   _Rationale:_ Simplifies data flow, colocates backend logic with frontend interactions where appropriate, type-safe. PRD NFR14.
*   **React Context API:** For global state management, specifically for the `MusicContext` (in `app/layout.tsx`) and potentially for authentication state if needed beyond Supabase's helpers.
    *   _Rationale:_ Built-in React solution for sharing state across components without prop drilling.
*   **Optimistic Updates:** For chat messages to enhance perceived performance.
    *   _Rationale:_ Improves UX by making the application feel faster.
*   **Utility-First CSS (Tailwind CSS):** For styling the application.
    *   _Rationale:_ Rapid UI development, consistent styling, and maintainable CSS. PRD NFR11.
*   **Component-Based UI (React & Shadcn UI):** Building the UI with reusable components.
    *   _Rationale:_ Modularity, reusability, and maintainability. PRD NFR11, NFR12.

### 2. Coding Standards

*   **Primary Language:** **TypeScript**
    *   **Version:** Latest stable version compatible with Next.js (e.g., 5.x).
*   **Primary Runtime:** **Node.js**
    *   **Version:** Latest LTS version compatible with Vercel and Next.js (e.g., 20.x).
*   **Style Guide & Linter/Formatter:**
    *   **Linter:** ESLint (with recommended Next.js core web vitals, TypeScript, and accessibility plugins).
    *   **Formatter:** Prettier.
    *   _Configuration:_ ESLint and Prettier configuration files (`.eslintrc.json`, `.prettierrc.json` or `prettier.config.js`) will be added to the project root. Integrate with VSCode for format-on-save.
*   **Naming Conventions:**
    *   **Variables & Functions (JS/TS):** `camelCase`
        *   Example: `const userName = '';`, `function getUserProfile() {}`
    *   **React Components (Files & Component Name):** `PascalCase.tsx`
        *   Example: `UserProfile.tsx`, `function UserProfile() {}`
    *   **Interfaces & Types (TypeScript):** `PascalCase`
        *   Example: `interface UserProfile { ... }`, `type AuthStatus = ...;`
    *   **Constants (JS/TS):** `UPPER_SNAKE_CASE`
        *   Example: `const MAX_MESSAGE_LENGTH = 500;`
    *   **Files (non-component .ts/.js files, e.g., utilities, server actions, routes):** `kebab-case.ts`
        *   Example: `chat-actions.ts`, `spotify-client.ts`, `oauth-callback-route.ts`
    *   **Folders:** `kebab-case`
        *   Example: `chat-components`, `auth-routes`
    *   **Supabase Migration Files (SQL):** `YYYYMMDDHHMMSS_description-using-hyphens.sql` (as per user instruction, e.g., `20231027103000_create-chat-tables.sql`). The Supabase CLI might generate a numeric prefix; the descriptive part should use hyphens.
    *   **Database Tables & Columns (SQL):** `snake_case` (as per `postgres-sql-style-guide.mdc`).
        *   Example: `chat_messages`, `user_id`
    *   **CSS Classes (Tailwind):** Use Tailwind's utility classes directly. Custom CSS classes (if absolutely necessary and not achievable with Tailwind's `@apply` or component styling) should also be `kebab-case`.
*   **File Structure:** Adhere to the layout defined in `docs/project-structure.md`.
*   **Asynchronous Operations:**
    *   Use `async/await` for all asynchronous operations in TypeScript.
    *   Properly handle promises, ensuring all promises are resolved or rejected and errors are caught.
*   **Type Safety:**
    *   Leverage TypeScript's strict mode (enabled in `tsconfig.json`).
    *   Define clear types/interfaces for function parameters, return values, API payloads, and complex objects. See `types/` directory.
    *   Use Zod for runtime validation of API/Server Action inputs and external data (PRD NFR14).
*   **Comments & Documentation:**
    *   **Code Comments:** Use comments to explain complex logic, assumptions, or workarounds. Avoid commenting on obvious code. Prefer self-documenting code where possible.
        *   Use `//` for single-line comments.
        *   Use `/** ... */` for JSDoc-style comments for functions, classes, and complex types, especially in shared libraries or for API documentation.
    *   **READMEs:** Each significant directory or module might have a `README.md` if it requires specific explanation beyond the main project `README.md`.
    *   **Database Comments:** Use `COMMENT ON ... IS ...;` for tables and columns in SQL migrations (as per `postgres-sql-style-guide.mdc`).
*   **Dependency Management:**
    *   Use `npm` (or chosen package manager, e.g., pnpm, yarn) for managing project dependencies. Ensure consistency once chosen.
    *   Keep dependencies up-to-date and regularly audit for vulnerabilities (e.g., `npm audit`).
    *   Minimize dependencies; only add what is necessary. Evaluate alternatives before adding new large dependencies.

### 3. Error Handling Strategy

*   **General Approach:**
    *   Use `try/catch` blocks for operations that can fail, especially I/O (API calls, database operations).
    *   Server Actions should return structured responses, indicating success or failure, along with data or error messages.
        ```typescript
        // Example Server Action return type
        // export type ActionResult<T = void> = 
        //   | { success: true; data: T }
        //   | { success: false; error: string; errorCode?: string };
        ```
    *   For client-side errors, display user-friendly messages. Avoid exposing raw error details to the user unless it's a specific error code they can reference (e.g., from `app/auth/error/page.tsx`).
*   **Logging:**
    *   **Client-side:** Use `console.log()`, `console.warn()`, `console.error()` sparingly for debugging during development. Consider a lightweight logging library or service for production if extensive client-side logging is needed.
    *   **Server-side (Server Actions, API Routes, Middleware):** Use `console.log()`, `console.error()`. Vercel provides logging for serverless functions. Supabase Edge Functions also have logging.
    *   **Format:** Plain text or JSON if structured logging becomes necessary.
    *   **Levels:** Differentiate between informational messages, warnings, and errors.
    *   **Context:** Include relevant context in error messages (e.g., operation being performed, user ID if applicable, relevant parameters without exposing sensitive data).
*   **Specific Handling Patterns:**
    *   **External API Calls (Spotify, Supabase):**
        *   Wrap SDK calls in `try/catch`.
        *   Check response status codes or error objects returned by SDKs.
        *   Implement retries with exponential backoff for transient network errors if appropriate (though SDKs might handle some of this).
    *   **Input Validation:**
        *   Use Zod for validating data in Server Actions, API route handlers, and any data received from external sources (PRD NFR14).
        *   Client-side form validation for immediate user feedback before submitting to the server.
    *   **Supabase Errors:** Catch errors from Supabase client calls (e.g., `AuthError`, `PostgrestError`) and map them to user-friendly messages or appropriate application error states.

### 4. Security Best Practices

*   **Input Sanitization/Validation:**
    *   All user-provided input must be validated on the server-side (Server Actions, API routes) using Zod, even if client-side validation exists.
    *   Be cautious with data rendered in the UI to prevent XSS (React generally handles this, but be mindful when using `dangerouslySetInnerHTML` which should be avoided).
*   **Secrets Management:**
    *   Environment variables for API keys, database URLs, etc. (PRD NFR7).
    *   Use `.env.local` for local development (git-ignored).
    *   Prefix client-side exposed environment variables with `NEXT_PUBLIC_`.
    *   In Vercel/Supabase, secrets are managed through their respective dashboards/environment variable settings.
    *   Never commit secrets directly to the repository.
*   **Dependency Security:**
    *   Regularly run `npm audit` (or equivalent for chosen package manager) and update vulnerable dependencies.
    *   Use tools like Dependabot or Snyk on GitHub.
*   **Authentication/Authorization Checks:**
    *   Supabase Row Level Security (RLS) will be the primary mechanism for data access authorization at the database level. Adhere to `create-rls-policies.mdc` guidelines.
    *   Server Actions and API routes must verify user authentication (e.g., using Supabase server client `auth.getUser()`) before performing protected operations.
    *   Protect routes in Next.js middleware (as implemented in `lib/supabase/middleware.ts`).
*   **SQL Best Practices:** Follow guidelines from `.cursor/rules/postgres-sql-style-guide.mdc` and `.cursor/rules/create-db-functions.mdc` when writing SQL for migrations or database functions.
*   **HTTPS:** Enforced by Vercel and Supabase.
*   **Content Security Policy (CSP):** Consider implementing CSP headers to mitigate XSS and other injection attacks, especially as the application grows.
*   **Rate Limiting:** While not explicitly in MVP, consider for future API endpoints if they are public or could be abused. Vercel might offer some protection at the edge.

### 5. Supabase Specific Guidelines

*   **Migrations:** Follow `create-migration.mdc` for naming and SQL content. Specifically, use `lower-case-with-hyphen.sql` for the descriptive part of migration filenames.
*   **RLS Policies:** Adhere to `create-rls-policies.mdc`.
*   **Database Functions:** Follow `create-db-functions.mdc`.
*   **Edge Functions:** (If used in future) Follow `writing-supabase-edge-functions.mdc`.
*   **Client Usage:** Use the Supabase client instances from `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server-side: Server Components, Server Actions, Route Handlers).
*   **Type Generation:** Regularly update `types/database.ts` using `npx supabase gen types typescript --project-id <your-project-id> --schema public > types/database.ts` (PRD NFR14).

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial draft | YYYY-MM-DD | 0.1     | Initial draft based on PRD, architecture documents, and user-provided rules/conventions. | Architect Agent | 