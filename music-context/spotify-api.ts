import { SpotifyApiTrackFull, Playlist } from '../types/spotify';
import { getValidSpotifyToken } from './user-session'; // Import for token refresh

// Generic Spotify API Call Helper
export const makeSpotifyApiCall = async <T = unknown>(
  token: string,
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  isRetry: boolean = false // Added to prevent infinite refresh loops
): Promise<T> => {
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

// Helper interface for the structure of items from /playlists/{id}/tracks
interface SpotifyPlaylistTrackItem {
  track: SpotifyApiTrackFull | null; // Track can be null if it's unavailable but still in playlist
  is_local: boolean;
}

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
  const validTrackIndex = Math.max(0, Math.floor(trackIndex || 0));
  const initialPlayBody = {
    context_uri: contextUri,
    offset: { position: validTrackIndex },
  };

  try {
    await makeSpotifyApiCall(
      token,
      `/me/player/play?device_id=${deviceId}`,
      'PUT',
      initialPlayBody
    );
    console.log(
      `[playPlaylistAPI] Successfully started playlist "${playlist.name}" (ID: ${playlist.spotify_id}) at index ${validTrackIndex}.`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage &&
      errorMessage.includes('Spotify API Error (403)') &&
      errorMessage.includes('Restriction violated')
    ) {
      console.warn(
        `[playPlaylistAPI] Initial attempt for playlist "${playlist.name}" (ID: ${playlist.spotify_id}) at index ${validTrackIndex} failed due to restriction. Attempting fallback...`
      );

      try {
        const tracksResponse = await makeSpotifyApiCall<{ items: SpotifyPlaylistTrackItem[] }>(
          token,
          `/playlists/${playlist.spotify_id}/tracks?fields=items(track(id,uri,name,type,is_playable,restrictions),is_local)&limit=50&offset=${validTrackIndex}&market=from_token`,
          'GET'
        );

        const evaluatedTracksDetails: Array<{
          name: string | undefined;
          uri: string | undefined;
          is_playable: boolean | undefined;
          restrictions: SpotifyApiTrackFull['restrictions'];
          reasonSkipped: string;
        }> = [];

        if (tracksResponse && tracksResponse.items) {
          for (const item of tracksResponse.items) {
            let reasonSkippedInitialCheck = 'Unknown reason';

            if (item.is_local || !item.track || item.track.type !== 'track') {
              reasonSkippedInitialCheck = 'Non-track, local, or null track item';
              evaluatedTracksDetails.push({
                name: item.track?.name,
                uri: item.track?.uri,
                is_playable: item.track?.is_playable,
                restrictions: item.track?.restrictions,
                reasonSkipped: reasonSkippedInitialCheck,
              });
              console.log(
                `[playPlaylistAPI] Fallback: Skipping (initial check) - ${reasonSkippedInitialCheck}: URI ${item.track?.uri || 'N/A'}, Name: ${item.track?.name || 'N/A'}`
              );
              continue;
            }

            const currentTrack = item.track;
            console.log(
              `[playPlaylistAPI] Fallback: Evaluating track URI: ${currentTrack.uri}, Name: "${currentTrack.name}", is_playable: ${currentTrack.is_playable}, restrictions: ${JSON.stringify(currentTrack.restrictions)}`
            );

            let passesInitialFilter = true;
            let filterSkipReason = 'Passed initial playability filter';

            if (currentTrack.is_playable === false) {
              passesInitialFilter = false;
              filterSkipReason = 'Track explicitly marked as not playable (is_playable: false)';
            } else if (
              currentTrack.restrictions &&
              (currentTrack.restrictions.reason === 'market' ||
                currentTrack.restrictions.reason === 'product' ||
                currentTrack.restrictions.reason === 'payment_required')
            ) {
              passesInitialFilter = false;
              filterSkipReason = `Track has prohibitive restrictions (reason: ${currentTrack.restrictions.reason})`;
            }

            if (!passesInitialFilter) {
              evaluatedTracksDetails.push({
                name: currentTrack.name,
                uri: currentTrack.uri,
                is_playable: currentTrack.is_playable,
                restrictions: currentTrack.restrictions,
                reasonSkipped: filterSkipReason,
              });
              console.log(
                `[playPlaylistAPI] Fallback: -> Skipping track "${currentTrack.name}" after initial filter. Reason: ${filterSkipReason}`
              );
              continue;
            }

            // If we reach here, the track is a candidate. Attempt to play it directly to confirm it is truly playable.
            console.log(
              `[playPlaylistAPI] Fallback: -> Candidate track URI: ${currentTrack.uri}, Name: "${currentTrack.name}". Attempting direct play test...`
            );
            try {
              // Perform a silent play test (optional, could be removed if causing issues or if next step is enough)
              // For a true test, one might need to briefly play and pause, or just trust the next call.
              // Let's assume for now the next call is the primary goal.

              // Now, try to play it using the original context_uri but with the new offset
              const actualTrackIndexInPlaylist =
                validTrackIndex + tracksResponse.items.indexOf(item);
              // indexOf(item) should give the index of the current item in the tracksResponse.items array.

              console.log(
                `[playPlaylistAPI] Fallback: Candidate "${currentTrack.name}" seems viable. Attempting to play original playlist context at new index: ${actualTrackIndexInPlaylist}.`
              );
              await makeSpotifyApiCall(token, `/me/player/play?device_id=${deviceId}`, 'PUT', {
                context_uri: contextUri,
                offset: { position: actualTrackIndexInPlaylist },
              });
              console.log(
                `[playPlaylistAPI] Successfully started playlist "${playlist.name}" (ID: ${playlist.spotify_id}) with fallback using context_uri at index ${actualTrackIndexInPlaylist} (Track: "${currentTrack.name}")`
              );
              return; // SUCCESS!
            } catch (contextPlayError: unknown) {
              const contextPlayErrorMessage =
                contextPlayError instanceof Error
                  ? contextPlayError.message
                  : String(contextPlayError);
              let reasonForThisAttemptFailure = `Context play attempt for ${currentTrack.uri} at index ${validTrackIndex + tracksResponse.items.indexOf(item)} failed: ${contextPlayErrorMessage}`;

              if (
                contextPlayErrorMessage.includes('Spotify API Error (403)') &&
                contextPlayErrorMessage.includes('Restriction violated')
              ) {
                reasonForThisAttemptFailure = `Context play attempt for ${currentTrack.uri} (at index ${validTrackIndex + tracksResponse.items.indexOf(item)}) failed with 403 Restriction Violated.`;
                console.warn(
                  `[playPlaylistAPI] Fallback: Context play for track URI ${currentTrack.uri} ("${currentTrack.name}") at new index failed with 403. Trying next track. Error: ${contextPlayErrorMessage}`
                );
              } else {
                console.error(
                  `[playPlaylistAPI] Fallback: Context play for track URI ${currentTrack.uri} ("${currentTrack.name}") at new index failed with non-403 error. Trying next track. Error: ${contextPlayErrorMessage}`
                );
              }
              evaluatedTracksDetails.push({
                name: currentTrack.name,
                uri: currentTrack.uri,
                is_playable: currentTrack.is_playable,
                restrictions: currentTrack.restrictions,
                reasonSkipped: reasonForThisAttemptFailure,
              });
              // Continue to the next track in the loop
            }
          }
        }

        // If loop completes without returning, no track was successfully played
        console.error(
          `[playPlaylistAPI] Fallback failed for playlist "${playlist.name}" (ID: ${playlist.spotify_id}). No playable tracks found after trying all candidates with context. Details of evaluated tracks (up to 50):`,
          JSON.stringify(evaluatedTracksDetails, null, 2)
        );
        const noPlayableMsg = `Failed to play playlist "${playlist.name}" (ID: ${playlist.spotify_id}). No playable tracks found starting from index ${validTrackIndex} after initial restriction. See console for details on evaluated tracks.`;
        throw new Error(noPlayableMsg);
      } catch (fallbackError: unknown) {
        console.error(
          `[playPlaylistAPI] Error during fallback attempt for playlist "${playlist.name}" (ID: ${playlist.spotify_id}):`,
          fallbackError
        );
        // Re-throw the original error, as the fallback also failed.
        // Or, you could throw fallbackError if it's more informative.
        throw error;
      }
    } else {
      // Not the specific 403 restriction error, or some other error in the initial attempt
      console.error(
        `[playPlaylistAPI] Error starting playlist "${playlist.name}" (ID: ${playlist.spotify_id}):`,
        error
      );
      throw error;
    }
  }
};
