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
let profileListenerUnsubscribe: (() => void) | null = null;

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
          // console.log('Subscribed to profile changes for user:', userId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (err) {
            console.error(
              'Error subscribing to profile changes for user:',
              userId,
              'Status:',
              status,
              'Error:',
              err
            );
          } else {
            console.error(
              'Error subscribing to profile changes for user:',
              userId,
              'Status:',
              status,
              'Error: Unknown (no error object provided).'
            );
          }
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
  // Set loading true on init, but don't assume an error yet.
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
            userId: null,
            userSpotifyId: null,
            error: null, // Set error to null for this specific, expected case
            isLoading: false,
          });
        } else {
          // It's some other, unexpected auth error
          console.error('[user-session.ts] Error in getUser during init:', authError);
          updateState({
            userId: null,
            userSpotifyId: null,
            error: authError.message, // Report the actual error message
            isLoading: false,
          });
        }
        return;
      }

      if (user) {
        updateState({
          userId: user.id,
          error: null, // Clear previous error
          isLoading: false,
        });
        await setupProfileListener(supabase, user.id);
      } else {
        // No user session found
        updateState({
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
        userId: null,
        userSpotifyId: null,
        error: e instanceof Error ? e.message : 'Error initializing session',
        isLoading: false,
      });
    });

  const authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
    if (profileListenerUnsubscribe) {
      profileListenerUnsubscribe();
      profileListenerUnsubscribe = null;
    }

    if (!session?.user) {
      console.log('[user-session.ts] onAuthStateChange: No user in session. Event:', event);
      updateState({
        userSpotifyId: null,
        userId: null,
        error: event === 'SIGNED_OUT' ? null : 'User session missing.',
        isLoading: false,
      });
    } else {
      updateState({
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

// Helper function to get current state directly if needed without subscription
export const getCurrentUserSessionState = (): UserSessionState => {
  return { ...internalState };
};
