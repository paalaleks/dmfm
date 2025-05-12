-- supabase/migrations/YYYYMMDDHHMMSS_create_notification_system.sql

BEGIN;

-- 1. Create user_saved_tracks table
CREATE TABLE public.user_saved_tracks (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    track_spotify_id TEXT NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT
);

ALTER TABLE public.user_saved_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved tracks" ON public.user_saved_tracks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved tracks" ON public.user_saved_tracks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved tracks" ON public.user_saved_tracks
    FOR DELETE USING (auth.uid() = user_id);

-- 2. Create user_saved_playlists table
CREATE TABLE public.user_saved_playlists (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE, -- Assuming playlists.id is UUID
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT
);

ALTER TABLE public.user_saved_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved playlists" ON public.user_saved_playlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved playlists" ON public.user_saved_playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved playlists" ON public.user_saved_playlists
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Create user_notifications table
CREATE TABLE public.user_notifications (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'new_track_match', 'new_playlist_match'
    item_spotify_id TEXT,
    related_playlist_table_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
    triggering_saved_track_id BIGINT REFERENCES public.user_saved_tracks(id) ON DELETE SET NULL,
    triggering_saved_playlist_id BIGINT REFERENCES public.user_saved_playlists(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    item_name TEXT,
    item_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (to mark as read)" ON public.user_notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes for user_notifications
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_user_id_is_read_created_at ON public.user_notifications(user_id, is_read, created_at DESC);

-- Ensure the internal schema exists if you're using it
CREATE SCHEMA IF NOT EXISTS internal;

-- 4. Placeholder Trigger Functions (to be implemented by Supabase Edge Functions)
-- These SQL functions are shells; the actual logic will be in Edge Functions.
-- The trigger will call an Edge Function using pg_net or similar mechanism if Supabase directly supports it,
-- or via a supabase_functions.http_request if not. For now, we define a simple plpgsql shell.

CREATE OR REPLACE FUNCTION internal.handle_new_saved_track()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- In a real scenario, this function would trigger an Edge Function.
  -- For example, using pg_net or by inserting into a queue table that an Edge Function listens to.
  -- Supabase might also offer direct invocation hooks from triggers to Edge Functions.
  -- The NEW record (NEW.id, NEW.user_id, NEW.track_spotify_id) is available here.
  PERFORM supabase_functions.http_request(
    -- Replace with your actual Edge Function URL and method
    url := 'https://jaoksbhfyfyqubkmjvso.functions.supabase.co/process-saved-track-notification',
    method := 'POST',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting(''request.jwt.claims'', true)::jsonb->>''service_role_key''}', -- Or appropriate auth
    body := jsonb_build_object(
        'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION internal.handle_new_saved_playlist()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Similar to handle_new_saved_track, this triggers an Edge Function.
  -- The NEW record (NEW.id, NEW.user_id, NEW.playlist_id) is available here.
  PERFORM supabase_functions.http_request(
    url := 'https://jaoksbhfyfyqubkmjvso.functions.supabase.co/process-saved-playlist-notification',
    method := 'POST',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting(''request.jwt.claims'', true)::jsonb->>''service_role_key''}', -- Or appropriate auth
    body := jsonb_build_object(
        'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;

-- 5. Create Triggers
CREATE TRIGGER on_user_saved_tracks_insert
    AFTER INSERT ON public.user_saved_tracks
    FOR EACH ROW EXECUTE FUNCTION internal.handle_new_saved_track();

CREATE TRIGGER on_user_saved_playlists_insert
    AFTER INSERT ON public.user_saved_playlists
    FOR EACH ROW EXECUTE FUNCTION internal.handle_new_saved_playlist();

-- Note on RPC Functions (get_user_notifications, mark_notification_as_read, etc.):
-- These will be created separately, typically in the Supabase dashboard SQL editor or as another migration.
-- They are not part of this table/trigger setup script but are part of the overall feature.

COMMIT; 