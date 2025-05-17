import { createClient } from '@/lib/supabase/client';

export interface UserSessionState {
  userSpotifyId: string | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

export type UserSessionListener = (state: UserSessionState) => void;

let supabaseListener:
  | ReturnType<typeof createClient.prototype.auth.onAuthStateChange>['data']['subscription']
  | null = null;
let profileListenerUnsubscribe: (() => Promise<void>) | null = null;

const listeners = new Set<UserSessionListener>();

let internalState: UserSessionState = {
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
    profileListenerUnsubscribe().catch((e) =>
      console.error(
        '[user-session.ts] Error in profileListenerUnsubscribe during setupProfileListener:',
        e
      )
    );
    profileListenerUnsubscribe = null;
  }

  let channel: ReturnType<typeof supabase.channel> | null = null;

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_user_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[user-session.ts] Error fetching user profile:', profileError);
      updateState({ userSpotifyId: null, error: profileError.message });
    } else {
      updateState({ userSpotifyId: profile?.spotify_user_id || null });
    }

    channel = supabase
      .channel(`public:profiles:id=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const updatedProfile = payload.new as { spotify_user_id?: string };
          if (updatedProfile && typeof updatedProfile.spotify_user_id === 'string') {
            console.log('[user-session.ts] Profile updated via Realtime:', updatedProfile);
            updateState({ userSpotifyId: updatedProfile.spotify_user_id });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[user-session.ts] Subscribed to profile changes for user:', userId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(
            '[user-session.ts] Profile channel error/timeout. Status:',
            status,
            'User ID:',
            userId,
            'Error:',
            err
          );
          if (err && typeof err.message === 'string' && err.message.includes('Token has expired')) {
            console.warn(
              '[user-session.ts] Detected token expiry in profile channel error. Attempting session refresh.'
            );
            supabase.auth
              .refreshSession()
              .catch((e) =>
                console.error(
                  '[user-session.ts] Error from refreshSession in channel error handler (token expiry case)',
                  e
                )
              );
          } else if (!err) {
            console.warn(
              '[user-session.ts] Profile channel error/timeout with undefined error object. Status:',
              status,
              'User ID:',
              userId,
              'This will be handled by network status change listeners (online event).'
            );
            updateState({
              error: `Profile channel connection issue (status: ${status}). Recovery via network status change expected.`,
            });
          } else {
            updateState({ error: `Profile channel error: ${err?.message || 'Unknown'}` });
          }
        } else {
          console.log(
            '[user-session.ts] Profile channel status update:',
            status,
            'User ID:',
            userId,
            'Error (if any):',
            err
          );
        }
      });

    profileListenerUnsubscribe = async () => {
      if (channel) {
        try {
          console.log(
            '[user-session.ts] Unsubscribing and removing profile channel for user:',
            userId
          );
          await channel.unsubscribe();
          await supabase.removeChannel(channel);
        } catch (e) {
          console.error('[user-session.ts] Error unsubscribing/removing profile channel:', e);
        }
      }
    };
  } catch (e) {
    console.error('[user-session.ts] Exception in setupProfileListener:', e);
    updateState({ error: e instanceof Error ? e.message : 'Error setting up profile listener' });
  }
};

export const initializeUserSession = (): (() => void) => {
  const supabase = createClient();
  internalState = { ...internalState, isLoading: true, error: null };
  console.log('[user-session.ts] Initializing user session.');

  supabase.auth
    .getUser()
    .then(async ({ data: { user }, error: authError }) => {
      if (authError) {
        if (authError.name === 'AuthSessionMissingError') {
          console.log(
            '[user-session.ts] Auth session missing during init getUser (expected for logged-out users).'
          );
          updateState({
            userId: null,
            userSpotifyId: null,
            error: null,
            isLoading: false,
          });
        } else {
          console.error('[user-session.ts] Error in getUser during init:', authError);
          updateState({
            userId: null,
            userSpotifyId: null,
            error: authError.message,
            isLoading: false,
          });
        }
        return;
      }

      if (user) {
        console.log('[user-session.ts] Initial user found:', user.id);
      } else {
        console.log('[user-session.ts] No initial user session found.');
        updateState({
          userId: null,
          userSpotifyId: null,
          error: null,
          isLoading: false,
        });
      }
    })
    .catch((e) => {
      console.error('[user-session.ts] Error during session initialization getUser:', e);
      updateState({
        userId: null,
        userSpotifyId: null,
        error: e instanceof Error ? e.message : 'Error initializing session',
        isLoading: false,
      });
    });

  const authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(
      '[user-session.ts] onAuthStateChange event:',
      event,
      'Session user ID:',
      session?.user?.id
    );

    if (profileListenerUnsubscribe) {
      console.log('[user-session.ts] Cleaning up previous profile listener.');
      await profileListenerUnsubscribe();
      profileListenerUnsubscribe = null;
    }

    if (event === 'SIGNED_OUT') {
      console.log('[user-session.ts] User signed out.');
      updateState({
        userSpotifyId: null,
        userId: null,
        error: null,
        isLoading: false,
      });
    } else if (session?.user) {
      console.log(
        `[user-session.ts] Session active (event: ${event}). User ID: ${session.user.id}. Access token expires at: ${session.expires_at ? new Date(session.expires_at * 1000) : 'N/A'}`
      );

      console.log('[user-session.ts] Setting Realtime auth token.');
      supabase.realtime.setAuth(session.access_token);

      console.log('[user-session.ts] Explicitly connecting Realtime service.');
      try {
        await supabase.realtime.connect();
        console.log('[user-session.ts] Realtime service connected successfully.');
        window.dispatchEvent(new CustomEvent('supabaseRealtimeReauthenticated'));
        console.log(
          '[user-session.ts] Dispatched supabaseRealtimeReauthenticated event AFTER connect.'
        );

        updateState({
          userId: session.user.id,
          error: null,
          isLoading: true,
        });
        console.log('[user-session.ts] Setting up profile listener for user:', session.user.id);
        await setupProfileListener(supabase, session.user.id);
        updateState({ isLoading: false });
      } catch (rtConnectError) {
        console.error(
          '[user-session.ts] Error explicitly connecting Realtime service:',
          rtConnectError
        );
        // Even if connect fails, proceed to setup listeners, they might trigger connection or handle errors.
      }
    } else if (event === 'INITIAL_SESSION' && !session?.user) {
      console.log(
        '[user-session.ts] Initial session event, but no user in session (already handled by getUser or expected for logged out).'
      );
      updateState({
        userId: null,
        userSpotifyId: null,
        error: null,
        isLoading: false,
      });
    } else {
      console.log(
        '[user-session.ts] onAuthStateChange event with no active user session or not SIGNED_OUT. Event:',
        event
      );
      updateState({
        userId: null,
        userSpotifyId: null,
        isLoading: false,
      });
    }
  });

  supabaseListener = authSubscription.data.subscription;

  const handleOnline = async () => {
    console.log('[user-session.ts] Browser came online.');

    if (profileListenerUnsubscribe) {
      console.log(
        '[user-session.ts] Unsubscribing existing profile listener before Realtime disconnect/refresh.'
      );
      try {
        await profileListenerUnsubscribe();
      } catch (e) {
        console.error(
          '[user-session.ts] Error during profileListenerUnsubscribe in handleOnline:',
          e
        );
      }
    }

    try {
      console.log('[user-session.ts] Disconnecting Realtime service before refreshing session.');
      await supabase.realtime.disconnect();
    } catch (rtDisconnectError: unknown) {
      console.error(
        '[user-session.ts] Error disconnecting Realtime service on online event:',
        rtDisconnectError
      );
    }

    if (internalState.userId) {
      console.log(
        '[user-session.ts] User was logged in (userId present in state), attempting to refresh session proactively.'
      );
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error(
            '[user-session.ts] Error during proactive refreshSession on online event:',
            refreshError
          );
          updateState({ error: `Failed to refresh session: ${refreshError.message}` });
        } else {
          console.log(
            '[user-session.ts] Proactive refreshSession successful or not needed. New session expires at:',
            data.session?.expires_at ? new Date(data.session.expires_at * 1000) : 'N/A'
          );
        }
      } catch (e) {
        console.error(
          '[user-session.ts] Exception during proactive refreshSession on online event:',
          e
        );
        updateState({ error: 'Exception during session refresh on online event.' });
      }
    } else {
      console.log(
        '[user-session.ts] Browser online, but no user was logged in (no userId in state). No action taken.'
      );
    }
  };
  window.addEventListener('online', handleOnline);

  const handleOffline = () => {
    console.log('[user-session.ts] Browser went offline. Disconnecting Realtime service.');
    try {
      supabase.realtime.disconnect();
    } catch (rtDisconnectError: unknown) {
      console.error(
        '[user-session.ts] Error disconnecting Realtime service on offline event:',
        rtDisconnectError
      );
    }
  };
  window.addEventListener('offline', handleOffline);

  return () => {
    console.log('[user-session.ts] Cleaning up user session listeners.');
    supabaseListener?.unsubscribe();
    if (profileListenerUnsubscribe) {
      profileListenerUnsubscribe().catch((e) =>
        console.error('[user-session.ts] Error during final profileListenerUnsubscribe:', e)
      );
    }
    listeners.clear();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

export const subscribeToUserSession = (listener: UserSessionListener): (() => void) => {
  listeners.add(listener);
  listener(internalState);
  return () => listeners.delete(listener);
};

export const getCurrentUserSessionState = (): UserSessionState => {
  return { ...internalState };
};
