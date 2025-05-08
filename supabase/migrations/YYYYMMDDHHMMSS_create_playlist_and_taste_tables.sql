-- Migration: Create Playlist and Taste Tables
-- Timestamp: YYYYMMDDHHMMSS (Please update filename and this comment)

BEGIN;

-- Alter existing table: public.playlists
ALTER TABLE public.playlists
    ADD COLUMN IF NOT EXISTS total_tracks INTEGER,
    ADD COLUMN IF NOT EXISTS snapshot_id TEXT,
    ADD COLUMN IF NOT EXISTS data_source TEXT, -- e.g., 'user_shared', 'spotify_recommendation', 'user_library'
    ADD COLUMN IF NOT EXISTS last_fetched_from_spotify_at TIMESTAMPTZ;

COMMENT ON COLUMN public.playlists.total_tracks IS 'Total number of tracks in the playlist on Spotify.';
COMMENT ON COLUMN public.playlists.snapshot_id IS 'Spotify''s ID for the current version of the playlist''s tracks. Used to detect changes.';
COMMENT ON COLUMN public.playlists.data_source IS 'Indicates how this playlist was added to the system (e.g., ''user_shared'', ''spotify_library_import'', ''system_recommendation'').';
COMMENT ON COLUMN public.playlists.last_fetched_from_spotify_at IS 'Timestamp of when this playlist''s details were last fetched/updated from Spotify.';

-- RLS for playlists (adjusting existing if necessary, or adding new)
-- Assuming these might be new or need adjustment based on added columns like submitted_by_user_id
DROP POLICY IF EXISTS "Authenticated users can view all playlists." ON public.playlists;
CREATE POLICY "Authenticated users can view all playlists." ON public.playlists
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert playlists they submit." ON public.playlists;
CREATE POLICY "Users can insert playlists they submit." ON public.playlists
    FOR INSERT WITH CHECK (auth.uid() = submitted_by_user_id AND submitted_by_user_id IS NOT NULL);

-- Allow service_role full access (common pattern)
DROP POLICY IF EXISTS "Service role can manage playlists." ON public.playlists;
CREATE POLICY "Service role can manage playlists." ON public.playlists
    FOR ALL USING (auth.role() = 'service_role');


-- Alter existing table: public.playlist_tracks
-- (Note: in docs, referred to conceptually as playlist_items)
ALTER TABLE public.playlist_tracks
    DROP COLUMN IF EXISTS artist_names, -- Removing old TEXT[] array
    ADD COLUMN IF NOT EXISTS track_artists JSONB, -- Adding new JSONB for structured artist data
    ADD COLUMN IF NOT EXISTS track_popularity INTEGER,
    ADD COLUMN IF NOT EXISTS track_preview_url TEXT,
    ADD COLUMN IF NOT EXISTS audio_features JSONB; 
    -- Assuming album_art_url and order_in_playlist are kept as is, no rename needed in SQL.
    -- Assuming added_at is kept as is.

COMMENT ON COLUMN public.playlist_tracks.track_artists IS 'Array of artist objects, e.g., [{ "spotify_id": "...", "name": "..." }]. Replaces artist_names.';
COMMENT ON COLUMN public.playlist_tracks.track_popularity IS 'Popularity of the track on Spotify (0-100).';
COMMENT ON COLUMN public.playlist_tracks.track_preview_url IS 'URL to a 30-second preview of the track.';
COMMENT ON COLUMN public.playlist_tracks.audio_features IS 'Detailed audio features from Spotify (e.g., danceability, energy, valence).';

-- RLS for playlist_tracks
DROP POLICY IF EXISTS "Authenticated users can view all playlist items." ON public.playlist_tracks;
CREATE POLICY "Authenticated users can view all playlist items." ON public.playlist_tracks
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage playlist items." ON public.playlist_tracks;
CREATE POLICY "Service role can manage playlist items." ON public.playlist_tracks
    FOR ALL USING (auth.role() = 'service_role');


-- Create new table: public.user_top_artists
CREATE TABLE IF NOT EXISTS public.user_top_artists (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    artist_spotify_id TEXT NOT NULL,
    name TEXT NOT NULL,
    genres JSONB, -- Array of genre strings
    popularity INTEGER, -- Spotify popularity score (0-100)
    image_url TEXT,
    fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, artist_spotify_id)
);

