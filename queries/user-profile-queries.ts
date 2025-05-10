import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches the top artist Spotify IDs for a given user.
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user.
 * @returns A Promise that resolves to a Set of artist Spotify IDs.
 */
export async function getUserTopArtistIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  console.log(`[user-profile-queries] Fetching top artists for user ID: ${userId}`);
  const { data: topArtistsData, error: topArtistsError } = await supabase
    .from('user_top_artists')
    .select('artist_spotify_id')
    .eq('user_id', userId);

  if (topArtistsError) {
    console.error('[user-profile-queries] Error fetching user top artists:', topArtistsError);
    // Depending on desired error handling, could throw or return empty set
    return new Set();
  }

  if (!topArtistsData) {
    console.log('[user-profile-queries] No top artists data found for user.');
    return new Set();
  }

  const artistIds = new Set(
    topArtistsData.map((artist) => artist.artist_spotify_id).filter((id) => !!id) as string[]
  );
  console.log(`[user-profile-queries] Found ${artistIds.size} top artist IDs for user.`);
  return artistIds;
}
