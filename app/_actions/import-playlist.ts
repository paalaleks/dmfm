'use server';

import { getSpotifyAccessToken } from '@/lib/spotify-accesstoken';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

// Define a basic structure for expected Spotify Playlist object
// This can be expanded based on actual needs and Spotify API response
interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: {
    display_name?: string;
    id: string;
  };
  images: { url: string; height?: number; width?: number }[];
  tracks: {
    // This part might be fetched separately or have a summary here
    href: string;
    total: number;
  };
  // ... other fields as needed
}

// Interfaces for Spotify Tracks
interface SpotifyTrackArtist {
  id: string;
  name: string;
}

interface SpotifyAlbumImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyTrackAlbum {
  id: string;
  name: string;
  images: SpotifyAlbumImage[];
}

interface SpotifyPlaylistItem {
  track: {
    id: string;
    name: string;
    artists: SpotifyTrackArtist[];
    album: SpotifyTrackAlbum;
    duration_ms: number;
    explicit: boolean;
    preview_url: string | null;
    uri: string;
  } | null;
  added_at: string;
}

interface SpotifyPlaylistTracksResponse {
  href: string;
  items: SpotifyPlaylistItem[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

interface DbPlaylistInsert {
  spotify_playlist_id: string;
  name: string;
  description: string | null;
  owner_spotify_user_id: string;
  image_url: string | null;
  submitted_by_user_id?: string | null;
}

// For storing playlist items - REVISED for playlist_tracks table
interface DbPlaylistTrackInsert {
  playlist_id: string; // FK to our playlists.id (UUID)
  track_spotify_id: string;
  track_name: string;
  track_artists: { spotify_id: string; name: string }[] | null; // JSONB
  album_name: string | null;
  album_art_url: string | null;
  duration_ms: number | null;
  order_in_playlist: number; // 0-based index
  track_preview_url?: string | null;
  added_at: string | null; // Spotify's added_at timestamp
}

// Updated ImportPlaylistResult
export interface ImportPlaylistResult {
  success: boolean;
  status?:
    | 'created'
    | 'exists'
    | 'error_token'
    | 'error_fetching_meta'
    | 'error_fetching_tracks'
    | 'error_saving_meta'
    | 'error_saving_tracks'
    | 'error_aggregating_data'; // Added for aggregation step
  playlistIdDb?: string; // Our internal DB playlist ID
  message?: string;
  spotifyPlaylistData?: SpotifyPlaylist; // Raw from Spotify
  spotifyTracksData?: SpotifyPlaylistItem[]; // Raw from Spotify
}

// Helper function for introducing a delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function importPlaylist(playlistSpotifyId: string): Promise<ImportPlaylistResult> {
  console.log(`Attempting to import playlist: ${playlistSpotifyId}`);

  const accessToken = await getSpotifyAccessToken();
  if (!accessToken) {
    return {
      success: false,
      status: 'error_token',
      message: 'Failed to retrieve Spotify access token.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    // 1. Fetch Playlist Metadata from Spotify
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistSpotifyId}?fields=id,name,description,owner(id,display_name),images,tracks(href,total)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!playlistResponse.ok) {
      const errorBody = await playlistResponse.json().catch(() => ({}));
      return {
        success: false,
        status: 'error_fetching_meta',
        message: `Spotify API error (playlist metadata): ${playlistResponse.status} - ${errorBody?.error?.message || playlistResponse.statusText}`,
      };
    }
    const spotifyPlaylist: SpotifyPlaylist = await playlistResponse.json();
    console.log('Successfully fetched playlist data from Spotify:', spotifyPlaylist.name);

    // 2. Check for Duplicates in DB
    const { data: existingPlaylist, error: dbError } = await supabase
      .from('playlists')
      .select('id, spotify_playlist_id')
      .eq('spotify_playlist_id', spotifyPlaylist.id);

    if (dbError) {
      return {
        success: false,
        status: 'error_saving_meta',
        message: `Database error checking for existing playlist: ${dbError.message}`,
      };
    }

    if (existingPlaylist.length > 0) {
      return {
        success: true,
        status: 'exists',
        playlistIdDb: existingPlaylist[0].id,
        message: `Playlist ${spotifyPlaylist.name} already exists in the database.`,
        spotifyPlaylistData: spotifyPlaylist,
      };
    }

    // 3. Playlist does not exist, Insert Playlist Metadata into DB
    const playlistToInsert: DbPlaylistInsert = {
      spotify_playlist_id: spotifyPlaylist.id,
      name: spotifyPlaylist.name,
      description: spotifyPlaylist.description,
      owner_spotify_user_id: spotifyPlaylist.owner.id,
      image_url:
        spotifyPlaylist.images && spotifyPlaylist.images.length > 0
          ? spotifyPlaylist.images[0].url
          : null,
      submitted_by_user_id: user ? user.id : null,
    };

    const { data: newPlaylistData, error: insertMetaError } = await supabase
      .from('playlists')
      .insert(playlistToInsert)
      .select('id')
      .single();

    if (insertMetaError) {
      return {
        success: false,
        status: 'error_saving_meta',
        message: `Database error inserting playlist metadata: ${insertMetaError.message}`,
        spotifyPlaylistData: spotifyPlaylist,
      };
    }

    if (!newPlaylistData) {
      return {
        success: false,
        status: 'error_saving_meta',
        message: 'Failed to retrieve new playlist ID after metadata insert.',
        spotifyPlaylistData: spotifyPlaylist,
      };
    }
    const newDbPlaylistId = newPlaylistData.id;
    console.log(`Playlist metadata saved to DB with ID: ${newDbPlaylistId}`);

    // 4. Fetch Playlist Tracks from Spotify for the new playlist
    let allSpotifyTracks: SpotifyPlaylistItem[] = [];
    let tracksUrl: string | null = null; // Initialize as null

    // Only attempt to fetch tracks if the playlist metadata indicates tracks exist.
    if (spotifyPlaylist.tracks && spotifyPlaylist.tracks.total > 0) {
      // Always construct the initial URL for fetching tracks with the correct item-specific fields.
      // Using limit=100 for efficiency, as it's the typical maximum for this endpoint.
      tracksUrl = `https://api.spotify.com/v1/playlists/${playlistSpotifyId}/tracks?offset=0&limit=100&fields=items(added_at,track(id,name,artists(id,name),album(id,name,images),duration_ms,explicit,preview_url,uri)),next,total`;
      console.log(`[importPlaylist] Constructed initial tracksUrl: ${tracksUrl}`);
    } else {
      console.log(
        `[importPlaylist] Playlist ${spotifyPlaylist.name} has 0 tracks according to metadata. Skipping track fetch.`
      );
      // If there are no tracks, we can consider the import successful at this point with 0 tracks.
    }

    while (tracksUrl) {
      console.log(`[importPlaylist] Fetching tracks page from URL: ${tracksUrl}`);
      const tracksResponse = await fetch(tracksUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!tracksResponse.ok) {
        const errorBody = await tracksResponse.json().catch(() => ({}));
        return {
          success: true,
          status: 'error_fetching_tracks',
          playlistIdDb: newDbPlaylistId,
          message: `Playlist metadata saved (ID: ${newDbPlaylistId}), but failed to fetch a page of tracks: ${tracksResponse.status} - ${errorBody?.error?.message || tracksResponse.statusText} from URL: ${tracksUrl}`,
          spotifyPlaylistData: spotifyPlaylist,
          spotifyTracksData: allSpotifyTracks, // Tracks fetched so far
        };
      }

      let tracksPageData;
      try {
        tracksPageData = await tracksResponse.json();
        console.log(
          '[importPlaylist] Raw tracksPageData received from Spotify:',
          JSON.stringify(tracksPageData, null, 2)
        );
      } catch (jsonError: unknown) {
        const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
        console.error(
          'Error parsing JSON from Spotify tracks response:',
          errorMessage,
          tracksResponse.statusText
        );
        const responseText = await tracksResponse
          .text()
          .catch(() => 'Could not read error text during JSON parse error.');
        console.error('Response text for tracks page JSON parsing error:', responseText);
        return {
          success: true,
          status: 'error_fetching_tracks',
          playlistIdDb: newDbPlaylistId,
          message: `Playlist metadata saved (ID: ${newDbPlaylistId}), but failed to parse JSON for a page of tracks from URL ${tracksUrl}. Error: ${errorMessage}`,
          spotifyPlaylistData: spotifyPlaylist,
          spotifyTracksData: allSpotifyTracks,
        };
      }

      const tracksPage = tracksPageData as SpotifyPlaylistTracksResponse;

      if (!tracksPage || typeof tracksPage !== 'object' || !Array.isArray(tracksPage.items)) {
        console.warn(
          "[importPlaylist] Spotify tracks page data is malformed. 'tracksPage' is not an object or 'tracksPage.items' field is missing or not an array.",
          'URL fetched:',
          tracksUrl,
          'Type of tracksPage:',
          typeof tracksPage,
          'Is tracksPage.items an array?:',
          Array.isArray(tracksPage?.items),
          'Received data for tracks page (logged above as Raw tracksPageData received from Spotify):'
        );
        return {
          success: true,
          status: 'error_fetching_tracks',
          playlistIdDb: newDbPlaylistId,
          message: `Playlist metadata saved (ID: ${newDbPlaylistId}), but Spotify returned malformed data for a page of tracks from URL ${tracksUrl}. Track import may be incomplete.`,
          spotifyPlaylistData: spotifyPlaylist,
          spotifyTracksData: allSpotifyTracks,
        };
      }

      allSpotifyTracks = allSpotifyTracks.concat(
        tracksPage.items.filter((item) => item && item.track !== null)
      );

      // Check for next page and introduce a delay if needed
      if (tracksPage && typeof tracksPage.next === 'string') {
        tracksUrl = tracksPage.next;
        // Add a small delay to be kind to the API when paginating
        console.log('[importPlaylist] Delaying before fetching next page of tracks...');
        await sleep(300); // 300ms delay
      } else if (tracksPage && tracksPage.next === null) {
        tracksUrl = null; // End of pages
      } else {
        console.warn(
          "[importPlaylist] Unexpected 'next' field in Spotify tracks response or tracksPage is undefined. Stopping pagination. Received 'next' value:",
          tracksPage ? tracksPage.next : 'tracksPage was falsy'
        );
        tracksUrl = null; // Stop pagination if 'next' is not a string or null
      }

      console.log(
        `Fetched ${tracksPage.items ? tracksPage.items.length : 0} tracks for ${spotifyPlaylist.name}, total so far: ${allSpotifyTracks.length} / ${tracksPage.total}`
      );
    }
    console.log(
      `Successfully fetched all ${allSpotifyTracks.length} tracks for playlist: ${spotifyPlaylist.name}`
    );

    // 5. Map and Insert Playlist Items into DB
    if (allSpotifyTracks.length > 0) {
      const playlistTracksToInsert: DbPlaylistTrackInsert[] = allSpotifyTracks
        .map((item, index) => {
          if (!item.track) {
            // This case should ideally be filtered out earlier, but as a safeguard:
            console.warn('Skipping item with null track data during mapping:', item);
            return null; // Will be filtered out later
          }
          const track = item.track;
          return {
            playlist_id: newDbPlaylistId,
            track_spotify_id: track.id,
            track_name: track.name,
            track_artists: track.artists.map((a) => ({
              spotify_id: a.id, // Ensure this matches expected JSONB structure
              name: a.name,
            })),
            album_name: track.album ? track.album.name : null,
            album_art_url:
              track.album && track.album.images && track.album.images.length > 0
                ? track.album.images[0].url
                : null,
            duration_ms: track.duration_ms,
            order_in_playlist: index, // Using the index in the fetched array
            track_preview_url: track.preview_url,
            added_at: item.added_at,
            // Note: 'track_popularity' and 'audio_features' are not included
            // as they are not in the current Spotify track fetch or DbPlaylistTrackInsert
          };
        })
        .filter(Boolean) as DbPlaylistTrackInsert[]; // Filter out any nulls if items with null tracks were encountered

      if (playlistTracksToInsert.length > 0) {
        const { error: insertTracksError } = await supabase
          .from('playlist_tracks') // CORRECTED TABLE NAME
          .insert(playlistTracksToInsert);

        if (insertTracksError) {
          return {
            success: true,
            status: 'error_saving_tracks',
            playlistIdDb: newDbPlaylistId,
            message: `Playlist metadata saved (ID: ${newDbPlaylistId}), but failed to save tracks: ${insertTracksError.message}`,
            spotifyPlaylistData: spotifyPlaylist,
            spotifyTracksData: allSpotifyTracks,
          };
        }
        console.log(
          `Successfully saved ${allSpotifyTracks.length} tracks to DB for playlist ID: ${newDbPlaylistId}`
        );
      }
    }

    // --- BEGIN AGGREGATION LOGIC FOR Story 8.2 ---
    console.log(`[Story 8.2] Starting aggregation for playlist ID: ${newDbPlaylistId}`);
    try {
      const tracks_json: { spotify_track_id: string; name: string; duration_ms: number }[] =
        allSpotifyTracks
          .map((item) => {
            if (!item.track) return null;
            return {
              spotify_track_id: item.track.id,
              name: item.track.name,
              duration_ms: item.track.duration_ms,
            };
          })
          .filter(Boolean) as { spotify_track_id: string; name: string; duration_ms: number }[];

      const artistOccurrencesMap = new Map<
        string,
        { spotify_artist_id: string; name: string; playlist_occurrences: number }
      >();
      allSpotifyTracks.forEach((item) => {
        if (item.track && item.track.artists) {
          item.track.artists.forEach((artist) => {
            if (artistOccurrencesMap.has(artist.id)) {
              artistOccurrencesMap.get(artist.id)!.playlist_occurrences++;
            } else {
              artistOccurrencesMap.set(artist.id, {
                spotify_artist_id: artist.id,
                name: artist.name,
                playlist_occurrences: 1,
              });
            }
          });
        }
      });
      const artists_json = Array.from(artistOccurrencesMap.values());

      const total_tracks = tracks_json.length;
      const distinct_artist_count = artists_json.length;

      // user_id for the aggregate record is the submitted_by_user_id from the playlist record
      const aggregateUserId = playlistToInsert.submitted_by_user_id;

      const aggregateData = {
        playlist_id: newDbPlaylistId,
        user_id: aggregateUserId, // Can be null if not submitted by a logged-in user
        tracks_json,
        artists_json,
        total_tracks,
        distinct_artist_count,
        // last_aggregated_at will be set by the database trigger
      };

      console.log('[Story 8.2] Prepared aggregate data:', JSON.stringify(aggregateData, null, 2));

      const { error: upsertError } = await supabase
        .from('playlist_track_artist_aggregates')
        .upsert(aggregateData, { onConflict: 'playlist_id' });

      if (upsertError) {
        console.error(
          `[Story 8.2] Error upserting playlist aggregates for playlist ID ${newDbPlaylistId}:`,
          upsertError
        );
        // AC5: Log error but return success for playlist import itself
        // The overall function will still return success, but we log this specific error.
        // Optionally, we could modify the return status to 'created_with_aggregation_error'
        // For now, just logging and proceeding.
      } else {
        console.log(
          `[Story 8.2] Successfully upserted aggregates for playlist ID: ${newDbPlaylistId}`
        );
      }
    } catch (aggregationError) {
      console.error(
        `[Story 8.2] Exception during aggregation for playlist ID ${newDbPlaylistId}:`,
        aggregationError
      );
      // AC5: Log error but return success for playlist import itself
    }
    // --- END AGGREGATION LOGIC FOR Story 8.2 ---

    return {
      success: true,
      status: 'created',
      playlistIdDb: newDbPlaylistId,
      message: `Successfully imported playlist '${spotifyPlaylist.name}' and its ${allSpotifyTracks.length} tracks.`,
      spotifyPlaylistData: spotifyPlaylist,
      spotifyTracksData: allSpotifyTracks,
    };
  } catch (error) {
    console.error('Exception during Spotify playlist import process:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Determine a more specific status if possible, or keep general
    // Ensure this part is not accidentally duplicated if you are merging.
    // Check if playlistIdDb was set (meaning metadata might have been saved before this generic catch)
    // const currentPlaylistIdDb = newDbPlaylistId; // This variable might not be in scope here.
    // For simplicity, sticking to the original error statuses unless aggregation specifically fails.

    return {
      success: false,
      // status: 'error_saving_meta', // This might be too generic if error occurs after meta save
      // Consider if a more specific error status is needed if error is after metadata save
      // but before aggregation.
      // For now, using a general status if newDbPlaylistId is not available,
      // otherwise the status might have been set more specifically by earlier returns.
      status: 'error_saving_meta', // Fallback, might be overridden by more specific error returns above
      message: `Failed to import playlist: ${errorMessage}`,
    };
  }
}
