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
import { createClient } from '@/lib/supabase/client';
import { Playlist } from '@/types/spotify'; // Import Playlist type
import { toast } from 'sonner'; // Import sonner

// Define the shape of the context state
interface MusicContextState {
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
}

// Define the initial state
const initialState: MusicContextState = {
  player: null,
  deviceId: null,
  isReady: false,
  playbackState: null,
  currentVolumePercent: 50,
  error: null,

  // User Info Init
  userSpotifyId: null,

  // Playlist State Init
  tasteMatchedPlaylists: [],
  currentPlaylistIndex: null,
  currentPlaylistName: null,

  // Save/Follow State Init
  isCurrentTrackSaved: null,
  isCurrentPlaylistFollowed: null,

  // Initialize control functions
  nextTrack: async () => {
    console.warn('Next track function not implemented yet.');
  },
  previousTrack: async () => {
    console.warn('Previous track function not implemented yet.');
  },
  setVolume: async () => {
    console.warn('Set volume function not implemented yet.');
  },
  toggleMute: async () => {
    console.warn('Toggle mute function not implemented yet.');
  },
  toggleShuffle: async () => {
    console.warn('Toggle shuffle function not implemented yet.');
  },

  // Initialize Playlist control functions
  playPlaylist: async () => {
    console.warn('Play playlist function not implemented yet.');
  },
  nextPlaylist: async () => {
    console.warn('Next playlist function not implemented yet.');
  },
  previousPlaylist: async () => {
    console.warn('Previous playlist function not implemented yet.');
  },

  // Initialize Save/Follow Methods
  checkIfTrackIsSaved: async () => {
    console.warn('checkIfTrackIsSaved function not implemented yet.');
  },
  saveCurrentTrack: async () => {
    console.warn('saveCurrentTrack function not implemented yet.');
  },
  unsaveCurrentTrack: async () => {
    console.warn('unsaveCurrentTrack function not implemented yet.');
  },
  checkIfPlaylistIsFollowed: async () => {
    console.warn('checkIfPlaylistIsFollowed function not implemented yet.');
  },
  followCurrentPlaylist: async () => {
    console.warn('followCurrentPlaylist function not implemented yet.');
  },
  unfollowCurrentPlaylist: async () => {
    console.warn('unfollowCurrentPlaylist function not implemented yet.');
  },
};

// Create the context
const MusicContext = createContext<MusicContextState>(initialState);

// Define Props for the Provider
interface MusicProviderProps {
  children: ReactNode;
}

