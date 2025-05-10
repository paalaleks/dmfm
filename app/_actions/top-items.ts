import { SpotifyApi, type AccessToken } from '@spotify/web-api-ts-sdk';
import type { Database } from '@/types/database'; // Import generated DB types
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'; // For server-side Supabase client
import type { ActionResult } from '@/types/actions'; // Standardized ActionResult
import { User } from '@supabase/supabase-js';
// Define DB table row types locally for convenience
type UserTopArtistInsert = Database['public']['Tables']['user_top_artists']['Insert'];
type UserTopTrackInsert = Database['public']['Tables']['user_top_tracks']['Insert'];

// Type for the data part of a successful result
interface TopItemsResultData {
  artistsUpserted: number;
  tracksUpserted: number;
}

export async function fetchAndStoreUserTopItems(
  user: User
): Promise<ActionResult<TopItemsResultData | null>> {
  const supabase = await createSupabaseServerClient();

  if (!user) {
    console.error('[Server Action] User not authenticated.');
    return { success: false, error: 'User not authenticated.' };
  }

  const userId = user.id;

  // Correctly access provider tokens and expiry from user_metadata, handling potential nulls
  const spotifyProviderTokenFromMeta = user.user_metadata?.provider_token;
  const spotifyProviderToken =
    spotifyProviderTokenFromMeta === null
      ? undefined
      : (spotifyProviderTokenFromMeta as string | undefined);

  const spotifyProviderRefreshTokenFromMeta = user.user_metadata?.provider_refresh_token;
  const spotifyProviderRefreshToken =
    spotifyProviderRefreshTokenFromMeta === null
      ? undefined
      : (spotifyProviderRefreshTokenFromMeta as string | undefined);

  const spotifyProviderTokenExpiresAtFromMeta = user.user_metadata?.provider_token_expires_at;
  const spotifyProviderTokenExpiresAt =
    spotifyProviderTokenExpiresAtFromMeta === null
      ? undefined
      : (spotifyProviderTokenExpiresAtFromMeta as number | undefined);

  if (!spotifyProviderToken) {
    console.error(
      '[Server Action] Spotify provider_token not found in user_metadata. Please re-authenticate.'
    );
    return { success: false, error: 'Spotify provider_token not found. Please re-authenticate.' };
  }

  // spotifyProviderToken is now confirmed to be a string

  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  if (!spotifyClientId) {
    console.error('[Server Action] SPOTIFY_CLIENT_ID environment variable not set.');
    return { success: false, error: 'Server configuration error: Spotify Client ID missing.' };
  }

  const tokenDetails: AccessToken = {
    access_token: spotifyProviderToken as string, // Explicitly cast after check
    token_type: 'Bearer',
    expires_in: spotifyProviderTokenExpiresAt
      ? spotifyProviderTokenExpiresAt - Math.floor(Date.now() / 1000)
      : 3600,
    refresh_token: spotifyProviderRefreshToken as string, // Correctly string | undefined
  };

  const spotify = SpotifyApi.withAccessToken(spotifyClientId, tokenDetails);

  console.log(`[Server Action] Starting fetchAndStoreUserTopItems for user: ${userId}`);

  let artistsUpsertedCount = 0;
  let tracksUpsertedCount = 0;

  try {
    // Task 4: Call topItems for artists
    console.log('[Server Action] Fetching top artists...');
    const topArtistsResponse = await spotify.currentUser.topItems('artists', 'medium_term', 50);
    console.log(`[Server Action] Fetched ${topArtistsResponse.items.length} top artists.`);

    // Task 5: Process top artists response
    if (topArtistsResponse.items.length > 0) {
      const artistsToUpsert: UserTopArtistInsert[] = topArtistsResponse.items.map((artist) => ({
        user_id: userId,
        artist_spotify_id: artist.id,
        name: artist.name,
        genres: artist.genres,
        popularity: artist.popularity,
        image_url: artist.images?.[0]?.url ?? null,
      }));

      // Task 6: Implement Supabase upsert for artists
      console.log(`[Server Action] Upserting ${artistsToUpsert.length} artists...`);
      const { error: artistsError, count } = await supabase
        .from('user_top_artists')
        .upsert(artistsToUpsert, { onConflict: 'user_id, artist_spotify_id' })
        .select();

      if (artistsError) {
        console.error('[Server Action] Error upserting artists:', artistsError.message);
        return {
          success: false,
          error: 'Failed to store top artists: ' + artistsError.message,
        };
      }
      artistsUpsertedCount = count ?? artistsToUpsert.length; // Fallback if count is null
      console.log(`[Server Action] Successfully upserted ${artistsUpsertedCount} artists.`);
    } else {
      console.log('[Server Action] No top artists found to upsert.');
    }

    // Task 7: Call topItems for tracks
    console.log('[Server Action] Fetching top tracks...');
    const topTracksResponse = await spotify.currentUser.topItems('tracks', 'medium_term', 50);
    console.log(`[Server Action] Fetched ${topTracksResponse.items.length} top tracks.`);

    // Task 8: Process top tracks response
    if (topTracksResponse.items.length > 0) {
      const tracksToUpsert: UserTopTrackInsert[] = topTracksResponse.items.map((track) => ({
        user_id: userId,
        track_spotify_id: track.id,
        name: track.name,
        artists: track.artists.map((artist) => ({
          spotify_id: artist.id,
          name: artist.name,
        })),
        album_spotify_id: track.album.id,
        album_name: track.album.name,
        album_image_url: track.album.images?.[0]?.url ?? null,
        popularity: track.popularity,
        duration_ms: track.duration_ms,
        preview_url: track.preview_url ?? null,
      }));

      // Task 9: Implement Supabase upsert for tracks
      console.log(`[Server Action] Upserting ${tracksToUpsert.length} tracks...`);
      const { error: tracksError, count: trackCountResponse } = await supabase
        .from('user_top_tracks')
        .upsert(tracksToUpsert, { onConflict: 'user_id, track_spotify_id' })
        .select();

      if (tracksError) {
        console.error('[Server Action] Error upserting tracks:', tracksError.message);
        return {
          success: false,
          error: 'Failed to store top tracks: ' + tracksError.message,
        };
      }
      tracksUpsertedCount = trackCountResponse ?? tracksToUpsert.length; // Fallback if count is null
      console.log(`[Server Action] Successfully upserted ${tracksUpsertedCount} tracks.`);
    } else {
      console.log('[Server Action] No top tracks found to upsert.');
    }

    // Task 11: Return Value
    return {
      success: true,
      data: {
        artistsUpserted: artistsUpsertedCount,
        tracksUpserted: tracksUpsertedCount,
      },
      message: `Successfully fetched and stored ${artistsUpsertedCount} artists and ${tracksUpsertedCount} tracks.`,
    };
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred while fetching/storing top items.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(
      '[Server Action] General error in fetchAndStoreUserTopItems:',
      errorMessage,
      error
    );
    return {
      success: false,
      error: errorMessage,
    };
  }
}
