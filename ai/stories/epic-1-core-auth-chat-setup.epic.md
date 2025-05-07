# Epic 1: Core User Authentication & Chat Setup

**Epic Goal:** Enable users to log in and participate in basic real-time chat, including message management.

**Status:** In Progress

## Description

This epic covers the foundational work required to get the "Playlist Chat Rooms" application operational with its core MVP features. This includes setting up the project, establishing a database schema, implementing user authentication via Spotify, and building the basic real-time chat interface where users can send messages and see who is present in a default chat room.

## Functional Requirements Covered (from PRD)

*   **FR1:** Users must be able to sign up/log in using their Spotify account.
*   **FR2:** The system must display the user's Spotify avatar.
*   **FR3:** Users must be able to send and receive real-time messages in a chat room.
*   **FR3.1:** The system will start with one main default chat room, which will always exist.
*   **FR4:** The system must display a list of currently active users in a chat room (e.g., avatar stack).

## Key Non-Functional Requirements Addressed

*   **NFR1:** Real-time chat messages should appear with minimal latency.
*   **NFR2:** UI interactions should be responsive.
*   **NFR3:** System should be able to handle a growing number of concurrent users (foundational step).
*   **NFR5:** Application should maintain stable connections for real-time features.
*   **NFR7:** User authentication and Spotify token management must be secure.
*   **NFR9:** User interface should be intuitive and easy to navigate.
*   **NFR11:** Adherence to specified Tech Stack (Next.js, Supabase, Tailwind CSS, Shadcn UI, Spotify SDKs).
*   **NFR12:** Use of Pre-defined UI Components (Supabase UI examples for chat/avatars if adaptable, or custom with Shadcn).
*   **NFR14:** Adherence to Development Preferences (Server Actions, Zod, Supabase MCP, Context7 MCP, central types file).

## Stories within this Epic

1.  **Story 1.1:** Project & Environment Setup (Technical Foundation)
    *   *Goal:* Establish the foundational Next.js project, configure Supabase integration, set up essential development tooling, and define environment variables.
2.  **Story 1.2:** Database Schema and Seeding for Core Chat
    *   *Goal:* Implement and apply the initial database schema for user profiles, chat rooms, and messages, including RLS and automatic profile creation. Seed the default chat room.
3.  **Story 1.3:** Implement User Authentication Flow (Spotify)
    *   *Goal:* Develop the UI and server-side logic for users to log in via their Spotify accounts and establish an authenticated session.
4.  **Story 1.4:** Develop Core Chat UI & Functionality
    *   *Goal:* Implement the main chat interface allowing users to send and receive messages in real-time, see their avatars, and view other active users in the room.
5.  **Story 1.5:** Implement Message Edit and Delete Functionality
    *   *Goal:* Allow users to edit their own sent messages and delete their own sent messages, with changes reflected in real-time for all users.

## Key Technical Context & References

*   `docs/prd.md` (Product Requirements Document)
*   `