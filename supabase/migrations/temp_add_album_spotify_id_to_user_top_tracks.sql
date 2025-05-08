ALTER TABLE public.user_top_tracks
ADD COLUMN album_spotify_id TEXT;

COMMENT ON COLUMN public.user_top_tracks.album_spotify_id IS 'Spotify ID for the track\''s album.'; 