// Define Mock Playlists (Task 2)
const MOCK_PLAYLISTS: Playlist[] = [
  { spotify_id: '37i9dQZF1DX8UebctCUYSo', name: 'Chill Lofi Study Beats' },
  { spotify_id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano' },
  { spotify_id: '37i9dQZF1DX2TRYkJECvfC', name: 'Deep House Relax' },
  // Add more mocks if needed
];

// Create the Provider Component
export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [playbackState, setPlaybackState] = useState<Spotify.PlaybackState | null>(null);
  const [currentVolumePercent, setCurrentVolumePercent] = useState<number | null>(50);
  const [error, setError] = useState<string | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const playerRef = useRef<Spotify.Player | null>(null); // Ref to hold player instance
  const [sdkReady, setSdkReady] = useState(false);
  const [preMuteVolume, setPreMuteVolume] = useState<number>(0.5); // Task 1.4: Add state for pre-mute volume, default 0.5

  // Playlist State
  const [tasteMatchedPlaylists, setTasteMatchedPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number | null>(null);
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string | null>(null);

  // Save/Follow State
  const [isCurrentTrackSaved, setIsCurrentTrackSaved] = useState<boolean | null>(null);
  const [isCurrentPlaylistFollowed, setIsCurrentPlaylistFollowed] = useState<boolean | null>(null);

  // User Info
  const [userSpotifyId, setUserSpotifyId] = useState<string | null>(null);

  // --- Spotify API Call Helpers (Internal to Context) ---

  const makeSpotifyApiCall = useCallback(
    async (endpoint: string, method: string = 'GET', body?: unknown) => {
      const token = tokenRef.current;
      if (!token) {
        throw new Error('Spotify token not available for API call.');
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
      };
      if (body && (method === 'POST' || method === 'PUT')) {
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
          errorBody = await response.text();
        } catch {
          /* ignore */
        }
        throw new Error(
          `Spotify API Error (${response.status}): ${response.statusText}. Body: ${errorBody}`
        );
      }

      // For calls that return no content (e.g., PUT/DELETE success with 204)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null;
      }

      return await response.json();
    },
    []
  ); // Depends only on tokenRef, which is stable

  // --- Save/Follow Check/Action Methods ---

  const checkIfTrackIsSaved = useCallback(
    async (trackId: string) => {
      if (!trackId) {
        // console.log('[checkIfTrackIsSaved] No trackId, setting state to null');
        setIsCurrentTrackSaved(null);
        return;
      }
      // console.log(`[checkIfTrackIsSaved] Checking track: ${trackId}`);
      try {
        const result: boolean[] = await makeSpotifyApiCall(`/me/tracks/contains?ids=${trackId}`);
        // console.log(`[checkIfTrackIsSaved] API Result for ${trackId}:`, result);
        if (Array.isArray(result) && typeof result[0] === 'boolean') {
          setIsCurrentTrackSaved(result[0]);
        } else {
          console.warn('[checkIfTrackIsSaved] Unexpected response format:', result);
          setIsCurrentTrackSaved(null);
        }
      } catch (err) {
        console.error('[checkIfTrackIsSaved] Error:', err);
        setIsCurrentTrackSaved(null); // Set to null on error
      }
    },
    [makeSpotifyApiCall]
  );

  const saveCurrentTrack = useCallback(async () => {
    const currentTrackId = playbackState?.track_window?.current_track?.id;
    if (!currentTrackId) {
      console.warn('No current track to save.');
      setError('No track is currently playing to save.'); // User feedback
      return;
    }
    try {
      setError(null); // Clear previous errors
      await makeSpotifyApiCall(`/me/tracks?ids=${currentTrackId}`, 'PUT');
      setIsCurrentTrackSaved(true);
      toast.success('Track saved to your Liked Songs!'); // Success toast
      console.log('Track saved successfully:', currentTrackId);
    } catch (err) {
      console.error('Error saving track:', err);
      const errorMsg = 'Failed to save track. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg); // Error toast
      setIsCurrentTrackSaved(false); // Assume failed, state might be out of sync
    }
  }, [makeSpotifyApiCall, playbackState, setIsCurrentTrackSaved]);

  const unsaveCurrentTrack = useCallback(async () => {
    const currentTrackId = playbackState?.track_window?.current_track?.id;
    if (!currentTrackId) {
      console.warn('No current track to unsave.');
      setError('No track is currently playing to unsave.');
      return;
    }
    try {
      setError(null); // Clear previous errors
      await makeSpotifyApiCall(`/me/tracks?ids=${currentTrackId}`, 'DELETE');
      setIsCurrentTrackSaved(false);
      toast.success('Track removed from your Liked Songs.'); // Success toast
      console.log('Track unsaved successfully:', currentTrackId);
    } catch (err) {
      console.error('Error unsaving track:', err);
      const errorMsg = 'Failed to unsave track. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg); // Error toast
      setIsCurrentTrackSaved(true); // Assume failed, state might be out of sync
    }
  }, [makeSpotifyApiCall, playbackState, setIsCurrentTrackSaved]);

  const checkIfPlaylistIsFollowed = useCallback(
    async (playlistId: string) => {
      if (!playlistId || !userSpotifyId) {
        // console.log('[checkIfPlaylistIsFollowed] No playlistId or userSpotifyId, setting state to null');
        setIsCurrentPlaylistFollowed(null);
        return;
      }
      // console.log(`[checkIfPlaylistIsFollowed] Checking playlist: ${playlistId} for user: ${userSpotifyId}`);
      try {
        const result: boolean[] = await makeSpotifyApiCall(
          `/playlists/${playlistId}/followers/contains?ids=${userSpotifyId}`
        );
        // console.log(`[checkIfPlaylistIsFollowed] API Result for ${playlistId}:`, result);
        if (Array.isArray(result) && typeof result[0] === 'boolean') {
          setIsCurrentPlaylistFollowed(result[0]);
        } else {
          console.warn('[checkIfPlaylistIsFollowed] Unexpected response format:', result);
          setIsCurrentPlaylistFollowed(null);
        }
      } catch (err) {
        console.error('[checkIfPlaylistIsFollowed] Error:', err);
        setIsCurrentPlaylistFollowed(null); // Set to null on error
      }
    },
    [makeSpotifyApiCall, userSpotifyId]
  );

  const followCurrentPlaylist = useCallback(async () => {
    const currentPlaylistId = playbackState?.context?.uri?.split(':')[2];
    if (!currentPlaylistId) {
      console.warn('No current playlist to follow.');
      setError('No playlist is currently playing to follow.'); // User feedback
      return;
    }
    try {
      setError(null);
      await makeSpotifyApiCall(`/playlists/${currentPlaylistId}/followers`, 'PUT');
      setIsCurrentPlaylistFollowed(true);
      toast.success('Playlist followed!'); // Success toast
      console.log('Playlist followed successfully:', currentPlaylistId);
    } catch (err) {
      console.error('Error following playlist:', err);
      const errorMsg = 'Failed to follow playlist. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg); // Error toast
      setIsCurrentPlaylistFollowed(false); // Assume failure
    }
  }, [makeSpotifyApiCall, playbackState, setIsCurrentPlaylistFollowed]);

  const unfollowCurrentPlaylist = useCallback(async () => {
    const currentPlaylistId = playbackState?.context?.uri?.split(':')[2];
    if (!currentPlaylistId) {
      console.warn('No current playlist to unfollow.');
      setError('No playlist is currently playing to unfollow.'); // User feedback
      return;
    }
    try {
      setError(null);
      await makeSpotifyApiCall(`/playlists/${currentPlaylistId}/followers`, 'DELETE');
      setIsCurrentPlaylistFollowed(false);
      toast.success('Playlist unfollowed.'); // Success toast
      console.log('Playlist unfollowed successfully:', currentPlaylistId);
    } catch (err) {
      console.error('Error unfollowing playlist:', err);
      const errorMsg = 'Failed to unfollow playlist. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg); // Error toast
      setIsCurrentPlaylistFollowed(true); // Assume failure
    }
  }, [makeSpotifyApiCall, playbackState, setIsCurrentPlaylistFollowed]);

  // Effect for session handling (Task 3)
  useEffect(() => {
    const supabase = createClient();
    let profileListener: ReturnType<typeof supabase.channel> | null = null;

    // Function to fetch profile and start listener
    const setupProfile = async (userId: string) => {
      // Fetch initial profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('spotify_user_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setUserSpotifyId(null);
      } else {
        setUserSpotifyId(profile?.spotify_user_id || null);
      }

      // Listen for profile changes (e.g., if spotify_user_id gets updated later)
      profileListener = supabase
        .channel('public:profiles:id=eq.' + userId)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => {
            console.log('Profile changed:', payload);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedProfile = payload.new as any;
            if (updatedProfile && typeof updatedProfile.spotify_user_id === 'string') {
              setUserSpotifyId(updatedProfile.spotify_user_id);
            }
          }
        )
        .subscribe();
    };

    // Unsubscribe function
    const cleanupListeners = () => {
      if (profileListener) {
        supabase.removeChannel(profileListener).catch(console.error);
        profileListener = null;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentToken = session?.provider_token || null;
      tokenRef.current = currentToken;
      setSpotifyToken(currentToken);

      // Cleanup old profile listener before setting up new one
      cleanupListeners();

      if (!currentToken || !session?.user) {
        console.log('No Spotify token / Signed out.');
        playerRef.current?.disconnect(); // Disconnect player via ref
        setPlayer(null);
        playerRef.current = null;
        setDeviceId(null);
        setIsReady(false);
        setPlaybackState(null);
        setUserSpotifyId(null); // Clear user info on logout
        setError(event === 'SIGNED_OUT' ? null : 'Spotify token not available.');
      } else {
        // User logged in or session refreshed, setup profile
        await setupProfile(session.user.id);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentToken = session?.provider_token || null;
      tokenRef.current = currentToken;
      setSpotifyToken(currentToken);
      if (!currentToken && session) setError('Spotify token not available in initial session.');
      // Also fetch profile on initial load if session exists
      if (session?.user) {
        await setupProfile(session.user.id);
      }
    });

    return () => {
      subscription?.unsubscribe();
      cleanupListeners(); // Cleanup profile listener on component unmount
    };
  }, []);

  // getOAuthToken callback (Task 4)
  const getOAuthToken: Spotify.PlayerInit['getOAuthToken'] = useCallback(async (cb) => {
    const token = tokenRef.current;
    if (token) cb(token);
    else cb(''); // Ensure cb is always called, even with an empty string if no token
  }, []);

  // Effect to define onSpotifyWebPlaybackSDKReady and initialize player
  useEffect(() => {
    // Define the global callback for the Spotify SDK
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('Spotify SDK is ready via onSpotifyWebPlaybackSDKReady.');
      setSdkReady(true);
    };

    // Cleanup the global callback when the component unmounts
    return () => {
      window.onSpotifyWebPlaybackSDKReady = () => {}; // Set to an empty function
    };
  }, []); // Runs once on mount

  // Effect to initialize Spotify Player & Add Listeners when SDK is ready and token is available
  useEffect(() => {
    if (!sdkReady || !spotifyToken) {
      if (sdkReady && !spotifyToken && playerRef.current) {
        // SDK became ready, but token was lost (e.g. logout before player init)
        // Or token became invalid after player was initialized
        console.log('SDK ready but no token, or token lost. Disconnecting player.');
        playerRef.current?.disconnect();
        setPlayer(null);
        playerRef.current = null;
        setIsReady(false);
        // setDeviceId(null); // Keep deviceId if player was already ready once? Or clear?
        // setPlaybackState(null);
      }
      return;
    }
    if (playerRef.current) return; // Already initialized

    console.log('Spotify SDK is marked ready and token is available. Initializing player...');

    const newPlayer = new window.Spotify.Player({
      name: 'Playlist Chat Rooms Player',
      getOAuthToken: getOAuthToken,
      volume: 0.5,
    });

    // === Setup Event Listeners (Task 6) ===
    newPlayer.addListener('ready', async ({ device_id }) => {
      console.log('Spotify Player Ready with Device ID', device_id);
      setDeviceId(device_id);
      setIsReady(true);
      setError(null);

      try {
        const volume = await newPlayer.getVolume();
        setCurrentVolumePercent(Math.round(volume * 100));
        setPreMuteVolume(volume); // Store initial volume as 0.0-1.0
      } catch (e) {
        console.error('Error getting initial volume:', e);
      }

      // Attempt to get initial state
      newPlayer.getCurrentState().then((initialStateFromGet) => {
        // Renamed to avoid conflict
        if (initialStateFromGet) {
          console.log('Got initial state after ready:', initialStateFromGet);
          setPlaybackState(initialStateFromGet);
        } else {
          console.log('Initial state after ready was null.');
        }
      });
    });

    newPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
      setIsReady(false);
      // Maybe clear deviceId here? Depends on desired behavior
      // setDeviceId(null);
    });

    newPlayer.addListener('player_state_changed', (state) => {
      if (!state) {
        console.warn(
          'Player state changed, but state is null. Setting context playbackState to null.'
        );
        setPlaybackState(null);
        return;
      }
      console.log(
        'Player state changed:',
        state.track_window.current_track?.name,
        'Paused:',
        state.paused,
        'Shuffle:',
        state.shuffle // Volume is not reliably here
      );
      setPlaybackState(state);
      // Optionally, try to get volume again if player is an active device, but be careful with too many calls
      // For now, volume updates primarily through direct actions (setVolume, toggleMute) or on 'ready'
    });

    newPlayer.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize Spotify Player:', message);
      setError(`Initialization Error: ${message}`);
      setIsReady(false);
    });

    newPlayer.addListener('authentication_error', ({ message }) => {
      console.error('Spotify Player Authentication Failed:', message);
      setError(`Authentication Error: ${message}`);
      setIsReady(false);
      // Token might be expired/invalid, prompt re-auth or rely on session refresh
    });

    newPlayer.addListener('account_error', ({ message }) => {
      console.error('Spotify Player Account Error:', message);
      setError(`Account Error: ${message}`);
      setIsReady(false);
      // E.g., User needs Premium
    });

    newPlayer.addListener('playback_error', ({ message }) => {
      console.error('Spotify Player Playback Error:', message);
      setError(`Playback Error: ${message}`);
    });
    // =======================================

    newPlayer
      .connect()
      .then((success) => {
        if (success) {
          console.log('Spotify Player connected successfully!');
          // Note: setPlayer and playerRef update handled after connect
        } else {
          console.error('Spotify Player failed to connect.');
          setError('Failed to connect Spotify Player.');
        }
      })
      .catch((err) => {
        console.error('Error connecting Spotify Player:', err);
        setError(
          `Error connecting Spotify Player: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    setPlayer(newPlayer);
    playerRef.current = newPlayer; // Store in ref

    // Store initial volume for preMuteVolume if player is ready and has state
    newPlayer.getCurrentState().then((initialPlayerState) => {
      if (initialPlayerState) {
        // If there's an initial state, also try to get initial volume directly
        newPlayer
          .getVolume()
          .then((volume) => {
            setCurrentVolumePercent(Math.round(volume * 100));
            setPreMuteVolume(volume); // Store as 0.0-1.0
          })
          .catch((e) => console.error('Error getting volume on initial state:', e));
      }
    });

    return () => {
      console.log('Cleaning up Spotify Player instance (from main init effect).');
      playerRef.current?.disconnect();
      setPlayer(null);
      playerRef.current = null;
      // Reset other states if needed upon player cleanup
      // setIsReady(false);
      // setDeviceId(null);
      // setPlaybackState(null);
    };
  }, [sdkReady, spotifyToken, getOAuthToken]); // Depend on sdkReady, token and callback

  // Effect to load mock playlists (Task 2)
  useEffect(() => {
    // TODO: Replace this with actual logic to fetch taste-matched playlists from Epic 2
    console.log('[MusicContext] Loading MOCK playlists for development.');
    setTasteMatchedPlaylists(MOCK_PLAYLISTS);

    // Optionally set the first playlist as current initially? Or wait for user action?
    // For now, we won't auto-set the current index/name.
  }, []); // Runs once on mount

  // === Player Control Methods (Task 1) ===

  const nextTrack = useCallback(async () => {
    if (!playerRef.current || !isReady) {
      console.warn('Player not ready or not available for nextTrack');
      setError('Player not ready for next track.');
      return;
    }
    try {
      await playerRef.current.nextTrack();
      console.log('nextTrack called');
      setError(null);
    } catch (e) {
      console.error('Error calling nextTrack:', e);
      setError('Error skipping to next track.');
    }
  }, [isReady]);

  const previousTrack = useCallback(async () => {
    if (!playerRef.current || !isReady) {
      console.warn('Player not ready or not available for previousTrack');
      setError('Player not ready for previous track.');
      return;
    }
    try {
      await playerRef.current.previousTrack();
      console.log('previousTrack called');
      setError(null);
    } catch (e) {
      console.error('Error calling previousTrack:', e);
      setError('Error skipping to previous track.');
    }
  }, [isReady]);

  const setVolume = useCallback(
    async (volume: number) => {
      if (!playerRef.current || !isReady) {
        console.warn('Player not ready or not available for setVolume');
        setError('Player not ready to set volume.');
        return;
      }
      const clampedVolume = Math.max(0, Math.min(1, volume)); // volume is 0.0 - 1.0
      try {
        await playerRef.current.setVolume(clampedVolume);
        console.log('setVolume called with:', clampedVolume);
        setCurrentVolumePercent(Math.round(clampedVolume * 100));
        // Update preMuteVolume if not muting
        if (clampedVolume > 0) {
          setPreMuteVolume(clampedVolume);
        }
        setError(null);
      } catch (e) {
        console.error('Error calling setVolume:', e);
        setError('Error setting volume.');
      }
    },
    [isReady]
  );

  const toggleMute = useCallback(async () => {
    if (!playerRef.current || !isReady) {
      console.warn('Player not ready or not available for toggleMute');
      setError('Player not ready to toggle mute.');
      return;
    }
    try {
      const currentVolume = await playerRef.current.getVolume(); // Get current volume directly
      if (currentVolume > 0) {
        // Store current volume before muting, then mute
        setPreMuteVolume(currentVolume);
        await playerRef.current.setVolume(0);
        setCurrentVolumePercent(0);
        console.log('toggleMute: Muted');
      } else {
        // Unmute to preMuteVolume (or a default if preMuteVolume is 0)
        const volumeToRestore = preMuteVolume > 0 ? preMuteVolume : 0.5;
        await playerRef.current.setVolume(volumeToRestore);
        setCurrentVolumePercent(Math.round(volumeToRestore * 100));
        console.log('toggleMute: Unmuted to', volumeToRestore);
      }
      setError(null);
    } catch (e) {
      console.error('Error calling toggleMute:', e);
      setError('Error toggling mute.');
    }
  }, [isReady, preMuteVolume]);

  const toggleShuffle = useCallback(async () => {
    if (!isReady || !deviceId || !tokenRef.current || playbackState === null) {
      console.warn(
        'Player not ready, deviceId, token or playbackState not available for toggleShuffle'
      );
      setError('Player not ready to toggle shuffle.');
      return;
    }
    const currentShuffleState = playbackState.shuffle;
    const newShuffleState = !currentShuffleState;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${newShuffleState}&device_id=${deviceId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        console.log(`Shuffle state set to ${newShuffleState}`);
        // Optimistically update playbackState or wait for player_state_changed event
        // For now, we rely on player_state_changed event to update the UI
        setError(null);
      } else {
        const errorBody = await response.text();
        console.error(
          `Error setting shuffle state to ${newShuffleState}: ${response.status}`,
          errorBody
        );
        setError(`Error setting shuffle: ${response.statusText}`);
      }
    } catch (e) {
      console.error('Exception calling toggleShuffle:', e);
      setError('Error toggling shuffle.');
    }
  }, [isReady, deviceId, playbackState]);

  // === Playlist Control Methods ===

  // Task 3: Implement playPlaylist
  const playPlaylist = useCallback(
    async (playlist: Playlist, trackIndex: number = 0) => {
      if (!isReady || !deviceId || !tokenRef.current) {
        console.warn(
          '[MusicContext] Player not ready, deviceId or token not available for playPlaylist'
        );
        setError('Cannot play playlist: Player not ready or token missing.');
        return;
      }
      if (!playlist || !playlist.spotify_id) {
        console.error('[MusicContext] Invalid playlist provided to playPlaylist');
        setError('Cannot play playlist: Invalid playlist data.');
        return;
      }

      const contextUri = `spotify:playlist:${playlist.spotify_id}`;
      console.log(
        `[MusicContext] Attempting to play playlist: ${playlist.name} (${contextUri}) on device: ${deviceId}`
      );

      const body: { context_uri: string; offset?: { position: number } } = {
        context_uri: contextUri,
      };

      // Ensure trackIndex is a non-negative integer
      const validTrackIndex = Math.max(0, Math.floor(trackIndex || 0));
      if (validTrackIndex >= 0) {
        // Always true now, but good practice
        body.offset = { position: validTrackIndex };
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );

        if (response.ok) {
          console.log(
            `[MusicContext] Successfully started playback for playlist: ${playlist.name}`
          );
          setError(null);
          // Update context state
          const playlistIndex = tasteMatchedPlaylists.findIndex(
            (p) => p.spotify_id === playlist.spotify_id
          );
          setCurrentPlaylistIndex(playlistIndex !== -1 ? playlistIndex : null);
          setCurrentPlaylistName(playlist.name);
          // Player state should update via the 'player_state_changed' event listener shortly
        } else {
          const errorBody = await response.text();
          console.error(
            `[MusicContext] Error starting playlist ${playlist.name}: ${response.status}`,
            errorBody
          );
          setError(`Error starting playlist: ${response.statusText}`);
          // Clear current playlist state on error?
          // setCurrentPlaylistIndex(null);
          // setCurrentPlaylistName(null);
        }
      } catch (e) {
        console.error('[MusicContext] Exception calling playPlaylist:', e);
        setError('Error starting playlist playback.');
      }
    },
    [isReady, deviceId, tasteMatchedPlaylists]
  ); // Added tasteMatchedPlaylists dependency

  // Task 4: Implement nextPlaylist
  const nextPlaylist = useCallback(async () => {
    if (!tasteMatchedPlaylists || tasteMatchedPlaylists.length < 1) {
      console.warn('[MusicContext] No playlists available for nextPlaylist');
      setError('No playlists available to navigate.');
      return;
    }

    const currentIndex = currentPlaylistIndex === null ? -1 : currentPlaylistIndex;
    const nextIndex = (currentIndex + 1) % tasteMatchedPlaylists.length;
    const nextPlaylistToPlay = tasteMatchedPlaylists[nextIndex];

    if (nextPlaylistToPlay) {
      console.log(`[MusicContext] Navigating to next playlist: ${nextPlaylistToPlay.name}`);
      await playPlaylist(nextPlaylistToPlay); // Start from the beginning of the next playlist
    } else {
      console.error('[MusicContext] Could not find next playlist at index:', nextIndex);
      setError('Error finding next playlist.');
    }
  }, [tasteMatchedPlaylists, currentPlaylistIndex, playPlaylist]);

  // Task 4: Implement previousPlaylist
  const previousPlaylist = useCallback(async () => {
    if (!tasteMatchedPlaylists || tasteMatchedPlaylists.length < 1) {
      console.warn('[MusicContext] No playlists available for previousPlaylist');
      setError('No playlists available to navigate.');
      return;
    }

    const currentIndex = currentPlaylistIndex === null ? 0 : currentPlaylistIndex;
    const prevIndex =
      (currentIndex - 1 + tasteMatchedPlaylists.length) % tasteMatchedPlaylists.length;
    const prevPlaylistToPlay = tasteMatchedPlaylists[prevIndex];

    if (prevPlaylistToPlay) {
      console.log(`[MusicContext] Navigating to previous playlist: ${prevPlaylistToPlay.name}`);
      await playPlaylist(prevPlaylistToPlay); // Start from the beginning of the previous playlist
    } else {
      console.error('[MusicContext] Could not find previous playlist at index:', prevIndex);
      setError('Error finding previous playlist.');
    }
  }, [tasteMatchedPlaylists, currentPlaylistIndex, playPlaylist]);

  // Effect to check save/follow status when track or playlist context changes
  useEffect(() => {
    const currentTrackId = playbackState?.track_window?.current_track?.id;
    const contextUri = playbackState?.context?.uri;
    const currentPlaylistId = contextUri?.startsWith('spotify:playlist:')
      ? contextUri.split(':')[2]
      : null;

    console.log('[Save/Follow Check Effect] Track ID:', currentTrackId);
    console.log('[Save/Follow Check Effect] Playlist ID:', currentPlaylistId);
    console.log('[Save/Follow Check Effect] User Spotify ID:', userSpotifyId);

    if (currentTrackId) {
      console.log('[Save/Follow Check Effect] Calling checkIfTrackIsSaved...');
      checkIfTrackIsSaved(currentTrackId).catch(console.error);
    } else {
      // console.log('[Save/Follow Check Effect] No track ID, clearing saved state.');
      setIsCurrentTrackSaved(null);
    }

    if (currentPlaylistId && userSpotifyId) {
      console.log('[Save/Follow Check Effect] Calling checkIfPlaylistIsFollowed...');
      checkIfPlaylistIsFollowed(currentPlaylistId).catch(console.error);
    } else {
      // console.log('[Save/Follow Check Effect] No playlist/user ID, clearing follow state.');
      setIsCurrentPlaylistFollowed(null);
    }
  }, [playbackState, userSpotifyId, checkIfTrackIsSaved, checkIfPlaylistIsFollowed]);

  // Combine state and actions into the context value
  const contextValue: MusicContextState = {
    player,
    deviceId,
    isReady,
    playbackState,
    currentVolumePercent,
    error,
    // Player Controls
    nextTrack,
    previousTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    // Playlist State & Controls
    tasteMatchedPlaylists,
    currentPlaylistIndex,
    currentPlaylistName,
    playPlaylist,
    nextPlaylist,
    previousPlaylist,
    // Save/Follow State
    isCurrentTrackSaved,
    isCurrentPlaylistFollowed,
    // User Info
    userSpotifyId,
    // Save/Follow Check/Action Methods
    checkIfTrackIsSaved,
    saveCurrentTrack,
    unsaveCurrentTrack,
    checkIfPlaylistIsFollowed,
    followCurrentPlaylist,
    unfollowCurrentPlaylist,
  };

  return <MusicContext.Provider value={contextValue}>{children}</MusicContext.Provider>;
};

// Custom hook for consuming the context
export const useMusic = (): MusicContextState => {
  const context = useContext(MusicContext); // Now useContext is used
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

// Export the context itself if needed elsewhere, though usually the hook is preferred
// export { MusicContext };
