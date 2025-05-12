import { SupabaseClient } from '@supabase/supabase-js';
import { Playlist } from '@/types/spotify'; // Assuming this type is comprehensive enough

/**
 * Fetches candidate playlists from the 'playlists' table, excluding those submitted by the specified user.
 * @param supabase - The Supabase client instance.
 * @param currentUserId - The ID of the current user, to exclude their submitted playlists.
 * @returns A Promise that resolves to an array of Playlist objects.
 */
export async function getCandidatePlaylists(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<Playlist[]> {
  const { data: playlistsData, error: playlistsError } = await supabase
    .from('playlists')
    // Select specific columns, assuming 'spotify_playlist_id' is the correct column name in your DB
    .select('id, name, image_url, spotify_playlist_id')
    .not('submitted_by_user_id', 'eq', currentUserId);

  if (playlistsError) {
    console.error('[playlist-queries] Error fetching candidate playlists:', playlistsError);
    return []; // Return empty array on error
  }

  if (!playlistsData) {
    console.log('[playlist-queries] No candidate playlists found.');
    return [];
  }

  // Define an interface for the raw database playlist object
  interface DbPlaylistData {
    id: string;
    name: string;
    spotify_playlist_id: string;
    image_url?: string;
  }

  // Map the fetched data to the Playlist type, ensuring spotify_playlist_id is mapped to spotify_id
  const mappedPlaylists: Playlist[] = playlistsData.map((dbPlaylist: DbPlaylistData) => ({
    id: dbPlaylist.id,
    name: dbPlaylist.name,
    spotify_id: dbPlaylist.spotify_playlist_id, // Mapping here
    image_url: dbPlaylist.image_url,
  }));

  // console.log('[playlist-queries] Mapped playlists:', mappedPlaylists);

  return mappedPlaylists;
}

interface TrackArtist {
  spotify_id: string;
  // Add other fields like 'name' if they exist and are needed, but spotify_id is key here
}

/**
 * Fetches track artist Spotify IDs for a given playlist.
 * Assumes track_artists is a JSONB field containing an array of objects, each with a spotify_id.
 * Example: track_artists: [{ "name": "Artist A", "spotify_id": "artistA_spotify_id" }, ...]
 * @param supabase - The Supabase client instance.
 * @param playlistId - The internal database ID of the playlist (not Spotify ID).
 * @returns A Promise that resolves to a Set of artist Spotify IDs.
 */
export async function getPlaylistArtistIds(
  supabase: SupabaseClient,
  playlistId: string
): Promise<Set<string>> {
  const { data: tracksData, error: tracksError } = await supabase
    .from('playlist_tracks')
    .select('track_artists') // Only select the track_artists JSONB field
    .eq('playlist_id', playlistId);

  if (tracksError) {
    console.error(
      `[playlist-queries] Error fetching tracks for playlist ${playlistId}:`,
      tracksError
    );
    return new Set();
  }

  if (!tracksData || tracksData.length === 0) {
    console.log(`[playlist-queries] No tracks found for playlist ${playlistId}.`);
    return new Set();
  }

  const artistIds = new Set<string>();
  tracksData.forEach((track) => {
    // Ensure track_artists is an array and then process it
    if (Array.isArray(track.track_artists)) {
      track.track_artists.forEach((artist: TrackArtist) => {
        // Ensure artist is an object and has a spotify_id
        if (artist && typeof artist.spotify_id === 'string') {
          artistIds.add(artist.spotify_id);
        }
      });
    }
  });

  return artistIds;
}
