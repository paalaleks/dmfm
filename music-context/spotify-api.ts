import { SpotifyApiTrackFull } from '../types/spotify';
import { getSpotifyToken } from './token-manager'; // Import from token-manager instead

// Constants for network retry logic
const MAX_NETWORK_RETRIES = 2; // Retry up to 2 additional times (3 total attempts)
const NETWORK_RETRY_DELAY_MS = 1000; // Delay between retries in milliseconds

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * The original array is modified.
 *
 * @param array The array to shuffle.
 * @returns The same array, shuffled.
 * @template T The type of elements in the array.
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  let currentIndex = array.length;
  let randomIndex: number;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
};

// Generic Spotify API Call Helper
export const makeSpotifyApiCall = async <T = unknown>(
  token: string,
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  isRetry: boolean = false // Added to prevent infinite refresh loops
): Promise<T> => {
  if (!token && !isRetry) {
    // Allow retry even if initial token was null, getSpotifyToken will handle it
    // If it's a retry and token is still null, getSpotifyToken would have been called by the first attempt
    // and failed, so we shouldn't proceed further if we are in a retry and no token was obtained.
    console.warn(
      `[Spotify API] No token for ${method} ${endpoint}, attempting to get a valid token.`
    );
    const newToken = await getSpotifyToken();
    if (!newToken) {
      throw new Error('Spotify token not available and refresh failed before API call.');
    }
    // Call self with the new token, marking it as a retry so it doesn't try to refresh again if this also fails.
    return makeSpotifyApiCall(newToken, endpoint, method, body, true);
  }
  if (!token && isRetry) {
    // This means the first attempt (which called getSpotifyToken) failed to get a token.
    throw new Error('Spotify token not available after refresh attempt for API call.');
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    headers['Content-Type'] = 'application/json';
  }

  let response!: Response; // Definite assignment assertion, as loop will either assign or throw
  let lastNetworkError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_NETWORK_RETRIES; attempt++) {
    try {
      response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      lastNetworkError = null; // Clear error on successful fetch attempt
      break; // Exit loop if fetch was successful (i.e., did not throw a network error)
    } catch (e) {
      if (e instanceof TypeError && e.message.toLowerCase().includes('failed to fetch')) {
        lastNetworkError = e;
        console.warn(
          `[Spotify API] Network error ("Failed to fetch") on attempt ${attempt + 1} of ${MAX_NETWORK_RETRIES + 1} for ${method} ${endpoint}. Retrying in ${NETWORK_RETRY_DELAY_MS / 1000}s...`
        );
        if (attempt < MAX_NETWORK_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_DELAY_MS));
        } else {
          console.error(
            `[Spotify API] Network error ("Failed to fetch") for ${method} ${endpoint} after ${MAX_NETWORK_RETRIES + 1} attempts. Final error: ${e.message}`
          );
          throw e; // Re-throw the last "Failed to fetch" error after all retries
        }
      } else {
        // Different error type (not "Failed to fetch" TypeError), re-throw immediately
        console.error(`[Spotify API] Non-network error during fetch for ${method} ${endpoint}:`, e);
        throw e;
      }
    }
  }

  if (!response) {
    // This case should ideally not be reached if the loop logic is correct (either assigns response or throws)
    // but serves as a fallback.
    throw (
      lastNetworkError ||
      new Error(
        `[Spotify API] Fetch failed for ${method} ${endpoint} after retries without a valid response object.`
      )
    );
  }

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text(); // Read error body first
    } catch {
      /* ignore if reading body fails */
    }

    if (response.status === 401 && !isRetry) {
      console.warn(
        `[Spotify API] Received 401 for ${method} ${endpoint}. Attempting token refresh and retry.`
      );
      const newToken = await getSpotifyToken(); // This will attempt to call our API endpoint
      if (newToken) {
        console.log(`[Spotify API] Token refreshed successfully. Retrying ${method} ${endpoint}.`);
        return makeSpotifyApiCall(newToken, endpoint, method, body, true); // Pass true for isRetry
      } else {
        console.error(
          `[Spotify API] Token refresh failed after 401. Cannot retry ${method} ${endpoint}.`
        );
        // Throw an error that includes the original 401 and the refresh failure context
        throw new Error(
          `Spotify API Error (401 - Unauthenticated) for ${method} ${endpoint} and subsequent token refresh failed. Original Body: ${errorBody.substring(0, 500)}`
        );
      }
    }
    // For non-401 errors, or for 401s on a retry, throw the original error
    throw new Error(
      `Spotify API Error (${response.status}) for ${method} ${endpoint}: ${response.statusText}. Body: ${errorBody.substring(0, 500)}`
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('Content-Type');
  const contentLengthHeader = response.headers.get('content-length');

  if (contentType && contentType.includes('application/json')) {
    if (contentLengthHeader === '0') {
      console.warn(
        `Spotify API: Endpoint ${endpoint} (status ${response.status}) declared Content-Type: application/json but Content-Length: 0. Treating as empty response.`
      );
      return null as T;
    }
    try {
      return (await response.json()) as T;
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error(
        `Spotify API Error: Failed to parse JSON response from ${method} ${endpoint} (status ${response.status}, Content-Type: ${contentType}). Error: ${errorMessage}`
      );
      throw new Error(
        `Spotify API Error: Malformed JSON response from ${method} ${endpoint} (status ${response.status}, Content-Type: ${contentType}). Original error: ${errorMessage}`
      );
    }
  }

  if (contentLengthHeader === '0') {
    return null as T;
  }

  if (method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    const textBody = await response.text();
    console.warn(
      `Spotify API: Successful ${method} to ${endpoint} (status ${response.status}) ` +
        `returned non-JSON, non-empty content (Content-Type: ${contentType || 'N/A'}, Body: "${textBody.substring(0, 50)}..."). ` +
        `This might be unexpected. For now, treating as success with no parseable body and returning null.`
    );
    return null as T;
  }

  const responseText = await response.text();
  throw new Error(
    `Spotify API Error: Expected JSON response from ${method} ${endpoint} (status ${response.status}), ` +
      `but received Content-Type: ${contentType || 'N/A'}. Response body: ${responseText.substring(0, 200)}`
  );
};

