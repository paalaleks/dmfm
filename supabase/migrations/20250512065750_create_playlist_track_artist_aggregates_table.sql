-- Migration: Create playlist_track_artist_aggregates table
-- Purpose: Stores aggregated track and artist data for each playlist to facilitate efficient querying.
-- Affected tables/columns:
--   - Creates table: public.playlist_track_artist_aggregates
--   - Adds columns: id, playlist_id, user_id, tracks_json, artist_occurrences_json, total_tracks, distinct_artist_count, last_aggregated_at, created_at
--   - Creates trigger: trigger_update_playlist_aggregates_last_aggregated_at on public.playlist_track_artist_aggregates
--   - Creates function: public.update_playlist_aggregates_last_aggregated_at_on_update()
--   - Creates policy: "Allow authenticated users to read playlist aggregates" on public.playlist_track_artist_aggregates
-- Special considerations: None

-- Create the playlist_track_artist_aggregates table
create table public.playlist_track_artist_aggregates (
    id uuid primary key default gen_random_uuid(),
    playlist_id uuid not null unique references public.playlists(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete set null,
    tracks_json jsonb not null default '[]'::jsonb,
    artist_occurrences_json jsonb not null default '[]'::jsonb,
    total_tracks integer not null default 0,
    distinct_artist_count integer not null default 0,
    last_aggregated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- Add comments to the table and columns
comment on table public.playlist_track_artist_aggregates is 'Stores aggregated track and artist data for each playlist.';
comment on column public.playlist_track_artist_aggregates.playlist_id is 'FK to the playlists table.';
comment on column public.playlist_track_artist_aggregates.user_id is 'FK to the profiles table, indicating the user associated with this aggregation (e.g., importer). Can be NULL if not user-specific.';
comment on column public.playlist_track_artist_aggregates.tracks_json is 'JSONB array of track objects from the playlist.';
comment on column public.playlist_track_artist_aggregates.artist_occurrences_json is 'JSONB array of unique artists, each with their occurrence count in the playlist.';
comment on column public.playlist_track_artist_aggregates.total_tracks is 'Total number of tracks in tracks_json.';
comment on column public.playlist_track_artist_aggregates.distinct_artist_count is 'Total number of distinct artists in artist_occurrences_json.';
comment on column public.playlist_track_artist_aggregates.last_aggregated_at is 'Timestamp of the last aggregation update.';

-- Enable Row Level Security for the table
alter table public.playlist_track_artist_aggregates enable row level security;

-- Create RLS policy for authenticated users to read
create policy "Allow authenticated users to read playlist aggregates"
on public.playlist_track_artist_aggregates
for select
to authenticated
using (true);

-- Create function to update last_aggregated_at timestamp on update
create or replace function public.update_playlist_aggregates_last_aggregated_at_on_update()
returns trigger as $$
begin
    new.last_aggregated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger to execute the function before update
create trigger trigger_update_playlist_aggregates_last_aggregated_at
before update on public.playlist_track_artist_aggregates
for each row
execute function public.update_playlist_aggregates_last_aggregated_at_on_update(); 