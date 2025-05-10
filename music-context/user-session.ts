import { createClient } from '@/lib/supabase/client';

export interface UserSessionState {
  spotifyToken: string | null;
  userSpotifyId: string | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

export type UserSessionListener = (state: UserSessionState) => void;

// Refs to hold token and expiry, managed internally by the service
let currentToken: string | null = null;
let currentTokenExpiresAt: number | null = null;

let supabaseListener:
  | ReturnType<typeof createClient.prototype.auth.onAuthStateChange>['data']['subscription']
  | null = null;
let profileListenerUnsubscribe: (() => void) | null = null;

const listeners = new Set<UserSessionListener>();

let internalState: UserSessionState = {
  spotifyToken: null,
  userSpotifyId: null,
  userId: null,
  isLoading: true,
  error: null,
};

const updateState = (newState: Partial<UserSessionState>) => {
  internalState = { ...internalState, ...newState, isLoading: false };
  listeners.forEach((listener) => listener(internalState));
};

const setupProfileListener = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  if (profileListenerUnsubscribe) {
    profileListenerUnsubscribe();
    profileListenerUnsubscribe = null;
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_user_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      updateState({ userSpotifyId: null, error: profileError.message });
    } else {
      updateState({ userSpotifyId: profile?.spotify_user_id || null });
    }

