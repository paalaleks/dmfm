// Types related to Spotify data

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
