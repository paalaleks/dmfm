'use server';

import { getSpotifyAccessToken } from '@/lib/spotify-api';
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

// For storing playlist items
interface DbPlaylistItemInsert {
  db_playlist_id: string; // FK to our playlists.id
  spotify_track_id: string;
  track_name: string;
  artists_json: object[] | null;
  album_name: string;
  album_spotify_id: string;
  album_images_json: object[] | null;
  duration_ms: number;
  explicit: boolean;
  preview_url?: string | null;
  spotify_uri?: string | null;
  added_at: string;
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
    | 'error_saving_tracks';
  playlistIdDb?: string; // Our internal DB playlist ID
  message?: string;
  spotifyPlaylistData?: SpotifyPlaylist; // Raw from Spotify
  spotifyTracksData?: SpotifyPlaylistItem[]; // Raw from Spotify
}

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
    let tracksUrl: string | null = spotifyPlaylist.tracks.href;
    if (!tracksUrl || !tracksUrl.startsWith('https')) {
      tracksUrl = `https://api.spotify.com/v1/playlists/${playlistSpotifyId}/tracks?fields=items(added_at,track(id,name,artists(id,name),album(id,name,images),duration_ms,explicit,preview_url,uri)),next,total`;
    }

    while (tracksUrl) {
      const tracksResponse = await fetch(tracksUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!tracksResponse.ok) {
        const errorBody = await tracksResponse.json().catch(() => ({}));
        return {
          success: true,
          status: 'error_fetching_tracks',
          playlistIdDb: newDbPlaylistId,
          message: `Playlist metadata saved (ID: ${newDbPlaylistId}), but failed to fetch a page of tracks: ${tracksResponse.status} - ${errorBody?.error?.message || tracksResponse.statusText}`,
          spotifyPlaylistData: spotifyPlaylist,
          spotifyTracksData: allSpotifyTracks, // Tracks fetched so far
        };
      }

      let tracksPageData;
      try {
        tracksPageData = await tracksResponse.json();
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
          message: `Playlist metadata saved (ID: ${newDbPlaylistId}), but failed to parse JSON for a page of tracks. Error: ${errorMessage}`,
          spotifyPlaylistData: spotifyPlaylist,
          spotifyTracksData: allSpotifyTracks,
        };
      }

      const tracksPage = tracksPageData as SpotifyPlaylistTracksResponse;

      if (!tracksPage || !Array.isArray(tracksPage.items)) {
        console.warn(
          "Spotify tracks page data is malformed or 'items' field is missing or not an array.",
          'Received data for tracks page:',
          tracksPage
        );
        return {
          success: true,
          status: 'error_fetching_tracks',
          playlistIdDb: newDbPlaylistId,
          message: `Playlist metadata saved (ID: ${newDbPlaylistId}), but Spotify returned malformed data for a page of tracks. Track import may be incomplete.`,
          spotifyPlaylistData: spotifyPlaylist,
          spotifyTracksData: allSpotifyTracks,
        };
      }

      allSpotifyTracks = allSpotifyTracks.concat(
        tracksPage.items.filter((item) => item && item.track !== null)
      );

      if (tracksPage && typeof tracksPage.next === 'string') {
        tracksUrl = tracksPage.next;
      } else if (tracksPage && tracksPage.next === null) {
        tracksUrl = null; // End of pages
      } else {
        console.warn(
          "Unexpected 'next' field in Spotify tracks response or tracksPage is undefined. Stopping pagination. Received 'next' value:",
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
      const playlistItemsToInsert: DbPlaylistItemInsert[] = allSpotifyTracks.map((item) => ({
        db_playlist_id: newDbPlaylistId,
        spotify_track_id: item.track!.id, // item.track is not null due to filter
        track_name: item.track!.name,
        artists_json: item.track!.artists.map((a) => ({ id: a.id, name: a.name })),
        album_name: item.track!.album.name,
        album_spotify_id: item.track!.album.id,
        album_images_json: item.track!.album.images.map((img) => ({
          url: img.url,
          height: img.height,
          width: img.width,
        })),
        duration_ms: item.track!.duration_ms,
        explicit: item.track!.explicit,
        preview_url: item.track!.preview_url,
        spotify_uri: item.track!.uri,
        added_at: item.added_at,
      }));

      const { error: insertTracksError } = await supabase
        .from('playlist_items')
        .insert(playlistItemsToInsert);

      if (insertTracksError) {
        return {
          success: true, // Metadata saved, tracks partially/failed to save
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
    return {
      success: false,
      status: 'error_saving_meta',
      message: `Failed to import playlist: ${errorMessage}`,
    };
  }
}
