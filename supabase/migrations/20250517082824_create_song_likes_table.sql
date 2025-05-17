-- Migration: Create song_likes table and RLS policies
-- Purpose: This migration creates the public.song_likes table to store user song preferences
--          and implements Row Level Security (RLS) policies to ensure users can only
--          access and manage their own likes.
-- Affected tables/columns:
--   - public.song_likes (new table)
--     - id (uuid, pk)
--     - user_id (uuid, fk to public.profiles.id)
--     - track_spotify_id (text)
--     - liked_at (timestamptz)
--     - created_at (timestamptz)
-- Special considerations: Assumes public.profiles table exists.

-- Create the song_likes table
create table public.song_likes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    track_spotify_id text not null,
    liked_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint song_likes_user_track_unique unique (user_id, track_spotify_id)
);

-- Add a comment to the table
comment on table public.song_likes is 'Stores user song likes/saves.';

-- Create indexes for performance
create index idx_song_likes_user_id on public.song_likes (user_id);
create index idx_song_likes_track_spotify_id on public.song_likes (track_spotify_id);
-- The unique constraint (song_likes_user_track_unique) automatically creates an index on (user_id, track_spotify_id)

-- Enable Row Level Security (RLS)
alter table public.song_likes enable row level security;

-- RLS Policies for authenticated users

-- Policy: Authenticated users can select their own likes.
create policy "Users can view their own song likes."
on public.song_likes
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Policy: Authenticated users can insert new likes for themselves.
create policy "Users can insert their own song likes."
on public.song_likes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Policy: Authenticated users can delete their own likes.
create policy "Users can delete their own song likes."
on public.song_likes
for delete
to authenticated
using ((select auth.uid()) = user_id); 