# Story 1.2: Database Schema and Seeding for Core Chat

**ID:** `epic1.story1.2`
**Parent Epic:** [Epic 1: Core User Authentication & Chat Setup](./epic-1-core-auth-chat-setup.epic.md)
**Status:** Done

## Goal

Implement and apply the initial database schema for user profiles, chat rooms, and messages, including RLS policies and automatic profile creation via a trigger. Seed the default chat room to ensure the application has its initial persistent chat space.

## Requirements

1.  A Supabase database schema that includes tables for `profiles`, `chat_rooms`, and `chat_messages` with appropriate columns, types, and constraints as defined in `docs/data-models.md`.
2.  Row Level Security (RLS) policies implemented for these tables to ensure proper data access control.
3.  A PostgreSQL trigger and function (`handle_new_user`) that automatically creates a new entry in `public.profiles` when a new user signs up via Supabase Auth.
4.  The default chat room (as specified in PRD FR3.1) seeded into the `chat_rooms` table.

## Technical Tasks

- [x] **TSB-1:** Apply Initial Database Schema & Seed. (*Migration `initial_schema_and_seed_v2` applied successfully. This included table creations for `profiles`, `chat_rooms`, `chat_messages`; RLS policies; `handle_new_user` function and trigger; and seeding the default chat room.*)

## Acceptance Criteria

*   The Supabase database contains the `profiles`, `chat_rooms`, and `chat_messages` tables with the schema defined in `docs/data-models.md`.
*   RLS policies are active on these tables as specified.
*   The `handle_new_user` trigger and function are present in the database and correctly create a profile when a new user is added to `auth.users` (this will be fully tested in Story 1.3).
*   The `chat_rooms` table contains one entry for the default chat room, marked with `is_default_room = TRUE`.
*   The migration script (`initial_schema_and_seed_v2.sql` or equivalent) is logged in the Supabase migrations history.

## Technical Context & References

*   `docs/data-models.md` (Definitive source for schema details)
*   `docs/coding-standards.md` (For SQL naming conventions and RLS policy guidelines)
*   Supabase Dashboard (for verifying schema, RLS, and data after migration)
*   SQL migration file: `initial_schema_and_seed_v2` (actual file might be in `supabase/migrations/` with a timestamped name).

## Notes for Developer Agent

*   This story is marked as DONE because the primary technical task (TSB-1) was completed when the `initial_schema_and_seed_v2` migration was successfully applied.
*   Verification of the `handle_new_user` trigger's full functionality will occur during the implementation of Story 1.3 (User Authentication Flow). 