// Types related to Spotify data

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: {
    display_name?: string;
    id: string;
  };
  images: { url: string; height?: number; width?: number }[];
  tracks: {
    href: string;
    total: number;
  };
}

export interface SpotifyTrackArtist {
  id: string;
  name: string;
}

export interface SpotifyAlbumImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyTrackAlbum {
  id: string;
  name: string;
  images: SpotifyAlbumImage[];
}

export interface SpotifyPlaylistItem {
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

export interface SpotifyPlaylistTracksResponse {
  href: string;
  items: SpotifyPlaylistItem[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

// Playlist type for the database

export interface Playlist {
  id: string; // Internal database ID (e.g., UUID from Supabase)
  spotify_id: string;
  name: string;
  image_url?: string; // Optional image URL
}

export interface SpotifyApiTrackFull {
  id: string;
  uri: string;
  name: string;
  artists: {
    name: string;
    uri?: string;
    external_urls?: { spotify: string };
    [key: string]: unknown;
  }[];
  album: {
    name: string;
    images: { url: string; height?: number; width?: number }[];
    uri?: string;
    external_urls?: { spotify: string };
    [key: string]: unknown;
  };
  is_playable?: boolean;
  linked_from?: {
    id: string;
    uri: string;
    type: 'track';
    href: string;
    external_urls: { [key: string]: string };
  } | null;
  available_markets?: string[];
  restrictions?: {
    reason: string;
  };
  duration_ms?: number;
  [key: string]: unknown;
}
