import { SpotifyApiTrackFull, Playlist } from '../types/spotify';
import { getValidSpotifyToken } from './user-session'; // Import for token refresh

// Generic Spotify API Call Helper
export const makeSpotifyApiCall = async (
  token: string,
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  isRetry: boolean = false // Added to prevent infinite refresh loops
): Promise<unknown> => {
  if (!token && !isRetry) {
    // Allow retry even if initial token was null, getValidSpotifyToken will handle it
    // If it's a retry and token is still null, getValidSpotifyToken would have been called by the first attempt
    // and failed, so we shouldn't proceed further if we are in a retry and no token was obtained.
    console.warn(
      `[Spotify API] No token for ${method} ${endpoint}, attempting to get a valid token.`
    );
    const newToken = await getValidSpotifyToken();
    if (!newToken) {
      throw new Error('Spotify token not available and refresh failed before API call.');
    }
    // Call self with the new token, marking it as a retry so it doesn't try to refresh again if this also fails.
    return makeSpotifyApiCall(newToken, endpoint, method, body, true);
  }
  if (!token && isRetry) {
    // This means the first attempt (which called getValidSpotifyToken) failed to get a token.
    throw new Error('Spotify token not available after refresh attempt for API call.');
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
      const newToken = await getValidSpotifyToken(); // This will attempt to call our API endpoint
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
    return null;
  }

  const contentType = response.headers.get('Content-Type');
  const contentLengthHeader = response.headers.get('content-length');

  if (contentType && contentType.includes('application/json')) {
    if (contentLengthHeader === '0') {
      console.warn(
        `Spotify API: Endpoint ${endpoint} (status ${response.status}) declared Content-Type: application/json but Content-Length: 0. Treating as empty response.`
      );
      return null;
    }
    try {
      return await response.json();
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
    return null;
  }

  if (method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    const textBody = await response.text();
    console.warn(
      `Spotify API: Successful ${method} to ${endpoint} (status ${response.status}) ` +
        `returned non-JSON, non-empty content (Content-Type: ${contentType || 'N/A'}, Body: "${textBody.substring(0, 50)}..."). ` +
        `This might be unexpected. For now, treating as success with no parseable body and returning null.`
    );
    return null;
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
    const trackData = await makeSpotifyApiCall(token, `/tracks/${trackId}?market=from_token`);
    return trackData as SpotifyApiTrackFull;
  } catch (err) {
    console.error(`[fetchSpotifyTrack API] Error fetching track ${trackId}:`, err);
    // Re-throw or handle more gracefully, for now, let context handle UI error
    throw err;
  }
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
  playlistId: string,
  userSpotifyId: string
): Promise<boolean | null> => {
  if (!token || !playlistId || !userSpotifyId) {
    return null;
  }
  try {
    const result = (await makeSpotifyApiCall(
      token,
      `/playlists/${playlistId}/followers/contains?ids=${userSpotifyId}`
    )) as boolean[];
    if (Array.isArray(result) && typeof result[0] === 'boolean') {
      return result[0];
    }
    console.warn('[checkIfPlaylistIsFollowedAPI] Unexpected response format:', result);
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

// --- Player Control API Call Methods ---

export const toggleShuffleAPI = async (
  token: string,
  deviceId: string,
  shuffleState: boolean
): Promise<void> => {
  if (!token || !deviceId) {
    throw new Error('Token or Device ID missing for toggleShuffleAPI');
  }
  try {
    await makeSpotifyApiCall(
      token,
      `/me/player/shuffle?state=${shuffleState}&device_id=${deviceId}`,
      'PUT'
    );
  } catch (err) {
    console.error('[toggleShuffleAPI] Error setting shuffle state:', err);
    throw err;
  }
};

export const playPlaylistAPI = async (
  token: string,
  deviceId: string,
  playlist: Playlist,
  trackIndex: number = 0
): Promise<void> => {
  if (!token || !deviceId || !playlist || !playlist.spotify_id) {
    throw new Error('Missing required parameters for playPlaylistAPI');
  }

  const contextUri = `spotify:playlist:${playlist.spotify_id}`;
  const body: { context_uri: string; offset?: { position: number } } = {
    context_uri: contextUri,
  };

  const validTrackIndex = Math.max(0, Math.floor(trackIndex || 0));
  if (validTrackIndex >= 0) {
    body.offset = { position: validTrackIndex };
  }

  try {
    await makeSpotifyApiCall(token, `/me/player/play?device_id=${deviceId}`, 'PUT', body);
  } catch (err) {
    // Specific error handling for 403 can be done here or re-thrown for context
    console.error('[playPlaylistAPI] Error starting playlist:', err);
    throw err;
  }
};