// Fetch a single track with market context
export const fetchSpotifyTrack = async (
  token: string,
  trackId: string
): Promise<SpotifyApiTrackFull | null> => {
  if (!token) {
    console.warn('[fetchSpotifyTrack API] No Spotify token available.');
    return null;
  }
  if (!trackId) {
    console.warn('[fetchSpotifyTrack API] No trackId provided.');
    return null;
  }

  try {
    // The generic type for makeSpotifyApiCall here is unknown by default,
    // but we expect SpotifyApiTrackFull or something compatible.
    const trackData = await makeSpotifyApiCall<SpotifyApiTrackFull>(
      token,
      `/tracks/${trackId}?market=from_token`
    );
    return trackData; // No need to cast if makeSpotifyApiCall is correctly typed for this call
  } catch (err) {
    console.error(`[fetchSpotifyTrack API] Error fetching track ${trackId}:`, err);
    // Re-throw or handle more gracefully, for now, let context handle UI error
    throw err;
  }
};

// Interface for the paginated response from Spotify's get playlist tracks endpoint
interface SpotifyPlaylistTracksPage {
  items: {
    track: SpotifyApiTrackFull | null; // Track can be null if unavailable, e.g. deleted
    // is_local is a property of the track object itself if requested in fields
  }[];
  next: string | null;
  total: number;
  limit: number;
  offset: number;
  // href?: string; // The request URL for this page
  // previous?: string | null; // URL for the previous page
}

/**
 * Fetches all playable tracks from a given Spotify playlist, handling pagination and relinking.
 *
 * @param token Spotify API access token.
 * @param playlistId The ID of the Spotify playlist.
 * @returns A promise that resolves to an array of SpotifyApiTrackFull objects.
 * @throws Throws an error if the playlist ID is not provided or if API calls fail.
 */
