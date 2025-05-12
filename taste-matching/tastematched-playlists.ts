'use server';

import { createClient } from '@/lib/supabase/server';
import { Playlist } from '@/types/spotify'; // Assuming this type exists and is appropriate
import { calculateJaccardIndex } from '@/taste-matching/taste-comparison'; // Assuming this utility exists
import { getUserTopArtistIds } from '@/taste-matching/user-profile-queries'; // Added import
import { getCandidatePlaylists, getPlaylistArtistIds } from '@/taste-matching/playlist-queries'; // Added getPlaylistArtistIds

// Define a threshold for similarity, can be adjusted
const SIMILARITY_THRESHOLD = 0.02; // Example: 10% similarity

interface PlaylistWithTaste extends Playlist {
  tasteProfile?: Set<string>;
  similarityScore?: number;
}

/**
 * Server Action to get taste-matched playlists for the current user.
 * Fetches user's top artists, candidate playlists, profiles them,
 * calculates taste similarity, and returns a filtered/sorted list.
 */
export async function getTasteMatchedPlaylistsAction(): Promise<Playlist[]> {
  const supabase = await createClient();

  try {
    // 1a. Get current authenticated user's ID
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[Server Action] Error fetching user or no user found:', userError);
      // If no user, perhaps return empty or throw a specific error
      // For now, returning empty as per AC8 for "no matches or error"
      return [];
    }
    const userId = user.id;

    // 1b. Fetch user's top artists (from user_top_artists) into a Set<string>.
    const userTasteProfile = await getUserTopArtistIds(supabase, userId);
    // console.log(
    //   `[Server Action] User taste profile size after getUserTopArtistIds: ${userTasteProfile.size}`
    // );

    // NEW: Fetch artist data from user's playlist aggregates
    console.log(`[Server Action] Fetching playlist aggregate artist data for user ${userId}...`);
    const { data: playlistAggregates, error: aggregatesError } = await supabase
      .from('playlist_track_artist_aggregates')
      .select('artists_json')
      .eq('user_id', userId);

    if (aggregatesError) {
      console.error(
        `[Server Action] Error fetching playlist_track_artist_aggregates for user ${userId}:`,
        aggregatesError
      );
      // Story AC7: Handle error gracefully, potty fall back. For now, just log.
      // The userTasteProfile will just contain top artists if this fails.
    }
    // End of new code block for fetching playlist aggregates

    // NEW: Process playlistAggregates and add to userTasteProfile
    if (playlistAggregates && playlistAggregates.length > 0) {
      // console.log(
      //   `[Server Action] Found ${playlistAggregates.length} aggregate records for user ${userId}. Processing artists_json...`
      // );
      const playlistAggregateArtistIds = new Set<string>();
      for (const aggregate of playlistAggregates) {
        if (aggregate.artists_json && Array.isArray(aggregate.artists_json)) {
          for (const artist of aggregate.artists_json) {
            if (artist && typeof artist.spotify_artist_id === 'string') {
              playlistAggregateArtistIds.add(artist.spotify_artist_id);
            }
          }
        }
      }
      // console.log(
      //   `[Server Action] Found ${playlistAggregateArtistIds.size} unique artists in playlist aggregates.`
      // );

      // const initialProfileSize = userTasteProfile.size;
      // for (const artistId of playlistAggregateArtistIds) {
      //   userTasteProfile.add(artistId);
      // }
      // const artistsAddedFromAggregates = userTasteProfile.size - initialProfileSize;

      // console.log(
      //   `[Server Action] Added ${artistsAddedFromAggregates} new unique artists from playlist aggregates to the taste profile.`
      // );
      // console.log(
      //   `[Server Action] User taste profile total size after merging aggregate artists: ${userTasteProfile.size}`
      // );
    } else if (!aggregatesError) {
      // Only log if there wasn't an error already logged
      console.log(`[Server Action] No playlist aggregate artist data found for user ${userId}.`);
    }
    // End of new code block for processing playlistAggregates

    if (userTasteProfile.size === 0) {
      return [];
    }

    // 1c. Fetch candidate playlists (from playlists, excluding user's own)
    const candidatePlaylists: PlaylistWithTaste[] = await getCandidatePlaylists(supabase, userId);

    if (candidatePlaylists.length === 0) {
      console.log('[Server Action] No candidate playlists found.');
      return [];
    }

    // 1d. For each candidate playlist, fetch its tracks and aggregate unique artist Spotify IDs.
    // 1e. Calculate Jaccard Index.
    const matchedPlaylists: PlaylistWithTaste[] = [];

    for (const playlist of candidatePlaylists) {
      // IMPORTANT: The Playlist type from '@/types/spotify' needs to have an 'id' field
      // that corresponds to the primary key of your 'playlists' table (e.g., a UUID).
      // If it only has spotify_id (or similar), you'll need to ensure the internal DB ID is fetched
      // and available on the playlist object here.
      // Assuming playlist.id is the internal database ID.
      if (!playlist.id) {
        console.warn(
          `[Server Action] Playlist ${playlist.name || 'Unknown'} is missing an internal ID. Skipping.`
        );
        continue;
      }

      const playlistArtistSet = await getPlaylistArtistIds(supabase, playlist.id);
      playlist.tasteProfile = playlistArtistSet;
      // Ensure calculateJaccardIndex is ready to be used.
      // It might not be implemented yet if '@/lib/taste-comparison' is still a placeholder.
      playlist.similarityScore = calculateJaccardIndex(userTasteProfile, playlistArtistSet);

      if (playlist.similarityScore >= SIMILARITY_THRESHOLD) {
        matchedPlaylists.push(playlist);
      }
    }

    // 1f. Filter playlists by a similarity threshold and sort them by score.
    // Filtering is done above. Now sort.
    matchedPlaylists.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));

    // 1g. Return the final list of Playlist objects.
    // Need to strip tasteProfile and similarityScore if Playlist type doesn't include them.
    // For now, assuming Playlist type is flexible or we'll map it.
    return matchedPlaylists as Playlist[]; // Casting for now, ensure types match
  } catch (error) {
    console.error('[Server Action] Unexpected error in getTasteMatchedPlaylistsAction:', error);
    // AC9: Robust error handling
    // Depending on desired behavior, could throw error or return empty array
    return []; // Return empty on error as per AC8 behavior
  }
}
