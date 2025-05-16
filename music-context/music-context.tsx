'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { Playlist } from '../types/spotify';
import { MusicContextState } from '../types/music-context';
import { toast } from 'sonner';

// NEW IMPORTS for services
import { initializeUserSession, subscribeToUserSession, UserSessionState } from './user-session';
import {
  checkIfTrackIsSavedAPI,
  saveTrackAPI,
  unsaveTrackAPI,
  checkIfPlaylistIsFollowedAPI,
  followPlaylistAPI,
  unfollowPlaylistAPI,
  toggleShuffleAPI,
  playPlaylistAPI,
} from './spotify-api';

// Import the NEW Server Action
import { getMatchedPlaylistsForUserAction } from './playlist-actions';

// Add token manager imports
import {
  initializeTokenManager,
  getSpotifyToken,
  isAuthenticated,
  getUserId,
  ensureTokenManagerInitialized,
} from './token-manager';

// Define the initial state
const initialState: MusicContextState = {
  player: null,
  deviceId: null,
  isReady: false,
  playbackState: null,
  currentVolumePercent: 50,
  error: null,
  userSpotifyId: null,
  tasteMatchedPlaylists: [],
  currentPlaylistIndex: null,
  currentPlaylistName: null,
  isCurrentTrackSaved: null,
  isCurrentPlaylistFollowed: null,
  trackPositionMs: null,
  trackDurationMs: null,
  seek: async () => Promise.reject(new Error('Seek not available.')),
  nextTrack: async () => console.warn('Next track not available.'),
  previousTrack: async () => console.warn('Previous track not available.'),
  setVolume: async () => console.warn('Set volume not available.'),
  toggleMute: async () => console.warn('Toggle mute not available.'),
  toggleShuffle: async () => console.warn('Toggle shuffle not available.'),
  playPlaylist: async () => console.warn('Play playlist not available.'),
  nextPlaylist: async () => console.warn('Next playlist not available.'),
  previousPlaylist: async () => console.warn('Previous playlist not available.'),
  checkIfTrackIsSaved: async () => console.warn('Check track saved not available.'),
  saveCurrentTrack: async () => console.warn('Save track not available.'),
  unsaveCurrentTrack: async () => console.warn('Unsave track not available.'),
  checkIfPlaylistIsFollowed: async () => console.warn('Check playlist followed not available.'),
  followCurrentPlaylist: async () => console.warn('Follow playlist not available.'),
  unfollowCurrentPlaylist: async () => console.warn('Unfollow playlist not available.'),
};

const MusicContext = createContext<MusicContextState>(initialState);