export const fetchAllPlayablePlaylistTracksAPI = async (
  token: string,
  playlistId: string
): Promise<SpotifyApiTrackFull[]> => {
  // Token presence is primarily handled by makeSpotifyApiCall, but initial check can be useful.
  // For this function, we assume token is provided, and makeSpotifyApiCall will attempt refresh if needed.
  if (!playlistId) {
    const errMsg = '[fetchAllPlayablePlaylistTracksAPI] Playlist ID is required.';
    console.error(errMsg);
    throw new Error(errMsg);
  }

  const playableTracks: SpotifyApiTrackFull[] = [];
  const limit = 50; // Max limit for this endpoint usually 50, sometimes 100. Let's use 50.

  // DR12.1.1: Ensure all necessary track data (including linked_from, is_playable, is_local, uri, type, restrictions, available_markets) is fetched efficiently.
  // Added artists, album basic details, and duration_ms as they are part of SpotifyApiTrackFull and generally useful.
  // is_local is a field *on the track object*, so it needs to be requested within track().
  const fields =
    'items(track(id,uri,name,type,is_playable,is_local,linked_from(id,type,uri),artists(name,id),album(name,id,images),duration_ms,restrictions,available_markets)),next,total,limit,offset';

  let currentPageUrl: string | null =
    `/playlists/${playlistId}/tracks?limit=${limit}&offset=0&market=from_token&fields=${encodeURIComponent(fields)}`;

  while (currentPageUrl) {
    try {
      // makeSpotifyApiCall expects the endpoint path without the domain, e.g., "/playlists/..."
      const pageData: SpotifyPlaylistTracksPage | null =
        await makeSpotifyApiCall<SpotifyPlaylistTracksPage>(token, currentPageUrl);

      if (!pageData || !pageData.items) {
        console.warn(
          `[fetchAllPlayablePlaylistTracksAPI] Received no items or invalid page data from ${currentPageUrl}. Assuming end of playlist.`
        );
        break;
      }

      for (const item of pageData.items) {
        const track = item.track;

        // DR12.1.1: Skip if track is null, not a track type, or is local
        if (!track) {
          // console.debug('[fetchAllPlayablePlaylistTracksAPI] Skipping null track item.');
          continue;
        }
        if (track.type !== 'track') {
          // console.debug(`[fetchAllPlayablePlaylistTracksAPI] Skipping item of type '${track.type}': ${track.name || track.id}`);
          continue;
        }
        if (track.is_local) {
          // console.debug(`[fetchAllPlayablePlaylistTracksAPI] Skipping local track: ${track.name || track.id}`);
          continue;
        }

        // DR12.1.1: Check playability and relink if necessary
        if (track.is_playable) {
          playableTracks.push(track);
        } else if (track.linked_from?.id && track.linked_from.type === 'track') {
          // console.log(`[fetchAllPlayablePlaylistTracksAPI] Track '${track.name}' (ID: ${track.id}) is not playable, attempting relink from ${track.linked_from.id}`);
          try {
            const relinkedTrack = await fetchSpotifyTrack(token, track.linked_from.id);
            if (
              relinkedTrack &&
              relinkedTrack.is_playable &&
              relinkedTrack.type === 'track' &&
              !relinkedTrack.is_local
            ) {
              // console.log(`[fetchAllPlayablePlaylistTracksAPI] Successfully relinked to playable track '${relinkedTrack.name}' (ID: ${relinkedTrack.id})`);
              playableTracks.push(relinkedTrack);
            } else {
              // console.log(`[fetchAllPlayablePlaylistTracksAPI] Relinked track ${track.linked_from.id} for '${track.name}' is also not playable, is local, or not a track.`);
            }
          } catch (relinkError) {
            console.warn(
              `[fetchAllPlayablePlaylistTracksAPI] Error fetching relinked track ${track.linked_from.id} for '${track.name}':`,
              relinkError instanceof Error ? relinkError.message : relinkError
            );
            // Continue to the next track, don't let a failed relink stop the whole process for other tracks.
          }
        } else {
          // console.debug(`[fetchAllPlayablePlaylistTracksAPI] Track '${track.name}' (ID: ${track.id}) is not playable and has no valid linked_from information.`);
        }
      }

      // Prepare for the next page
      if (pageData.next) {
        const spotifyApiBase = 'https://api.spotify.com/v1';
        if (pageData.next.startsWith(spotifyApiBase)) {
          currentPageUrl = pageData.next.substring(spotifyApiBase.length);
        } else {
          console.warn(
            `[fetchAllPlayablePlaylistTracksAPI] Unexpected 'next' URL format: ${pageData.next}. Ending pagination.`
          );
          currentPageUrl = null;
        }
      } else {
        currentPageUrl = null; // No more pages
      }
    } catch (error) {
      console.error(
        `[fetchAllPlayablePlaylistTracksAPI] Error fetching playlist tracks page for playlist ${playlistId} (URL: ${currentPageUrl}):`,
        error instanceof Error ? error.message : error
      );
      // Re-throw the error to be handled by the calling context, as per error propagation strategy.
      throw error;
    }
  }

  return playableTracks;
};

