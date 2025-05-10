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
import { Playlist, SpotifyApiTrackFull } from '../types/spotify';
import { MusicContextState } from '../types/music-context';
import { toast } from 'sonner';
import { mapApiTrackToSdkTrack } from './spotify-helpers';

// NEW IMPORTS for services
import {
  initializeUserSession,
  subscribeToUserSession,
  getValidSpotifyToken,
  UserSessionState,
} from './user-session';
import {
  fetchSpotifyTrack as fetchSpotifyTrackAPI,
  checkIfTrackIsSavedAPI,
  saveTrackAPI,
  unsaveTrackAPI,
  checkIfPlaylistIsFollowedAPI,
  followPlaylistAPI,
  unfollowPlaylistAPI,
  toggleShuffleAPI,
  playPlaylistAPI,
} from './spotify-api';

// Import the Server Action
import { getTasteMatchedPlaylistsAction } from '@/app/_actions/tastematched-playlists';

// Define the initial state
const initialState: MusicContextState = {
  player: null,
  deviceId: null,
  isReady: false,
  playbackState: null,
  currentVolumePercent: 50,
  error: null,

  // User Info
  userSpotifyId: null,

  // Playlist State
  tasteMatchedPlaylists: [],
  currentPlaylistIndex: null,
  currentPlaylistName: null,

  // Save/Follow State
  isCurrentTrackSaved: null,
  isCurrentPlaylistFollowed: null,

  // Player control functions
  nextTrack: async () => {
    console.warn(
      '[MusicContext initialState] Next track function not implemented yet or provider disabled.'
    );
  },
  previousTrack: async () => {
    console.warn(
      '[MusicContext initialState] Previous track function not implemented yet or provider disabled.'
    );
  },
  setVolume: async () => {
    console.warn(
      '[MusicContext initialState] Set volume function not implemented yet or provider disabled.'
    );
  },
  toggleMute: async () => {
    console.warn(
      '[MusicContext initialState] Toggle mute function not implemented yet or provider disabled.'
    );
  },
  toggleShuffle: async () => {
    console.warn(
      '[MusicContext initialState] Toggle shuffle function not implemented yet or provider disabled.'
    );
  },

  // Playlist control functions
  playPlaylist: async () => {
    console.warn(
      '[MusicContext initialState] Play playlist function not implemented yet or provider disabled.'
    );
  },
  nextPlaylist: async () => {
    console.warn(
      '[MusicContext initialState] Next playlist function not implemented yet or provider disabled.'
    );
  },
  previousPlaylist: async () => {
    console.warn(
      '[MusicContext initialState] Previous playlist function not implemented yet or provider disabled.'
    );
  },

  // Save/Follow Check/Action Methods
  checkIfTrackIsSaved: async () => {
    console.warn(
      '[MusicContext initialState] checkIfTrackIsSaved function not implemented yet or provider disabled.'
    );
  },
  saveCurrentTrack: async () => {
    console.warn(
      '[MusicContext initialState] saveCurrentTrack function not implemented yet or provider disabled.'
    );
  },
  unsaveCurrentTrack: async () => {
    console.warn(
      '[MusicContext initialState] unsaveCurrentTrack function not implemented yet or provider disabled.'
    );
  },
  checkIfPlaylistIsFollowed: async () => {
    console.warn(
      '[MusicContext initialState] checkIfPlaylistIsFollowed function not implemented yet or provider disabled.'
    );
  },
  followCurrentPlaylist: async () => {
    console.warn(
      '[MusicContext initialState] followCurrentPlaylist function not implemented yet or provider disabled.'
    );
  },
  unfollowCurrentPlaylist: async () => {
    console.warn(
      '[MusicContext initialState] unfollowCurrentPlaylist function not implemented yet or provider disabled.'
    );
  },
};

// Create the context
const MusicContext = createContext<MusicContextState>(initialState);

// Define Props for the Provider
interface MusicProviderProps {
  children: ReactNode;
  isDisabled?: boolean;
}

