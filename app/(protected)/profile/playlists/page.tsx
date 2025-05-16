import React from 'react';
import PlaylistImportForm from './playlist-import-form';
import UserPlaylistsDisplay from './user-playlists-display';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { revalidatePath } from 'next/cache';

// Type for the data as returned by the Supabase query
// Uses Pick to select only the fields explicitly queried, plus the joined track count.
// This matches the shape of data returned by the .select() call.
type FetchedPlaylistData = Pick<
  Tables<'playlists'>,
  'id' | 'name' | 'spotify_playlist_id' | 'image_url'
> & {
  playlist_tracks: { count: number }[];
};

// Interface for the playlist data shaped for display in the client component
interface DisplayPlaylist {
  id: string;
  playlist_name: string;
  spotify_playlist_id: string;
  playlist_cover_image_url: string | null;
  track_count: number;
}

export default async function PlaylistsPage() {
  const supabase = await createClient();

  let playlists: DisplayPlaylist[] = [];
  let fetchError: string | null = null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    fetchError = 'Could not authenticate user. Please try logging in again.';
  } else {
    try {
      const { data, error: dbError } = await supabase
        .from('playlists')
        .select(
          `
          id,
          name,
          spotify_playlist_id,
          image_url,
          playlist_tracks(count)
        `
        )
        .eq('submitted_by_user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('Error fetching playlists:', dbError);
        fetchError = `Failed to load playlists: ${dbError.message}`;
      } else if (data) {
        // Data from Supabase select will match the fields selected.
        // Explicitly casting `data` to `FetchedPlaylistData[]` if TS inference is not precise enough,
        // or ensuring `p` in map matches the inferred structure of `data` elements.
        playlists = (data as FetchedPlaylistData[]).map(
          (p: FetchedPlaylistData): DisplayPlaylist => ({
            id: p.id,
            playlist_name: p.name,
            spotify_playlist_id: p.spotify_playlist_id,
            playlist_cover_image_url: p.image_url,
            track_count:
              p.playlist_tracks && p.playlist_tracks.length > 0 ? p.playlist_tracks[0].count : 0,
          })
        );
      }
    } catch (e) {
      console.error('Unexpected error fetching playlists:', e);
      if (e instanceof Error) {
        fetchError = `An unexpected error occurred while fetching playlists: ${e.message}`;
      } else {
        fetchError = 'An unexpected error occurred while fetching playlists.';
      }
    }
  }

  const handleImportSuccess = async () => {
    'use server';
    revalidatePath('/profile/playlists');
  };

  return (
    <div className='mx-auto p-4 z-10 relative pt-16 w-full '>
      <Card className='mb-8 p-6 bg-accent border-none shadow-md rounded-lg max-w-xl mx-auto'>
        <CardHeader>
          <CardTitle>Import Spotify Playlist</CardTitle>
        </CardHeader>
        <PlaylistImportForm onImportSuccess={handleImportSuccess} />
      </Card>

      <div className='mt-12'>
        <h3 className='text-2xl font-semibold mb-6 text-center'>Your Imported Playlists</h3>
        <UserPlaylistsDisplay initialPlaylists={playlists} initialError={fetchError} />
      </div>
    </div>
  );
}