// --- Save/Follow API Call Methods ---

export const checkIfTrackIsSavedAPI = async (
  token: string,
  trackId: string
): Promise<boolean | null> => {
  if (!token || !trackId) {
    return null;
  }
  try {
    const result = (await makeSpotifyApiCall(
      token,
      `/me/tracks/contains?ids=${trackId}`
    )) as boolean[];
    if (Array.isArray(result) && typeof result[0] === 'boolean') {
      return result[0];
    }
    console.warn('[checkIfTrackIsSavedAPI] Unexpected response format:', result);
    return null;
  } catch (err) {
    console.error('[checkIfTrackIsSavedAPI] Error:', err);
    throw err; // Re-throw for the context to handle UI feedback
  }
};

export const saveTrackAPI = async (token: string, trackId: string): Promise<void> => {
  if (!token || !trackId) {
    throw new Error('Token or Track ID missing for saveTrackAPI');
  }
  try {
    await makeSpotifyApiCall(token, `/me/tracks?ids=${trackId}`, 'PUT');
  } catch (err) {
    console.error('[saveTrackAPI] Error saving track:', err);
    throw err;
  }
};

export const unsaveTrackAPI = async (token: string, trackId: string): Promise<void> => {
  if (!token || !trackId) {
    throw new Error('Token or Track ID missing for unsaveTrackAPI');
  }
  try {
    await makeSpotifyApiCall(token, `/me/tracks?ids=${trackId}`, 'DELETE');
  } catch (err) {
    console.error('[unsaveTrackAPI] Error unsaving track:', err);
    throw err;
  }
};

export const checkIfPlaylistIsFollowedAPI = async (
  token: string,
  playlistId: string
): Promise<boolean | null> => {
  if (!token || !playlistId) {
    console.warn('[Spotify API] Missing token or playlistId for checkIfPlaylistIsFollowedAPI');
    return null;
  }
  try {
    const result = (await makeSpotifyApiCall(
      token,
      `/playlists/${playlistId}/followers/contains`
    )) as boolean[];
    if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'boolean') {
      return result[0];
    }
    console.warn(
      '[checkIfPlaylistIsFollowedAPI] Unexpected response format or empty array:',
      result
    );
    return null;
  } catch (err) {
    console.error('[checkIfPlaylistIsFollowedAPI] Error:', err);
    throw err;
  }
};

export const followPlaylistAPI = async (token: string, playlistId: string): Promise<void> => {
  if (!token || !playlistId) {
    throw new Error('Token or Playlist ID missing for followPlaylistAPI');
  }
  try {
    await makeSpotifyApiCall(token, `/playlists/${playlistId}/followers`, 'PUT');
  } catch (err) {
    console.error('[followPlaylistAPI] Error following playlist:', err);
    throw err;
  }
};

