'use server';

import { createClient } from '@/lib/supabase/server';
import { Playlist } from '@/types/spotify'; // Assuming this type includes necessary fields like id, name, spotify_id, image_url
import { Tables } from '@/types/database';

/**
 * Server Action to get playlists matched for the current user from the database.
 * Fetches pre-calculated matches from the user_playlist_matches table.
 *
 * @param userId - The UUID of the user whose matched playlists are to be fetched.
 * @returns A promise that resolves to an array of Playlist objects.
 */
export async function getMatchedPlaylistsForUserAction(userId: string): Promise<Playlist[]> {
  // console.log(`[Playlist Action] Fetching matched playlists for user: ${userId}`);
  if (!userId) {
    console.error('[Playlist Action] User ID is required.');
    return [];
  }

  const supabase = await createClient();

  try {
    const { data: matches, error: matchesError } = await supabase
      .from('user_playlist_matches')
      .select(
        `
        playlist_id,
        playlists (
          id,
          spotify_playlist_id,
          name,
          description,
          image_url,
          owner_spotify_user_id,
          total_tracks,
          snapshot_id,
          submitted_by_user_id
        )
      `
      )
      .eq('user_id', userId);

    if (matchesError) {
      console.error('[Playlist Action] Error fetching user_playlist_matches:', matchesError);
      throw new Error(`Failed to fetch matched playlists: ${matchesError.message}`);
    }

    if (!matches || matches.length === 0) {
      // console.log(`[Playlist Action] No pre-calculated matches found for user ${userId}.`);
      return [];
    }

    // console.log(`[Playlist Action] Found ${matches.length} matches for user ${userId}. Processing...`);

    // Extract the playlist data and map to the Playlist type
    const playlists: Playlist[] = matches
      .map((match) => {
        // Type guard to handle potential array/object discrepancy from generated types
        const potentialPlaylistData = match.playlists as
          | Tables<'playlists'>[]
          | Tables<'playlists'>
          | null;
        const playlistData = Array.isArray(potentialPlaylistData)
          ? (potentialPlaylistData[0] ?? null)
          : potentialPlaylistData;

        if (!playlistData) {
          console.warn(
            `[Playlist Action] Match found for user ${userId} but playlist data (${match.playlist_id}) is missing or invalid. Skipping.`
          );
          return null;
        }

        // Map DB fields to Playlist type fields
        // IMPORTANT: Ensure Playlist type aligns with these fields.
        // Specifically, Playlist might expect 'spotify_id' instead of 'spotify_playlist_id'
        return {
          id: playlistData.id, // Internal DB ID
          spotify_id: playlistData.spotify_playlist_id, // Spotify ID
          name: playlistData.name,
          description: playlistData.description ?? '',
          images: playlistData.image_url
            ? [{ url: playlistData.image_url, height: null, width: null }]
            : [],
          owner: {
            // Assuming Playlist type has an owner object. Adjust as needed.
            id: playlistData.owner_spotify_user_id ?? 'unknown',
            display_name: 'Unknown', // Might need another join or separate fetch if display name is needed
          },
          tracks: {
            // Assuming Playlist type needs a tracks object. Adjust as needed.
            total: playlistData.total_tracks ?? 0,
            href: '', // Placeholder or construct if needed
          },
          snapshot_id: playlistData.snapshot_id ?? '',
          public: true, // Assuming default, adjust if DB has this info
          collaborative: false, // Assuming default, adjust if DB has this info
          type: 'playlist',
          uri: `spotify:playlist:${playlistData.spotify_playlist_id}`,
          href: `https://api.spotify.com/v1/playlists/${playlistData.spotify_playlist_id}`, // Construct href if needed
          external_urls: {
            spotify: `https://open.spotify.com/playlist/${playlistData.spotify_playlist_id}`,
          },
          // Include other fields required by Playlist type, potentially with defaults
        } as Playlist; // Casting might be necessary depending on strictness
      })
      .filter((p): p is Playlist => p !== null); // Filter out any nulls from missing data

    // console.log(`[Playlist Action] Returning ${playlists.length} processed playlists for user ${userId}.`);
    return playlists;
  } catch (error) {
    console.error('[Playlist Action] Unexpected error in getMatchedPlaylistsForUserAction:', error);
    // Return empty on error to align with previous action's behavior
    return [];
  }
}