COMMENT ON TABLE public.user_top_artists IS 'Stores a user''s top artists from Spotify, periodically updated.';
COMMENT ON COLUMN public.user_top_artists.user_id IS 'Link to the user in public.profiles.';
COMMENT ON COLUMN public.user_top_artists.artist_spotify_id IS 'Spotify ID for the artist.';
COMMENT ON COLUMN public.user_top_artists.name IS 'Name of the artist.';
COMMENT ON COLUMN public.user_top_artists.genres IS 'Array of genre strings associated with the artist.';
COMMENT ON COLUMN public.user_top_artists.popularity IS 'Spotify popularity score (0-100) for the artist.';
COMMENT ON COLUMN public.user_top_artists.image_url IS 'URL for the artist''s image.';
COMMENT ON COLUMN public.user_top_artists.fetched_at IS 'Timestamp when this artist data was fetched for the user.';

ALTER TABLE public.user_top_artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own top artists." ON public.user_top_artists
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update their own top artists." ON public.user_top_artists
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage user top artists." ON public.user_top_artists
    FOR ALL USING (auth.role() = 'service_role');

-- Create new table: public.user_top_tracks
CREATE TABLE IF NOT EXISTS public.user_top_tracks (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    track_spotify_id TEXT NOT NULL,
    name TEXT NOT NULL,
    artists JSONB, -- Array of artist objects, e.g., [{ "spotify_id": "...", "name": "..." }]
    album_name TEXT,
    album_image_url TEXT,
    popularity INTEGER, -- Spotify popularity score (0-100)
    duration_ms INTEGER,
    preview_url TEXT,
    fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, track_spotify_id)
);

COMMENT ON TABLE public.user_top_tracks IS 'Stores a user''s top tracks from Spotify, periodically updated.';
COMMENT ON COLUMN public.user_top_tracks.user_id IS 'Link to the user in public.profiles.';
COMMENT ON COLUMN public.user_top_tracks.track_spotify_id IS 'Spotify ID for the track.';
COMMENT ON COLUMN public.user_top_tracks.name IS 'Name of the track.';
COMMENT ON COLUMN public.user_top_tracks.artists IS 'Array of artist objects, e.g., [{ "spotify_id": "...", "name": "..." }].';
COMMENT ON COLUMN public.user_top_tracks.album_name IS 'Name of the track''s album.';
COMMENT ON COLUMN public.user_top_tracks.album_image_url IS 'URL for the track''s album cover image.';
COMMENT ON COLUMN public.user_top_tracks.popularity IS 'Spotify popularity score (0-100) for the track.';
COMMENT ON COLUMN public.user_top_tracks.duration_ms IS 'Duration of the track in milliseconds.';
COMMENT ON COLUMN public.user_top_tracks.preview_url IS 'URL to a 30-second preview of the track.';
COMMENT ON COLUMN public.user_top_tracks.fetched_at IS 'Timestamp when this track data was fetched for the user.';

ALTER TABLE public.user_top_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own top tracks." ON public.user_top_tracks
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update their own top tracks." ON public.user_top_tracks
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage user top tracks." ON public.user_top_tracks
    FOR ALL USING (auth.role() = 'service_role');


-- Create new table: public.user_playlist_interactions
CREATE TABLE IF NOT EXISTS public.user_playlist_interactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE, -- Links to playlists.id (UUID)
    interaction_type TEXT NOT NULL, -- e.g., 'played_in_app', 'shared_in_chat', 'saved_to_library_via_app', 'matched_by_taste_algorithm'
    interacted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    metadata JSONB -- For extra details, e.g., taste match score, chat message ID if shared.
);

COMMENT ON TABLE public.user_playlist_interactions IS 'Tracks various ways users interact with playlists within the application.';
COMMENT ON COLUMN public.user_playlist_interactions.user_id IS 'Link to the user in public.profiles.';
COMMENT ON COLUMN public.user_playlist_interactions.playlist_id IS 'Link to the playlist in public.playlists (using internal UUID).';
COMMENT ON COLUMN public.user_playlist_interactions.interaction_type IS 'Categorizes the interaction, e.g., played_in_app, shared_in_chat, saved_to_library_via_app, matched_by_taste_algorithm.';
COMMENT ON COLUMN public.user_playlist_interactions.metadata IS 'Flexible JSONB field for additional interaction-specific data (e.g., taste match score).';

ALTER TABLE public.user_playlist_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own interactions." ON public.user_playlist_interactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own interactions." ON public.user_playlist_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage interactions." ON public.user_playlist_interactions
    FOR ALL USING (auth.role() = 'service_role');

COMMIT; 