export const unfollowPlaylistAPI = async (token: string, playlistId: string): Promise<void> => {
  if (!token || !playlistId) {
    throw new Error('Token or Playlist ID missing for unfollowPlaylistAPI');
  }
  try {
    await makeSpotifyApiCall(token, `/playlists/${playlistId}/followers`, 'DELETE');
  } catch (err) {
    console.error('[unfollowPlaylistAPI] Error unfollowing playlist:', err);
    throw err;
  }
};

/**
 * Plays a Spotify playlist with a custom shuffle order.
 * Fetches all playable tracks, shuffles them, turns off Spotify's native shuffle,
 * and then starts playback of the custom queue.
 *
 * @param token Spotify API access token.
 * @param deviceId The ID of the device to play on.
 * @param playlistId The ID of the Spotify playlist.
 * @returns A promise that resolves when playback is successfully initiated.
 * @throws Throws an error if no playable tracks are found or if any API call fails.
 */
export const playPlaylistWithCustomShuffleAPI = async (
  token: string,
  deviceId: string,
  playlistId: string
): Promise<void> => {
  if (!token || !deviceId || !playlistId) {
    const errMsg =
      '[playPlaylistWithCustomShuffleAPI] Token, Device ID, and Playlist ID are required.';
    console.error(errMsg);
    throw new Error(errMsg);
  }

  // console.log(
  //   `[playPlaylistWithCustomShuffleAPI] Starting custom shuffle for playlist ${playlistId} on device ${deviceId}`
  // );

  // 1. Fetch all playable tracks
  const playableTracks = await fetchAllPlayablePlaylistTracksAPI(token, playlistId);

  // 2. Handle no playable tracks (AC5)
  if (!playableTracks || playableTracks.length === 0) {
    const errMsg = `[playPlaylistWithCustomShuffleAPI] No playable tracks found in playlist ${playlistId}. Cannot start custom shuffle.`;
    console.warn(errMsg);
    // This error will be caught by MusicContext and shown as a toast
    throw new Error(`No playable tracks found in playlist ${playlistId}.`);
  }
  // console.log(`[playPlaylistWithCustomShuffleAPI] Found ${playableTracks.length} playable tracks.`);

  // 3. Extract URIs
  const trackUris = playableTracks.map((track) => track.uri);

  // 4. Shuffle URIs - Use a copy by spreading into a new array before shuffling
  const shuffledTrackUris = shuffleArray([...trackUris]);

  // 5. Turn off Spotify's native shuffle (DR12.1.3, AC3)
  // console.log(
  //   `[playPlaylistWithCustomShuffleAPI] Turning off Spotify native shuffle for device ${deviceId}.`
  // );

  // If toggleShuffleAPI fails critically, makeSpotifyApiCall within it will throw,
  // and the error will propagate, stopping execution before playing the custom queue.

  // 6. Play the shuffled URIs (DR12.1.3, AC3)
  const playBody = {
    uris: shuffledTrackUris,
  };

  // console.log(
  //   `[playPlaylistWithCustomShuffleAPI] Attempting to play ${shuffledTrackUris.length} shuffled tracks on device ${deviceId}.`
  // );

  // The main try/catch for this function is implicitly handled by the caller in MusicContext
  // if individual API calls like fetchAllPlayablePlaylistTracksAPI or toggleShuffleAPI throw.
  // Explicit try/catch for the final play call for clarity or specific error message if needed.
  try {
    await makeSpotifyApiCall(token, `/me/player/play?device_id=${deviceId}`, 'PUT', playBody);
    // console.log(
    //   `[playPlaylistWithCustomShuffleAPI] Successfully initiated playback of custom shuffled playlist ${playlistId} on device ${deviceId}.`
    // );
  } catch (playError) {
    console.error(
      `[playPlaylistWithCustomShuffleAPI] Error initiating playback of custom shuffled playlist ${playlistId}:`,
      playError
    );
    // Re-throw for MusicContext to handle and potentially show a toast
    throw playError;
  }
};