    const channel = supabase
      .channel(`public:profiles:id=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const updatedProfile = payload.new as { spotify_user_id?: string };
          if (updatedProfile && typeof updatedProfile.spotify_user_id === 'string') {
            updateState({ userSpotifyId: updatedProfile.spotify_user_id });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to profile changes for user:', userId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Error subscribing to profile changes:', err);
          // Optionally update state with an error
        }
      });

    profileListenerUnsubscribe = () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  } catch (e) {
    console.error('Exception in setupProfileListener:', e);
    updateState({ error: e instanceof Error ? e.message : 'Error setting up profile listener' });
  }
};

export const initializeUserSession = (): (() => void) => {
  const supabase = createClient();
  // Set loading true on init, but don't assume an error or token status yet.
  internalState = { ...internalState, isLoading: true, error: null };

  supabase.auth
    .getUser()
    .then(async ({ data: { user }, error: authError }) => {
      if (authError) {
        // Check if the error is the expected "AuthSessionMissingError"
        if (authError.name === 'AuthSessionMissingError') {
          console.log(
            '[user-session.ts] Auth session missing during init (expected for logged-out users).'
          );
          updateState({
            spotifyToken: null,
            userId: null,
            userSpotifyId: null,
            error: null, // Set error to null for this specific, expected case
            isLoading: false,
          });
        } else {
          // It's some other, unexpected auth error
          console.error('[user-session.ts] Error in getUser during init:', authError);
          updateState({
            spotifyToken: null,
            userId: null,
            userSpotifyId: null,
            error: authError.message, // Report the actual error message
            isLoading: false,
          });
        }
        return;
      }

      if (user) {
        // Set token directly from user metadata initially.
        // getValidSpotifyToken will be called by SDK's getOAuthToken if this is stale.
        currentToken = (user?.user_metadata?.provider_token as string | undefined) || null;
        currentTokenExpiresAt =
          (user?.user_metadata?.provider_token_expires_at as number | undefined) || null;

        updateState({
          spotifyToken: currentToken,
          userId: user.id,
          error: null, // Clear previous error
          isLoading: false,
        });
        await setupProfileListener(supabase, user.id);
      } else {
        // No user session found
        updateState({
          spotifyToken: null,
          userId: null,
          userSpotifyId: null,
          error: null, // No error, just no session
          isLoading: false,
        });
      }
    })
    .catch((e) => {
      console.error('Error during session initialization get User:', e);
      updateState({
        spotifyToken: null,
        userId: null,
        userSpotifyId: null,
        error: e instanceof Error ? e.message : 'Error initializing session',
        isLoading: false,
      });
    });

  const authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[user-session.ts] onAuthStateChange event:', event /*, 'Session:', session */); // Avoid logging full session object frequently

    let newProviderToken: string | null = null;
    let newProviderTokenExpiresAt: number | null = null;

    // Prioritize user_metadata as it's what our API route updates directly
    if (session?.user?.user_metadata) {
      newProviderToken = (session.user.user_metadata.provider_token as string | undefined) || null;
      newProviderTokenExpiresAt =
        (session.user.user_metadata.provider_token_expires_at as number | undefined) || null;
      console.log(
        '[user-session.ts] onAuthStateChange: Read from user_metadata. Token:',
        newProviderToken ? '******' : 'null',
        'ExpiresAt:',
        newProviderTokenExpiresAt
      );
    } else if (session?.provider_token) {
      // Fallback, though less likely to be the most up-to-date after our custom refresh
      newProviderToken = session.provider_token;
      // session.provider_token_expires_at does not exist directly on session object
      // Expiry would still rely on user_metadata if this path were primary.
      console.warn(
        '[user-session.ts] onAuthStateChange: Fell back to session.provider_token. Expiry info might be missing from this path.'
      );
    }

    // Update internal state variables
    currentToken = newProviderToken;
    currentTokenExpiresAt = newProviderTokenExpiresAt;

    if (profileListenerUnsubscribe) {
      profileListenerUnsubscribe();
      profileListenerUnsubscribe = null;
    }

    if (!currentToken || !session?.user) {
      console.log(
        '[user-session.ts] onAuthStateChange: No valid Spotify token found in session or no user. Event:',
        event
      );
      updateState({
        spotifyToken: null,
        userSpotifyId: null,
        userId: null,
        error: event === 'SIGNED_OUT' ? null : 'Spotify token not available from session.',
        isLoading: false,
      });
    } else {
      console.log(
        '[user-session.ts] onAuthStateChange: Valid Spotify token found/reconfirmed in session. User:',
        session.user.id,
        'Event:',
        event
      );
      updateState({
        spotifyToken: currentToken,
        userId: session.user.id,
        error: null,
        isLoading: false,
      });
      await setupProfileListener(supabase, session.user.id);
    }
  });
  supabaseListener = authSubscription.data.subscription;

  return () => {
    supabaseListener?.unsubscribe();
    if (profileListenerUnsubscribe) {
      profileListenerUnsubscribe();
    }
    listeners.clear(); // Clear all listeners on cleanup
  };
};

export const subscribeToUserSession = (listener: UserSessionListener): (() => void) => {
  listeners.add(listener);
  listener(internalState); // Immediately call with current state
  return () => listeners.delete(listener);
};

export const getValidSpotifyToken = async (): Promise<string | null> => {
  // If we have a valid token that's not expiring soon, return it
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const bufferSeconds = 60; // 60-second buffer

  if (
    currentToken &&
    currentTokenExpiresAt &&
    currentTokenExpiresAt > nowInSeconds + bufferSeconds
  ) {
    return currentToken;
  }

  // We need to refresh the token
  console.log(
    '[user-session.ts] Spotify token missing, expired, or expiring soon. Attempting refresh via API endpoint.'
  );

  try {
    // Clear any existing token state before refresh attempt to prevent using stale token if refresh fails partially
    currentToken = null;
    // currentTokenExpiresAt = null; // Keep expiry for a moment for potential quick retry scenarios if needed, or clear it.
    // For now, let's clear it to ensure fresh state or explicit failure.
    currentTokenExpiresAt = null;
    updateState({ spotifyToken: null }); // Reflect that we are attempting refresh and current token is invalid

    const response = await fetch('/api/spotify/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // API route expects JSON, though it doesn't read body for POST
      },
      // No body needed for this specific API route for POST, auth is via Supabase cookie
    });

    const result = await response.json();

    if (response.ok && result.accessToken && result.expiresAt) {
      console.log('[user-session.ts] Spotify token refresh via API successful.');
      currentToken = result.accessToken;
      currentTokenExpiresAt = result.expiresAt;
      updateState({
        spotifyToken: currentToken,
        error: null, // Clear any previous errors
      });
      return currentToken;
    } else {
      const errorMessage = result.error || 'Unknown error during token refresh via API.';
      console.error(
        '[user-session.ts] Spotify token refresh via API failed:',
        errorMessage,
        'Details:',
        result.details
      );
      updateState({
        spotifyToken: null,
        // Restore previous token if refresh failed but it was somewhat valid? No, better to fail clearly.
        error: `Failed to refresh Spotify token: ${errorMessage}`,
      });
      return null;
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    console.error('[user-session.ts] Unexpected error during token refresh via API:', errorMessage);
    updateState({
      spotifyToken: null,
      error: `Unexpected error refreshing token: ${errorMessage}`,
    });
    return null;
  }
};

// Potentially export a function to get current state directly if needed without subscription
export const getCurrentUserSessionState = (): UserSessionState => {
  return { ...internalState };
};