// Create the Provider Component
export const MusicProvider: React.FC<MusicProviderProps> = ({ children, isDisabled }) => {
  // console.log(`[MusicProvider] Rendering. isDisabled: ${isDisabled}`);

  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [playbackState, setPlaybackState] = useState<Spotify.PlaybackState | null>(null);
  const [currentVolumePercent, setCurrentVolumePercent] = useState<number | null>(50);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const playerRef = useRef<Spotify.Player | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [preMuteVolume, setPreMuteVolume] = useState<number>(0.5);

  const [tasteMatchedPlaylists, setTasteMatchedPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number | null>(null);
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string | null>(null);

  const [isCurrentTrackSaved, setIsCurrentTrackSaved] = useState<boolean | null>(null);
  const [isCurrentPlaylistFollowed, setIsCurrentPlaylistFollowed] = useState<boolean | null>(null);

  const [userSession, setUserSession] = useState<UserSessionState>({
    spotifyToken: null,
    userSpotifyId: null,
    userId: null,
    isLoading: !isDisabled,
    error: null,
  });

  const initialPlaylistAutoPlayedRef = useRef(false);

  // New function to fetch and set taste-matched playlists
  const fetchAndSetTasteMatchedPlaylists = useCallback(async () => {
    if (isDisabled) return;
    console.log('[MusicContext] Attempting to fetch taste-matched playlists...');
    if (!userSession.userId || !userSession.spotifyToken) {
      console.log('[MusicContext] User ID or Spotify token not available. Skipping fetch.');
      return;
    }
    try {
      const playlists = await getTasteMatchedPlaylistsAction();
      console.log('[MusicContext] Received playlists from server action:', playlists);
      setTasteMatchedPlaylists(playlists);
      setCurrentPlaylistIndex(null);
      initialPlaylistAutoPlayedRef.current = false;
      if (playlists.length === 0) {
        toast.info("Couldn't find any playlists matching your taste right now.");
      }
    } catch (err) {
      console.error('[MusicContext] Error fetching taste-matched playlists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load taste-matched playlists.');
      toast.error('Failed to load playlists based on your taste.');
      setTasteMatchedPlaylists([]);
      setCurrentPlaylistIndex(null);
      initialPlaylistAutoPlayedRef.current = false;
    }
  }, [userSession.userId, userSession.spotifyToken, isDisabled]);

  // --- Start of Player Control Callbacks ---
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
      const currentVolume = await playerRef.current.getVolume();
      if (currentVolume > 0) {
        setPreMuteVolume(currentVolume);
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
    const token = tokenRef.current;
    if (isDisabled || !isReady || !deviceId || !token || playbackState === null) {
      setError('Player not ready to toggle shuffle.');
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
  }, [isDisabled, isReady, deviceId, tokenRef, playbackState]);

  const playPlaylist = useCallback(
    async (playlist: Playlist, trackIndex: number = 0) => {
      const token = tokenRef.current;
      if (isDisabled || !isReady || !deviceId || !token) {
        const msg =
          'Cannot play playlist: Player not ready, device/token missing, or provider disabled.';
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
        const userMessage =
          e instanceof Error
            ? e.message
            : `An error occurred while trying to play "${playlist.name}"`;
        setError(userMessage);
        toast.error(userMessage);
      }
    },
    [isDisabled, isReady, deviceId, tokenRef, tasteMatchedPlaylists]
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
  // --- End of Player Control Callbacks ---

  const checkIfTrackIsSaved = useCallback(
    async (trackId: string) => {
      if (isDisabled) {
        setIsCurrentTrackSaved(null);
        return;
      }
      const token = tokenRef.current;
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
    [isDisabled, tokenRef]
  );

  const saveCurrentTrack = useCallback(async () => {
    if (isDisabled) {
      console.warn('No token or current track to save, or provider disabled.');
      setError(
        'No track is currently playing to save, or user session is invalid, or provider disabled.'
      );
      return;
    }
    const token = tokenRef.current;
    const currentTrackId = playbackState?.track_window?.current_track?.id;
    if (!token || !currentTrackId) {
      console.warn('No token or current track to save.');
      setError('No track is currently playing to save, or user session is invalid.');
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
  }, [isDisabled, tokenRef, playbackState]);

  const unsaveCurrentTrack = useCallback(async () => {
    if (isDisabled) {
      console.warn('No token or current track to unsave, or provider disabled.');
      setError(
        'No track is currently playing to unsave, or user session is invalid, or provider disabled.'
      );
      return;
    }
    const token = tokenRef.current;
    const currentTrackId = playbackState?.track_window?.current_track?.id;
    if (!token || !currentTrackId) {
      console.warn('No token or current track to unsave.');
      setError('No track is currently playing to unsave, or user session is invalid.');
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
  }, [isDisabled, tokenRef, playbackState]);

  const checkIfPlaylistIsFollowed = useCallback(
    async (playlistId: string) => {
      if (isDisabled) {
        setIsCurrentPlaylistFollowed(null);
        return;
      }
      const token = tokenRef.current;
      const currentSpotifyUserId = userSession.userSpotifyId;

      if (!token || !playlistId || !currentSpotifyUserId) {
        setIsCurrentPlaylistFollowed(null);
        return;
      }
      try {
        const isFollowed = await checkIfPlaylistIsFollowedAPI(
          token,
          playlistId,
          currentSpotifyUserId
        );
        setIsCurrentPlaylistFollowed(isFollowed);
      } catch (err) {
        console.error('[MusicContext] Error in checkIfPlaylistIsFollowed:', err);
        setIsCurrentPlaylistFollowed(null);
      }
    },
    [isDisabled, tokenRef, userSession.userSpotifyId]
  );

  const followCurrentPlaylist = useCallback(async () => {
    if (isDisabled || !tokenRef.current || !playbackState?.context?.uri) {
      console.warn('No token or current playlist to follow, or provider disabled.');
      setError(
        'No playlist is currently playing to follow, or user session is invalid, or provider disabled.'
      );
      return;
    }
    const currentPlaylistId = playbackState.context.uri.split(':')[2];

    try {
      setError(null);
      await followPlaylistAPI(tokenRef.current, currentPlaylistId);
      setIsCurrentPlaylistFollowed(true);
      toast.success('Playlist followed!');
    } catch (err) {
      console.error('[MusicContext] Error following playlist:', err);
      const errorMsg = 'Failed to follow playlist. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsCurrentPlaylistFollowed(false);
    }
  }, [isDisabled, tokenRef, playbackState]);

  const unfollowCurrentPlaylist = useCallback(async () => {
    if (isDisabled || !tokenRef.current || !playbackState?.context?.uri) {
      console.warn('No token or current playlist to unfollow, or provider disabled.');
      setError(
        'No playlist is currently playing to unfollow, or user session is invalid, or provider disabled.'
      );
      return;
    }
    const currentPlaylistId = playbackState.context.uri.split(':')[2];

    try {
      setError(null);
      await unfollowPlaylistAPI(tokenRef.current, currentPlaylistId);
      setIsCurrentPlaylistFollowed(false);
      toast.success('Playlist unfollowed.');
    } catch (err) {
      console.error('[MusicContext] Error unfollowing playlist:', err);
      const errorMsg = 'Failed to unfollow playlist. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsCurrentPlaylistFollowed(true);
    }
  }, [isDisabled, tokenRef, playbackState]);

  // Effect for Spotify SDK Ready
  useEffect(() => {
    if (isDisabled) return;

    console.log('[MusicContext SDKListenerEffect] Attaching onSpotifyWebPlaybackSDKReady.');
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('[MusicContext SDKListenerEffect] onSpotifyWebPlaybackSDKReady FIRED.');
      setSdkReady(true);
    };
    return () => {
      if (isDisabled) return;
      console.log(
        '[MusicContext SDKListenerEffect] Cleanup. Removing onSpotifyWebPlaybackSDKReady.'
      );
      window.onSpotifyWebPlaybackSDKReady = () => {};
    };
  }, [isDisabled]);

  const lastProcessedTrackIdRef = useRef<string | null>(null);

  const getOAuthToken: Spotify.PlayerInit['getOAuthToken'] = useCallback(
    async (cb) => {
      if (isDisabled) {
        console.warn(
          '[MusicContext getOAuthToken] Provider disabled. Calling cb with empty string.'
        );
        cb('');
        return;
      }
      console.log('[MusicContext getOAuthToken] Called.');
      if (!userSession.spotifyToken && !userSession.isLoading) {
        console.error(
          '[MusicContext getOAuthToken] No Spotify token in user session. Calling cb with empty string.'
        );
        cb('');
        return;
      }

      const token = await getValidSpotifyToken();
      console.log(
        '[MusicContext getOAuthToken] Token from getValidSpotifyToken:',
        token ? '****** (exists)' : null
      );
      if (token) {
        cb(token);
      } else {
        console.error(
          '[MusicContext getOAuthToken] Failed to get a valid Spotify token after attempting retrieval/refresh. Calling cb with empty string.'
        );
        cb('');
      }
    },
    [userSession.spotifyToken, userSession.isLoading, isDisabled]
  );

  useEffect(() => {
    if (isDisabled) return; // Prevent player initialization if disabled

    const effectId = Date.now(); // Unique ID for this effect run
    console.log(
      `[MusicContext PlayerInitEffect ${effectId}] Running. sdkReady: ${sdkReady}, userSession.isLoading: ${userSession.isLoading}, userSession.spotifyToken: ${!!userSession.spotifyToken}`
    );

    if (!sdkReady || userSession.isLoading || !userSession.spotifyToken) {
      if (playerRef.current) {
        console.log(
          `[MusicContext PlayerInitEffect ${effectId}] Conditions not met (SDK ready/session loaded/token present). Disconnecting existing player.`
        );
        playerRef.current.disconnect();
        setPlayer(null);
        playerRef.current = null;
        setIsReady(false);
        setPlaybackState(null);
        setDeviceId(null);
      }
      return;
    }

    if (playerRef.current) {
      console.log(
        `[MusicContext PlayerInitEffect ${effectId}] Player already exists and conditions met. Skipping re-initialization.`
      );
      return;
    }

    console.log(
      `[MusicContext PlayerInitEffect ${effectId}] Conditions met. Attempting to initialize new Spotify.Player.`
    );

    const newPlayer = new window.Spotify.Player({
      name: 'Playlist Chat Rooms Player',
      getOAuthToken: getOAuthToken,
      volume: 0.5,
    });

    console.log(`[MusicContext PlayerInitEffect ${effectId}] Attaching listeners to new player.`);

    newPlayer.addListener('ready', async ({ device_id }) => {
      console.log(
        `[MusicContext PlayerInitEffect ${effectId}] Player ready. Device ID: ${device_id}`
      );
      setDeviceId(device_id);
      setIsReady(true);
      setError(null);
      try {
        const volume = await newPlayer.getVolume();
        setCurrentVolumePercent(Math.round(volume * 100));
        setPreMuteVolume(volume);
      } catch (e) {
        console.error(
          `[MusicContext PlayerInitEffect ${effectId}] Error getting initial volume:`,
          e
        );
      }
      newPlayer.getCurrentState().then((initialStateFromGet) => {
        if (initialStateFromGet) {
          setPlaybackState(initialStateFromGet);
        }
      });
    });

    newPlayer.addListener('not_ready', ({ device_id }) => {
      console.log(
        `[MusicContext PlayerInitEffect ${effectId}] Device ID has gone offline: ${device_id}`
      );
      setIsReady(false);
      setDeviceId(null);
      lastProcessedTrackIdRef.current = null;
    });

    newPlayer.addListener('player_state_changed', async (sdkPlaybackState) => {
      if (!sdkPlaybackState) {
        console.warn(
          `[MusicContext PlayerInitEffect ${effectId}][player_state_changed] State is null. Clearing playbackState.`
        );
        setPlaybackState(null);
        lastProcessedTrackIdRef.current = null;
        return;
      }
      const currentSdkTrack = sdkPlaybackState.track_window.current_track;
      const currentSdkTrackId = currentSdkTrack?.id;
      if (!currentSdkTrackId) {
        console.log(
          `[MusicContext PlayerInitEffect ${effectId}][player_state_changed] No track ID. Updating state.`
        );
        setPlaybackState(sdkPlaybackState);
        lastProcessedTrackIdRef.current = null;
        return;
      }
      if (currentSdkTrackId === lastProcessedTrackIdRef.current) {
        setPlaybackState(sdkPlaybackState);
        return;
      }
      lastProcessedTrackIdRef.current = currentSdkTrackId;
      const currentToken = tokenRef.current;
      if (!currentToken) {
        console.error(
          `[MusicContext PlayerInitEffect ${effectId}][player_state_changed] No token for track ${currentSdkTrackId}`
        );
        setPlaybackState(sdkPlaybackState);
        return;
      }
      try {
        const resolvedTrackInfoFromAPI: SpotifyApiTrackFull | null = await fetchSpotifyTrackAPI(
          currentToken,
          currentSdkTrackId
        );
        if (resolvedTrackInfoFromAPI === undefined) {
          console.log('resolvedTrackInfoFromAPI is undefined, this should not happen');
        }

        if (resolvedTrackInfoFromAPI) {
          if (resolvedTrackInfoFromAPI.is_playable) {
            let finalTrackForState = mapApiTrackToSdkTrack(resolvedTrackInfoFromAPI);
            if (
              resolvedTrackInfoFromAPI.linked_from &&
              resolvedTrackInfoFromAPI.id !== currentSdkTrackId
            ) {
              toast.info(
                `Track "${currentSdkTrack.name}" relinked to: ${resolvedTrackInfoFromAPI.name}`
              );
            }
            if (currentSdkTrack.id === resolvedTrackInfoFromAPI.id) {
              finalTrackForState = currentSdkTrack;
            }

            const updatedPlaybackState: Spotify.PlaybackState = {
              ...sdkPlaybackState,
              track_window: { ...sdkPlaybackState.track_window, current_track: finalTrackForState },
            };
            setPlaybackState(updatedPlaybackState);
          } else {
            const trackName = resolvedTrackInfoFromAPI.name || currentSdkTrack.name;
            const reason = resolvedTrackInfoFromAPI.restrictions?.reason;
            const message = `Track "${trackName}" is not available${reason ? ` (${reason})` : ''}.`;
            toast.error(message);
            setError(message);
            playerRef.current
              ?.nextTrack()
              .catch((e) => console.error('Error skipping unplayable track:', e));
          }
        } else {
          setPlaybackState(sdkPlaybackState);
        }
      } catch (error) {
        console.error(
          `[MusicContext PlayerInitEffect ${effectId}][player_state_changed] Error fetching track ${currentSdkTrackId}:`,
          error
        );
        setPlaybackState(sdkPlaybackState);
      }
    });

    newPlayer.addListener('initialization_error', ({ message }) => {
      console.error(`[MusicContext PlayerInitEffect ${effectId}] Initialization Error:`, message);
      setError(`Initialization Error: ${message}`);
      setIsReady(false);
    });

    newPlayer.addListener('authentication_error', async ({ message }) => {
      console.error(`[MusicContext PlayerInitEffect ${effectId}] Authentication Error:`, message);
      setError(
        'Spotify authentication error. Your session might be invalid. Please try signing out and in again.'
      );
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      setPlayer(null);
      playerRef.current = null;
      setIsReady(false);
      setPlaybackState(null);
      setDeviceId(null);
    });
    newPlayer.addListener('account_error', ({ message }) => {
      console.error(`[MusicContext PlayerInitEffect ${effectId}] Account Error:`, message);
      setError(`Spotify account error: ${message}.`);
      toast.error(`Spotify account error: ${message}`);
    });
    newPlayer.addListener('playback_error', ({ message }) => {
      console.error(`[MusicContext PlayerInitEffect ${effectId}] Playback Error:`, message);
      setError(`Spotify playback error: ${message}`);
      toast.error(`Spotify playback error: ${message}`);
    });

    console.log(`[MusicContext PlayerInitEffect ${effectId}] Connecting new player.`);
    newPlayer
      .connect()
      .then((success) => {
        if (success) {
          console.log(`[MusicContext PlayerInitEffect ${effectId}] Player connected successfully.`);
        }
      })
      .catch((err) => {
        console.error(`[MusicContext PlayerInitEffect ${effectId}] Error connecting player:`, err);
        setError(`Error connecting: ${err instanceof Error ? err.message : String(err)}`);
      });

    setPlayer(newPlayer);
    playerRef.current = newPlayer;

    newPlayer.getCurrentState().then((initialPlayerState) => {
      if (initialPlayerState) {
        newPlayer
          .getVolume()
          .then((volume) => {
            setCurrentVolumePercent(Math.round(volume * 100));
            setPreMuteVolume(volume);
          })
          .catch((e) =>
            console.error(
              `[MusicContext PlayerInitEffect ${effectId}] Error getting volume on connect:`,
              e
            )
          );
      }
    });

    return () => {
      console.log(`[MusicContext PlayerInitEffect ${effectId}] Cleanup. Disconnecting player.`);
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      setPlayer(null);
      playerRef.current = null;
      setIsReady(false);
    };
  }, [sdkReady, getOAuthToken, userSession.isLoading, userSession.spotifyToken, isDisabled]);

  useEffect(() => {
    if (isDisabled) return; // Prevent playlist fetching if disabled
    // The call to fetch dynamic playlists will be handled by another useEffect
    // that depends on user session, SDK readiness, etc.
  }, [isDisabled]);

  // Effect to trigger fetching taste-matched playlists
  useEffect(() => {
    if (isDisabled || !isReady || !deviceId || !userSession.spotifyToken || !userSession.userId) {
      // console.log(
      //   '[MusicContext PlaylistFetchEffect] Conditions NOT YET MET for fetching playlists or provider disabled.',
      //   { isDisabled, isReady, deviceId, token: !!userSession.spotifyToken, userId: !!userSession.userId }
      // );
      return;
    }
    console.log(
      '[MusicContext PlaylistFetchEffect] Conditions met, calling fetchAndSetTasteMatchedPlaylists.'
    );
    fetchAndSetTasteMatchedPlaylists().catch((err) => {
      console.error(
        '[MusicContext PlaylistFetchEffect] Unhandled error calling fetchAndSetTasteMatchedPlaylists:',
        err
      );
    });
  }, [
    isDisabled,
    isReady,
    deviceId,
    userSession.spotifyToken,
    userSession.userId,
    fetchAndSetTasteMatchedPlaylists,
  ]);

  // Effect to auto-play the first taste-matched playlist
  useEffect(() => {
    if (
      isDisabled ||
      !isReady ||
      !deviceId ||
      !userSession.spotifyToken ||
      tasteMatchedPlaylists.length === 0 ||
      currentPlaylistIndex !== null ||
      initialPlaylistAutoPlayedRef.current ||
      typeof playPlaylist !== 'function'
    ) {
      return;
    }
    console.log(
      '[MusicContext AutoPlayEffect] Conditions met, attempting to play initial playlist.'
    );
    playPlaylist(tasteMatchedPlaylists[0], 0)
      .then(() => {
        console.log('[MusicContext AutoPlayEffect] Initial playlist playback started.');
        initialPlaylistAutoPlayedRef.current = true;
      })
      .catch((err) => {
        console.error('[MusicContext AutoPlayEffect] Error auto-playing initial playlist:', err);
        initialPlaylistAutoPlayedRef.current = true;
      });
  }, [
    isDisabled,
    isReady,
    deviceId,
    userSession.spotifyToken,
    tasteMatchedPlaylists,
    currentPlaylistIndex,
    playPlaylist,
  ]);

  useEffect(() => {
    if (isDisabled) return;

    const currentTrackId = playbackState?.track_window?.current_track?.id;
    const contextUri = playbackState?.context?.uri;
    const currentPlaylistId = contextUri?.startsWith('spotify:playlist:')
      ? contextUri.split(':')[2]
      : null;

    if (currentTrackId) checkIfTrackIsSaved(currentTrackId).catch(console.error);
    else setIsCurrentTrackSaved(null);

    if (currentPlaylistId && userSession.userSpotifyId)
      checkIfPlaylistIsFollowed(currentPlaylistId).catch(console.error);
    else setIsCurrentPlaylistFollowed(null);
  }, [
    playbackState,
    userSession.userSpotifyId,
    checkIfTrackIsSaved,
    checkIfPlaylistIsFollowed,
    isDisabled,
  ]);

  useEffect(() => {
    if (isDisabled) {
      // If disabled, reset all relevant states to their initial/inert values.
      setUserSession({
        spotifyToken: null,
        userSpotifyId: null,
        userId: null,
        isLoading: false, // Not loading if disabled.
        error: null,
      });
      tokenRef.current = null;
      if (playerRef.current) {
        playerRef.current.disconnect();
        setPlayer(null);
        playerRef.current = null;
      }
      setIsReady(false);
      setPlaybackState(null);
      setDeviceId(null);
      setCurrentVolumePercent(50);
      setError(null);
      setTasteMatchedPlaylists([]);
      setCurrentPlaylistIndex(null);
      setCurrentPlaylistName(null);
      setIsCurrentTrackSaved(null);
      setIsCurrentPlaylistFollowed(null);
      initialPlaylistAutoPlayedRef.current = false;
      lastProcessedTrackIdRef.current = null;
      // No new subscriptions to set up, so no specific cleanup function needed from this path.
      return;
    }

    console.log(
      '[MusicContext UserSessionEffect] Initializing and subscribing to user session changes (since not disabled).'
    );
    const cleanupFromInitializeUserSession = initializeUserSession(); // From user-session.ts

    const unsubscribeFromMusicContextListener = subscribeToUserSession((newSessionState) => {
      setUserSession(newSessionState);
      tokenRef.current = newSessionState.spotifyToken;

      const sessionError = newSessionState.error;
      const isExpectedError =
        sessionError === 'Auth session missing!' ||
        sessionError === 'Spotify token not available from session.';
      const isActualError = sessionError && !isExpectedError;

      setError((prevError) => {
        if (isActualError) {
          if (prevError !== sessionError) {
            console.warn('[MusicContext] User session has an unexpected error:', sessionError);
            return sessionError;
          }
        } else {
          if (prevError !== null) {
            console.log(
              '[MusicContext] Clearing its own error state as user session error is null or expected.'
            );
            return null;
          }
        }
        return prevError; // No change to error state
      });

      if (!newSessionState.isLoading && !newSessionState.spotifyToken) {
        console.log(
          '[MusicContext UserSessionEffect] Token lost or user signed out. Cleaning up MusicContext state.'
        );
        if (playerRef.current) {
          playerRef.current.disconnect();
          setPlayer(null);
          playerRef.current = null;
        }
        setIsReady(false);
        setPlaybackState(null);
        setDeviceId(null);
        setCurrentVolumePercent(50);
        // setError(null); // Handled by the logic above based on newSessionState.error
        setTasteMatchedPlaylists([]);
        setCurrentPlaylistIndex(null);
        setCurrentPlaylistName(null);
        setIsCurrentTrackSaved(null);
        setIsCurrentPlaylistFollowed(null);
        initialPlaylistAutoPlayedRef.current = false;
        lastProcessedTrackIdRef.current = null;
      }
    });

    // This is the cleanup function for the effect when isDisabled is false
    return () => {
      console.log(
        '[MusicContext UserSessionEffect] Cleaning up user session subscriptions (due to unmount or isDisabled change).'
      );
      cleanupFromInitializeUserSession();
      unsubscribeFromMusicContextListener();
    };
  }, [isDisabled]); // Dependency array only contains isDisabled

  // Conditionally provide the active context or the initial (inert) state
  const contextValue: MusicContextState = isDisabled
    ? initialState
    : {
        player,
        deviceId,
        isReady,
        playbackState,
        currentVolumePercent,
        error,
        nextTrack,
        previousTrack,
        setVolume,
        toggleMute,
        toggleShuffle,
        tasteMatchedPlaylists,
        currentPlaylistIndex,
        currentPlaylistName,
        playPlaylist,
        nextPlaylist,
        previousPlaylist,
        isCurrentTrackSaved,
        isCurrentPlaylistFollowed,
        userSpotifyId: userSession.userSpotifyId,
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
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