interface MusicProviderProps {
  children: ReactNode;
  isDisabled?: boolean;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children, isDisabled }) => {
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [playbackState, setPlaybackState] = useState<Spotify.PlaybackState | null>(null);
  const [currentVolumePercent, setCurrentVolumePercent] = useState<number | null>(50);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<Spotify.Player | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [preMuteVolume, setPreMuteVolume] = useState<number>(0.5);
  const [isTokenManagerReady, setIsTokenManagerReady] = useState(false);

  const [tasteMatchedPlaylists, setTasteMatchedPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number | null>(null);
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string | null>(null);

  const [isCurrentTrackSaved, setIsCurrentTrackSaved] = useState<boolean | null>(null);
  const [isCurrentPlaylistFollowed, setIsCurrentPlaylistFollowed] = useState<boolean | null>(null);

  const [userSession, setUserSession] = useState<UserSessionState>({
    userSpotifyId: null,
    userId: null,
    isLoading: !isDisabled,
    error: null,
  });

  const initialPlaylistAutoPlayedRef = useRef(false);
  const [trackPositionMs, setTrackPositionMs] = useState<number | null>(null);
  const [trackDurationMs, setTrackDurationMs] = useState<number | null>(null);
  const lastProcessedTrackIdRef = useRef<string | null>(null);
  const trackProgressionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedTrackCheckRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedPlaylistCheckRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_DELAY_MS = 1000;
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAndSetTasteMatchedPlaylists = useCallback(async () => {
    if (isDisabled || !isTokenManagerReady) return;
    const userId = getUserId();
    if (!userId) {
      console.log(
        '[MusicContext] User ID not available from token manager. Skipping playlist fetch.'
      );
      setTasteMatchedPlaylists([]); // Ensure playlists are cleared if no user
      setCurrentPlaylistIndex(null);
      return;
    }
    try {
      const playlists = await getMatchedPlaylistsForUserAction(userId);
      setTasteMatchedPlaylists(playlists);
      setCurrentPlaylistIndex(null);
      initialPlaylistAutoPlayedRef.current = false;
      if (playlists.length === 0) {
        toast.info("Couldn't find any pre-matched playlists for you right now.");
      }
    } catch (err) {
      console.error('[MusicContext] Error fetching matched playlists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load matched playlists.');
      toast.error('Failed to load your matched playlists.');
      setTasteMatchedPlaylists([]);
      setCurrentPlaylistIndex(null);
      initialPlaylistAutoPlayedRef.current = false;
    }
  }, [isDisabled, isTokenManagerReady]);

  // Player Control Callbacks
  const nextTrack = useCallback(async () => {
    if (isDisabled || !playerRef.current || !isReady) {
      setError('Player not ready for next track.');
      return;
    }
    try {
      await playerRef.current.nextTrack();
      setError(null);
    } catch (e) {
      console.error('Error nextTrack:', e);
      setError('Error skipping track.');
    }
  }, [isDisabled, isReady]);

  const previousTrack = useCallback(async () => {
    if (isDisabled || !playerRef.current || !isReady) {
      setError('Player not ready for previous track.');
      return;
    }
    try {
      await playerRef.current.previousTrack();
      setError(null);
    } catch (e) {
      console.error('Error previousTrack:', e);
      setError('Error skipping track.');
    }
  }, [isDisabled, isReady]);

  const setVolume = useCallback(
    async (volume: number) => {
      if (isDisabled || !playerRef.current || !isReady) {
        setError('Player not ready to set volume.');
        return;
      }
      const clampedVolume = Math.max(0, Math.min(1, volume));
      try {
        await playerRef.current.setVolume(clampedVolume);
        setCurrentVolumePercent(Math.round(clampedVolume * 100));
        if (clampedVolume > 0) setPreMuteVolume(clampedVolume);
        setError(null);
      } catch (e) {
        console.error('Error setVolume:', e);
        setError('Error setting volume.');
      }
    },
    [isDisabled, isReady]
  );

  const toggleMute = useCallback(async () => {
    if (isDisabled || !playerRef.current || !isReady) {
      setError('Player not ready to toggle mute.');
      return;
    }
    try {
      const currentVolumeVal = await playerRef.current.getVolume();
      if (currentVolumeVal > 0) {
        setPreMuteVolume(currentVolumeVal);
        await playerRef.current.setVolume(0);
        setCurrentVolumePercent(0);
      } else {
        const volumeToRestore = preMuteVolume > 0 ? preMuteVolume : 0.5;
        await playerRef.current.setVolume(volumeToRestore);
        setCurrentVolumePercent(Math.round(volumeToRestore * 100));
      }
      setError(null);
    } catch (e) {
      console.error('Error toggleMute:', e);
      setError('Error toggling mute.');
    }
  }, [isDisabled, isReady, preMuteVolume]);

  const toggleShuffle = useCallback(async () => {
    if (isDisabled || !isReady || !deviceId || playbackState === null || !isTokenManagerReady) {
      setError('Player not ready to toggle shuffle or auth not ready.');
      return;
    }
    const token = await getSpotifyToken();
    if (!token) {
      setError('Unable to toggle shuffle: Token not available');
      return;
    }
    const newShuffleState = !playbackState.shuffle;
    try {
      await toggleShuffleAPI(token, deviceId, newShuffleState);
      setError(null);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error toggling shuffle.';
      setError(`Error toggling shuffle: ${errorMsg}`);
      toast.error(errorMsg);
    }
  }, [isDisabled, isReady, deviceId, playbackState, isTokenManagerReady]);

  const playPlaylist = useCallback(
    async (playlist: Playlist, trackIndex: number = 0) => {
      if (isDisabled || !isReady || !deviceId || !isTokenManagerReady) {
        const msg = 'Cannot play playlist: Player/auth not ready or device missing.';
        setError(msg);
        toast.error(msg);
        return;
      }
      const token = await getSpotifyToken();
      if (!token) {
        const msg = 'Cannot play playlist: Token not available.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!playlist || !playlist.spotify_id) {
        const msg = 'Cannot play playlist: Invalid playlist data.';
        setError(msg);
        toast.error(msg);
        return;
      }
      try {
        await playPlaylistAPI(token, deviceId, playlist, trackIndex);
        setError(null);
        const playlistIndexInMatched = tasteMatchedPlaylists.findIndex(
          (p) => p.spotify_id === playlist.spotify_id
        );
        setCurrentPlaylistIndex(playlistIndexInMatched !== -1 ? playlistIndexInMatched : null);
        setCurrentPlaylistName(playlist.name);
      } catch (e) {
        const playlistIdentifier = playlist?.name || playlist?.spotify_id || 'Unknown Playlist';
        let detailedErrorMessage = `Error playing playlist "${playlistIdentifier}": `;
        if (
          e instanceof Error &&
          e.message &&
          e.message.includes('Spotify API Error (403)') &&
          e.message.includes('Restriction violated')
        ) {
          detailedErrorMessage += `Playback failed, possibly due to restricted content. (Spotify: ${e.message})`;
        } else if (e instanceof Error) {
          detailedErrorMessage += e.message;
        } else {
          detailedErrorMessage += 'An unknown error occurred.';
        }
        setError(detailedErrorMessage);
        toast.error(detailedErrorMessage);
      }
    },
    [isDisabled, isReady, deviceId, tasteMatchedPlaylists, isTokenManagerReady]
  );

  const nextPlaylist = useCallback(async () => {
    if (isDisabled || !tasteMatchedPlaylists || tasteMatchedPlaylists.length < 1) {
      setError('No playlists available.');
      return;
    }
    const currentIndex = currentPlaylistIndex === null ? -1 : currentPlaylistIndex;
    const nextIndex = (currentIndex + 1) % tasteMatchedPlaylists.length;
    const nextList = tasteMatchedPlaylists[nextIndex];
    if (nextList) await playPlaylist(nextList);
    else setError('Error finding next playlist.');
  }, [isDisabled, tasteMatchedPlaylists, currentPlaylistIndex, playPlaylist]);

  const previousPlaylist = useCallback(async () => {
    if (isDisabled || !tasteMatchedPlaylists || tasteMatchedPlaylists.length < 1) {
      setError('No playlists available.');
      return;
    }
    const currentIndex = currentPlaylistIndex === null ? 0 : currentPlaylistIndex;
    const prevIndex =
      (currentIndex - 1 + tasteMatchedPlaylists.length) % tasteMatchedPlaylists.length;
    const prevList = tasteMatchedPlaylists[prevIndex];
    if (prevList) await playPlaylist(prevList);
    else setError('Error finding previous playlist.');
  }, [isDisabled, tasteMatchedPlaylists, currentPlaylistIndex, playPlaylist]);

  // Save/Follow Check/Action Methods
  const checkIfTrackIsSaved = useCallback(
    async (trackId: string) => {
      if (isDisabled || !isTokenManagerReady) {
        setIsCurrentTrackSaved(null);
        return;
      }
      const token = await getSpotifyToken();
      if (!token || !trackId) {
        setIsCurrentTrackSaved(null);
        return;
      }
      try {
        const isSaved = await checkIfTrackIsSavedAPI(token, trackId);
        setIsCurrentTrackSaved(isSaved);
      } catch (err) {
        console.error('[MusicContext] Error in checkIfTrackIsSaved:', err);
        setIsCurrentTrackSaved(null);
      }
    },
    [isDisabled, isTokenManagerReady]
  );

  const saveCurrentTrack = useCallback(async () => {
    if (isDisabled || !isTokenManagerReady) {
      setError('Cannot save track: Auth not ready or provider disabled.');
      return;
    }
    const token = await getSpotifyToken();
    const currentTrackId = playbackState?.track_window?.current_track?.id;
    if (!token || !currentTrackId) {
      setError('No track playing or token unavailable to save.');
      return;
    }
    try {
      setError(null);
      await saveTrackAPI(token, currentTrackId);
      setIsCurrentTrackSaved(true);
      toast.success('Track saved to your Liked Songs!');
    } catch (err) {
      console.error('[MusicContext] Error saving track:', err);
      const errorMsg = 'Failed to save track. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsCurrentTrackSaved(false);
    }
  }, [isDisabled, playbackState, isTokenManagerReady]);

  const unsaveCurrentTrack = useCallback(async () => {
    if (isDisabled || !isTokenManagerReady) {
      setError('Cannot unsave track: Auth not ready or provider disabled.');
      return;
    }
    const token = await getSpotifyToken();
    const currentTrackId = playbackState?.track_window?.current_track?.id;
    if (!token || !currentTrackId) {
      setError('No track playing or token unavailable to unsave.');
      return;
    }
    try {
      setError(null);
      await unsaveTrackAPI(token, currentTrackId);
      setIsCurrentTrackSaved(false);
      toast.success('Track removed from your Liked Songs.');
    } catch (err) {
      console.error('[MusicContext] Error unsaving track:', err);
      const errorMsg = 'Failed to unsave track. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsCurrentTrackSaved(true);
    }
  }, [isDisabled, playbackState, isTokenManagerReady]);

  const checkIfPlaylistIsFollowed = useCallback(
    async (playlistId: string) => {
      if (isDisabled || !isTokenManagerReady) {
        setIsCurrentPlaylistFollowed(null);
        return;
      }
      const token = await getSpotifyToken();
      if (!token || !playlistId) {
        setIsCurrentPlaylistFollowed(null);
        return;
      }
      try {
        const isFollowed = await checkIfPlaylistIsFollowedAPI(token, playlistId);
        setIsCurrentPlaylistFollowed(isFollowed);
      } catch (err) {
        console.error('[MusicContext] Error in checkIfPlaylistIsFollowed:', err);
        setIsCurrentPlaylistFollowed(null);
      }
    },
    [isDisabled, isTokenManagerReady]
  );

  const followCurrentPlaylist = useCallback(async () => {
    if (isDisabled || !playbackState?.context?.uri || !isTokenManagerReady) {
      setError(
        'Cannot follow playlist: No playlist playing, auth not ready, or provider disabled.'
      );
      return;
    }
    const token = await getSpotifyToken();
    if (!token) {
      setError('Authentication required to follow playlist.');
      return;
    }
    const currentPlaylistId = playbackState.context.uri.split(':')[2];
    try {
      setError(null);
      await followPlaylistAPI(token, currentPlaylistId);
      setIsCurrentPlaylistFollowed(true);
      toast.success('Playlist followed!');
    } catch (err) {
      console.error('[MusicContext] Error following playlist:', err);
      const errorMsg = 'Failed to follow playlist. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsCurrentPlaylistFollowed(false);
    }
  }, [isDisabled, playbackState, isTokenManagerReady]);

  const unfollowCurrentPlaylist = useCallback(async () => {
    if (isDisabled || !playbackState?.context?.uri || !isTokenManagerReady) {
      setError(
        'Cannot unfollow playlist: No playlist playing, auth not ready, or provider disabled.'
      );
      return;
    }
    const token = await getSpotifyToken();
    if (!token) {
      setError('Authentication required to unfollow playlist.');
      return;
    }
    const currentPlaylistId = playbackState.context.uri.split(':')[2];
    try {
      setError(null);
      await unfollowPlaylistAPI(token, currentPlaylistId);
      setIsCurrentPlaylistFollowed(false);
      toast.success('Playlist unfollowed.');
    } catch (err) {
      console.error('[MusicContext] Error unfollowing playlist:', err);
      const errorMsg = 'Failed to unfollow playlist. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsCurrentPlaylistFollowed(true);
    }
  }, [isDisabled, playbackState, isTokenManagerReady]);

  // Timeline & Seek Functions
  const seek = useCallback(
    async (positionMs: number) => {
      if (isDisabled || !playerRef.current || !isReady) {
        const msg = 'Seek failed: Player not ready or provider disabled.';
        setError(msg);
        toast.error(msg);
        throw new Error(msg);
      }
      if (!playbackState || !trackDurationMs) {
        const msg = 'Seek failed: No track loaded or duration unknown.';
        setError(msg);
        toast.error(msg);
        throw new Error(msg);
      }
      if (isSeekingRef.current) {
        return;
      }
      isSeekingRef.current = true;
      const newPosition = Math.max(0, Math.min(positionMs, trackDurationMs));
      setTrackPositionMs(newPosition);
      try {
        await playerRef.current.seek(newPosition);
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : 'Unknown Spotify SDK error';
        const msg = `Seek failed: ${errMsg}`;
        setError(msg);
        toast.error(msg);
        throw new Error(msg);
      } finally {
        if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = setTimeout(() => {
          isSeekingRef.current = false;
        }, 200);
      }
    },
    [isDisabled, isReady, playbackState, trackDurationMs, setError]
  );

  // PlayerInitEffect
  useEffect(() => {
    if (isDisabled || !sdkReady || !isTokenManagerReady) {
      if (playerRef.current) {
        if (typeof playerRef.current.disconnect === 'function') playerRef.current.disconnect();
        setPlayer(null);
        playerRef.current = null;
        setIsReady(false);
        setDeviceId(null);
        setPlaybackState(null);
      }
      return;
    }
    if (playerRef.current) return;

    const getOAuthTokenCallback: Spotify.PlayerInit['getOAuthToken'] = async (cb) => {
      if (isDisabled) {
        cb('');
        return;
      }
      const token = await getSpotifyToken();
      cb(token || '');
    };

    const effectRunId = Date.now();
    console.log(`[MusicContext PlayerInitEffect ${effectRunId}] Initializing new player.`);

    const newPlayer = new window.Spotify.Player({
      name: 'Playlist Chat Rooms Player',
      getOAuthToken: getOAuthTokenCallback,
      volume: currentVolumePercent !== null ? currentVolumePercent / 100 : 0.5,
    });

    newPlayer.addListener('ready', async ({ device_id }) => {
      if (playerRef.current !== null && playerRef.current !== newPlayer) {
        if (typeof newPlayer.disconnect === 'function') newPlayer.disconnect();
        return;
      }
      setDeviceId(device_id);
      setIsReady(true);
      setError(null);
      try {
        const vol = await newPlayer.getVolume();
        setCurrentVolumePercent(Math.round(vol * 100));
        setPreMuteVolume(vol);
      } catch (e) {
        console.error('Error getting vol on ready:', e);
      }
      newPlayer.getCurrentState().then(setPlaybackState);
    });

    newPlayer.addListener('not_ready', ({ device_id }) => {
      if (playerRef.current !== null && playerRef.current !== newPlayer) return;
      console.log('[MusicContext] Device ID has gone offline:', device_id);
      setIsReady(false);
      setDeviceId(null);
      lastProcessedTrackIdRef.current = null;
    });

    newPlayer.addListener('player_state_changed', async (sdkState) => {
      if (playerRef.current !== newPlayer) return;
      if (sdkState) {
        setTrackPositionMs(sdkState.position);
        setTrackDurationMs(sdkState.duration);
      } else {
        setTrackPositionMs(null);
        setTrackDurationMs(null);
      }
      if (!sdkState) {
        setPlaybackState(null);
        lastProcessedTrackIdRef.current = null;
        return;
      }
      const currentSdkTrack = sdkState.track_window.current_track;
      const currentSdkTrackId = currentSdkTrack?.id;
      setPlaybackState(sdkState);

      if (currentSdkTrackId && lastProcessedTrackIdRef.current !== currentSdkTrackId) {
        lastProcessedTrackIdRef.current = currentSdkTrackId;
      }
      if (!currentSdkTrackId) {
        lastProcessedTrackIdRef.current = null;
      }

      const shouldCheckSaved = currentSdkTrackId && !sdkState.paused;
      if (shouldCheckSaved) checkIfTrackIsSaved(currentSdkTrackId);
      if (sdkState.context?.uri !== playbackState?.context?.uri) {
        if (sdkState.context?.uri?.startsWith('spotify:playlist:'))
          checkIfPlaylistIsFollowed(sdkState.context.uri.split(':')[2]);
        else setIsCurrentPlaylistFollowed(null);
      }
    });

    newPlayer.addListener('initialization_error', ({ message }) => {
      setError(`Init Error: ${message}`);
      setIsReady(false);
    });
    newPlayer.addListener('authentication_error', ({ message }) => {
      console.error('[MusicContext] Authentication Error:', message);
      setError(`Spotify authentication error: ${message}. Please try signing out and in again.`);
      if (playerRef.current) playerRef.current.disconnect();
      setPlayer(null);
      playerRef.current = null;
      setIsReady(false);
      setPlaybackState(null);
      setDeviceId(null);
    });
    newPlayer.addListener('account_error', ({ message }) => {
      setError(`Account Error: ${message}`);
      toast.error(`Spotify account error: ${message}`);
    });
    newPlayer.addListener('playback_error', ({ message }) => {
      setError(`Playback Error: ${message}`);
      toast.error(`Spotify playback error: ${message}`);
      console.log(`[MusicContext Playback Error] UserID: ${getUserId()}`);
    });

    newPlayer
      .connect()
      .catch((err) =>
        setError(`Connect Error: ${err instanceof Error ? err.message : String(err)}`)
      );
    setPlayer(newPlayer);
    playerRef.current = newPlayer;
    newPlayer.getCurrentState().then((pState) => {
      if (pState)
        newPlayer.getVolume().then((vol) => {
          setCurrentVolumePercent(Math.round(vol * 100));
          setPreMuteVolume(vol);
        });
    });

    return () => {
      if (playerRef.current) {
        if (typeof playerRef.current.disconnect === 'function') playerRef.current.disconnect();
      }
      setPlayer(null);
      playerRef.current = null;
      setIsReady(false);
      setDeviceId(null);
      setPlaybackState(null);
    };
  }, [isDisabled, sdkReady, isTokenManagerReady, currentVolumePercent]);

  // SDK Ready Effect
  useEffect(() => {
    if (isDisabled) return;
    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);
    return () => {
      if (!isDisabled) window.onSpotifyWebPlaybackSDKReady = () => {};
    };
  }, [isDisabled]);

  // Track Progression Interval Effect
  useEffect(() => {
    if (playbackState && !playbackState.paused && playerRef.current) {
      if (trackProgressionIntervalRef.current) clearInterval(trackProgressionIntervalRef.current);
      trackProgressionIntervalRef.current = setInterval(async () => {
        if (playerRef.current) {
          try {
            const cState = await playerRef.current.getCurrentState();
            if (cState) setTrackPositionMs(cState.position);
            else {
              if (trackProgressionIntervalRef.current)
                clearInterval(trackProgressionIntervalRef.current);
              trackProgressionIntervalRef.current = null;
              setTrackPositionMs(null);
            }
          } catch (e) {
            console.error('[MusicContext] Error getting current state in interval:', e);
            if (trackProgressionIntervalRef.current)
              clearInterval(trackProgressionIntervalRef.current);
            trackProgressionIntervalRef.current = null;
            setError('Failed to sync track position.');
          }
        }
      }, 500);
    } else {
      if (trackProgressionIntervalRef.current) clearInterval(trackProgressionIntervalRef.current);
      trackProgressionIntervalRef.current = null;
    }
    return () => {
      if (trackProgressionIntervalRef.current) clearInterval(trackProgressionIntervalRef.current);
    };
  }, [playbackState]);

  // Fetch Taste-Matched Playlists Effect
  useEffect(() => {
    if (isDisabled || !isReady || !deviceId || !isTokenManagerReady || !isAuthenticated()) return;
    fetchAndSetTasteMatchedPlaylists().catch((err) =>
      console.error('Error fetching playlists:', err)
    );
  }, [isDisabled, isReady, deviceId, isTokenManagerReady, fetchAndSetTasteMatchedPlaylists]);

  // Auto-Play First Playlist Effect
  useEffect(() => {
    if (
      isDisabled ||
      !isReady ||
      !deviceId ||
      !isTokenManagerReady ||
      tasteMatchedPlaylists.length === 0 ||
      currentPlaylistIndex !== null ||
      initialPlaylistAutoPlayedRef.current ||
      typeof playPlaylist !== 'function' ||
      !isAuthenticated()
    )
      return;
    playPlaylist(tasteMatchedPlaylists[0], 0)
      .then(() => {
        initialPlaylistAutoPlayedRef.current = true;
      })
      .catch((err) => {
        console.error('Error auto-playing:', err);
        initialPlaylistAutoPlayedRef.current = true;
      });
  }, [
    isDisabled,
    isReady,
    deviceId,
    isTokenManagerReady,
    tasteMatchedPlaylists,
    currentPlaylistIndex,
    playPlaylist,
  ]);

  // Debounced Save/Follow Checks Effect
  useEffect(() => {
    if (isDisabled || !isTokenManagerReady) {
      if (debouncedTrackCheckRef.current) clearTimeout(debouncedTrackCheckRef.current);
      if (debouncedPlaylistCheckRef.current) clearTimeout(debouncedPlaylistCheckRef.current);
      setIsCurrentTrackSaved(null);
      setIsCurrentPlaylistFollowed(null);
      return;
    }
    const trackId = playbackState?.track_window?.current_track?.id;
    const playlistCtxUri = playbackState?.context?.uri;
    const playlistId = playlistCtxUri?.startsWith('spotify:playlist:')
      ? playlistCtxUri.split(':')[2]
      : null;

    if (debouncedTrackCheckRef.current) clearTimeout(debouncedTrackCheckRef.current);
    if (trackId) {
      debouncedTrackCheckRef.current = setTimeout(
        () => checkIfTrackIsSaved(trackId).catch(console.error),
        DEBOUNCE_DELAY_MS
      );
    } else {
      setIsCurrentTrackSaved(null);
    }
    if (debouncedPlaylistCheckRef.current) clearTimeout(debouncedPlaylistCheckRef.current);
    if (playlistId) {
      debouncedPlaylistCheckRef.current = setTimeout(
        () => checkIfPlaylistIsFollowed(playlistId).catch(console.error),
        DEBOUNCE_DELAY_MS
      );
    } else {
      setIsCurrentPlaylistFollowed(null);
    }
    return () => {
      if (debouncedTrackCheckRef.current) clearTimeout(debouncedTrackCheckRef.current);
      if (debouncedPlaylistCheckRef.current) clearTimeout(debouncedPlaylistCheckRef.current);
    };
  }, [
    playbackState,
    checkIfTrackIsSaved,
    checkIfPlaylistIsFollowed,
    isDisabled,
    isTokenManagerReady,
    DEBOUNCE_DELAY_MS,
  ]);

  // Main Initialization Effect (Token Manager and User Session)
  useEffect(() => {
    let userSessionCleanup: (() => void) | null = null;

    if (isDisabled) {
      setIsTokenManagerReady(false);
      setUserSession({ userSpotifyId: null, userId: null, isLoading: false, error: null });
      if (playerRef.current) {
        if (typeof playerRef.current.disconnect === 'function') playerRef.current.disconnect();
        setPlayer(null);
        playerRef.current = null;
      }
      setIsReady(false);
      setPlaybackState(null);
      setDeviceId(null);
      setCurrentVolumePercent(50);
      setTasteMatchedPlaylists([]);
      setCurrentPlaylistIndex(null);
      setCurrentPlaylistName(null);
      setIsCurrentTrackSaved(null);
      setIsCurrentPlaylistFollowed(null);
      initialPlaylistAutoPlayedRef.current = false;
      lastProcessedTrackIdRef.current = null;
      return;
    }

    initializeTokenManager(); // Idempotent
    ensureTokenManagerInitialized()
      .then(() => {
        setIsTokenManagerReady(true);
        console.log('[MusicContext] Token manager is initialized.');

        // Initialize user session after token manager is confirmed ready
        const cleanupUserSess = initializeUserSession();
        const unsubscribeUserSess = subscribeToUserSession((newSessionState) => {
          setUserSession((prevState) => {
            if (
              newSessionState.isLoading &&
              newSessionState.userId === null &&
              prevState.userId !== null
            ) {
              return {
                ...newSessionState,
                userId: prevState.userId,
                userSpotifyId: prevState.userSpotifyId,
              };
            }
            return newSessionState;
          });
          const sessionErr = newSessionState.error;
          const expectedErr = sessionErr === 'User session missing.';
          const actualErr = sessionErr && !expectedErr;
          setError((prevErr) => {
            if (actualErr) return prevErr !== sessionErr ? sessionErr : prevErr;
            if (prevErr !== null && (sessionErr === null || expectedErr)) return null;
            return prevErr;
          });
          if (sessionErr === 'User session missing.' && !isAuthenticated()) {
            if (playerRef.current && typeof playerRef.current.disconnect === 'function')
              playerRef.current.disconnect();
            setPlayer(null);
            playerRef.current = null;
            setIsReady(false);
            setPlaybackState(null);
            setDeviceId(null);
            // Reset other states as well
          }
        });
        userSessionCleanup = () => {
          cleanupUserSess();
          unsubscribeUserSess();
        };
      })
      .catch((err) => {
        console.error('[MusicContext] Failed to initialize token manager:', err);
        setError('Music services failed to start.');
        setIsTokenManagerReady(false);
      });

    return () => {
      console.log('[MusicContext] Main init effect cleanup.');
      if (userSessionCleanup) userSessionCleanup();
      setIsTokenManagerReady(false);
    };
  }, [isDisabled]);

  const contextValue: MusicContextState = isDisabled
    ? initialState
    : {
        player,
        deviceId,
        isReady,
        playbackState,
        currentVolumePercent,
        error,
        userSpotifyId: userSession.userSpotifyId,
        tasteMatchedPlaylists,
        currentPlaylistIndex,
        currentPlaylistName,
        isCurrentTrackSaved,
        isCurrentPlaylistFollowed,
        trackPositionMs,
        trackDurationMs,
        seek,
        nextTrack,
        previousTrack,
        setVolume,
        toggleMute,
        toggleShuffle,
        playPlaylist,
        nextPlaylist,
        previousPlaylist,
        checkIfTrackIsSaved,
        saveCurrentTrack,
        unsaveCurrentTrack,
        checkIfPlaylistIsFollowed,
        followCurrentPlaylist,
        unfollowCurrentPlaylist,
      };

  return <MusicContext.Provider value={contextValue}>{children}</MusicContext.Provider>;
};

export const useMusic = (): MusicContextState => {
  const context = useContext(MusicContext);
  if (context === undefined) throw new Error('useMusic must be used within a MusicProvider');
  return context;
};
