import { Playlist } from './spotify';

export interface MusicContextState {
  player: Spotify.Player | null;
  deviceId: string | null;
  isReady: boolean;
  playbackState: Spotify.PlaybackState | null;
  currentVolumePercent: number | null;
  error: string | null;
  // User Info
  userSpotifyId: string | null;

  // Playlist State
  tasteMatchedPlaylists: Playlist[];
  currentPlaylistIndex: number | null;
  currentPlaylistName: string | null;

  // Save/Follow State
  isCurrentTrackSaved: boolean | null;
  isCurrentPlaylistFollowed: boolean | null;

  // Player control functions
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleShuffle: () => Promise<void>;

  // Playlist control functions
  playPlaylist: (playlist: Playlist, trackIndex?: number) => Promise<void>;
  nextPlaylist: () => Promise<void>;
  previousPlaylist: () => Promise<void>;

  // Save/Follow Check/Action Methods
  checkIfTrackIsSaved: (trackId: string) => Promise<void>;
  saveCurrentTrack: () => Promise<void>;
  unsaveCurrentTrack: () => Promise<void>;
  checkIfPlaylistIsFollowed: (playlistId: string) => Promise<void>;
  followCurrentPlaylist: () => Promise<void>;
  unfollowCurrentPlaylist: () => Promise<void>;

  // Timeline State & Seek Capability
  trackPositionMs: number | null;
  trackDurationMs: number | null;
  seek: (positionMs: number) => Promise<void>;
}
