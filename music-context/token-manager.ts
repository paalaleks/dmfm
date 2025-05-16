import { createClient } from '@/lib/supabase/client';

interface TokenState {
  token: string | null;
  expiresAt: number | null;
  isRefreshing: boolean;
  userId: string | null;
}

// Single instance token state
let tokenState: TokenState = {
  token: null,
  expiresAt: null,
  isRefreshing: false,
  userId: null,
};

// Pending token requests (for batching multiple simultaneous requests)
let pendingTokenPromise: Promise<string | null> | null = null;

// Initialization state
let isInitialized = false;
let initializationCompleteResolve: () => void;
const initializationCompletePromise = new Promise<void>((resolve) => {
  initializationCompleteResolve = resolve;
});

/**
 * Initialize token state from user metadata
 */
export const initializeTokenManager = async (): Promise<void> => {
  if (isInitialized) {
    return initializationCompletePromise;
  }

  const supabase = createClient();

  try {
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      tokenState.token = (data.user.user_metadata?.provider_token as string | undefined) || null;
      tokenState.expiresAt =
        (data.user.user_metadata?.provider_token_expires_at as number | undefined) || null;
      tokenState.userId = data.user.id;
    } else {
      tokenState = {
        token: null,
        expiresAt: null,
        isRefreshing: false,
        userId: null,
      };
    }
  } catch (error) {
    console.error('[token-manager] Error fetching initial user:', error);
    tokenState = {
      token: null,
      expiresAt: null,
      isRefreshing: false,
      userId: null,
    };
  } finally {
    isInitialized = true;
    initializationCompleteResolve(); // Resolve the promise once initial state is set
  }

  // Set up auth state change listener
  supabase.auth.onAuthStateChange((event, session) => {
    if (!isInitialized) {
      // If an auth event comes in before initial getUser is done,
      // we should wait to avoid race conditions with the initial state setting.
      // This scenario is less likely but good to be defensive.
      console.warn(
        '[token-manager] onAuthStateChange event before initial getUser completed. This may indicate a race condition if not handled carefully elsewhere.'
      );
    }

    let needsUpdate = false;
    const previousUserId = tokenState.userId;

    if (event === 'SIGNED_OUT') {
      if (tokenState.userId !== null || tokenState.token !== null) {
        needsUpdate = true;
      }
      tokenState = {
        token: null,
        expiresAt: null,
        isRefreshing: false,
        userId: null,
      };
    } else if (session?.user) {
      const newToken = (session.user.user_metadata?.provider_token as string | undefined) || null;
      const newExpiresAt =
        (session.user.user_metadata?.provider_token_expires_at as number | undefined) || null;

      if (
        newToken !== tokenState.token ||
        newExpiresAt !== tokenState.expiresAt ||
        session.user.id !== tokenState.userId
      ) {
        tokenState.token = newToken;
        tokenState.expiresAt = newExpiresAt;
        tokenState.userId = session.user.id;
        needsUpdate = true;
      }
    }
    // If the user ID changed, it's an important update regardless of token presence
    if (tokenState.userId !== previousUserId && !needsUpdate) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      // Potentially notify listeners if we had a subscription model here
      // For now, just updating internal state. MusicContext will re-check via isAuthenticated/getUserId
      console.log('[token-manager] Auth state changed. New user ID:', tokenState.userId);
    }
  });
};

/**
 * Ensures the token manager has completed its initial asynchronous setup.
 */
export const ensureTokenManagerInitialized = (): Promise<void> => {
  return initializationCompletePromise;
};

/**
 * Returns a Spotify token, refreshing if necessary
 * This method will batch multiple simultaneous requests
 */
export const getSpotifyToken = async (): Promise<string | null> => {
  await initializationCompletePromise; // Ensure initialized

  // If token is valid, return immediately
  if (isTokenValid()) {
    return tokenState.token;
  }

  // If already refreshing, return the existing promise
  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  // Start a new refresh
  pendingTokenPromise = refreshToken();

  try {
    return await pendingTokenPromise;
  } finally {
    // Clear pending promise when done
    pendingTokenPromise = null;
  }
};

/**
 * Check if current token is valid and not expiring soon
 */
function isTokenValid(): boolean {
  // No need to await initializationCompletePromise here, getSpotifyToken does it.
  if (!tokenState.token || !tokenState.expiresAt) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const bufferSeconds = 60; // 1 minute buffer before expiry

  return tokenState.expiresAt > nowInSeconds + bufferSeconds;
}

/**
 * Refresh token via API
 */
async function refreshToken(): Promise<string | null> {
  // No need to await initializationCompletePromise here, getSpotifyToken does it.
  if (tokenState.isRefreshing) {
    console.warn('[token-manager] Already refreshing token');
    // If already refreshing, let the caller wait on the pendingTokenPromise
    // This function returning null might be okay if pendingTokenPromise is awaited by caller
    return pendingTokenPromise;
  }

  tokenState.isRefreshing = true;

  try {
    console.log('[token-manager] Refreshing Spotify token');

    const response = await fetch('/api/spotify/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (response.ok && result.accessToken && result.expiresAt) {
      console.log('[token-manager] Token refresh successful');
      tokenState.token = result.accessToken;
      tokenState.expiresAt = result.expiresAt;
      return tokenState.token;
    } else {
      console.error(
        '[token-manager] Token refresh failed:',
        result.error || 'Unknown error',
        'Status:',
        response.status
      );
      // Important: If refresh fails, clear the token to avoid using a stale one.
      tokenState.token = null;
      tokenState.expiresAt = null;
      return null;
    }
  } catch (error) {
    console.error('[token-manager] Token refresh error:', error);
    tokenState.token = null;
    tokenState.expiresAt = null;
    return null;
  } finally {
    tokenState.isRefreshing = false;
  }
}

/**
 * Check if user is authenticated with a valid session
 */
export const isAuthenticated = (): boolean => {
  // This must be synchronous for some use cases, so it can't await the promise here directly.
  // Relies on initializeTokenManager being called at app startup.
  // If used before initialization, it might return a premature false.
  // Consider if ensureTokenManagerInitialized should be called by consumers before this,
  // or if this function needs an async version for guaranteed accuracy.
  if (!isInitialized) {
    console.warn(
      '[token-manager] isAuthenticated called before initialization complete. Result may be inaccurate.'
    );
  }
  return !!tokenState.userId;
};

/**
 * Get user ID if authenticated
 */
export const getUserId = (): string | null => {
  // Similar to isAuthenticated, this is often expected to be synchronous.
  if (!isInitialized) {
    console.warn(
      '[token-manager] getUserId called before initialization complete. Result may be inaccurate.'
    );
  }
  return tokenState.userId;
};
