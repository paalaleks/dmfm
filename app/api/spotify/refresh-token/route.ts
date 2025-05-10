import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface SpotifyRefreshedTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number; // in seconds
  refresh_token?: string; // Spotify might return a new refresh token
}

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('[API /api/spotify/refresh-token] Auth error or no user:', authError?.message);
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  console.log('[API /api/spotify/refresh-token] User authenticated:', user.id);

  // Check if a valid access token already exists in user_metadata and is not expiring soon
  const currentUserMetadata = user.user_metadata;
  const currentProviderToken = currentUserMetadata?.provider_token as string | undefined;
  const currentProviderTokenExpiresAt = currentUserMetadata?.provider_token_expires_at as
    | number
    | undefined;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const bufferSeconds = 300; // 5-minute buffer, consider making this configurable or shorter

  if (
    currentProviderToken &&
    currentProviderTokenExpiresAt &&
    currentProviderTokenExpiresAt > nowInSeconds + bufferSeconds
  ) {
    console.log(
      `[API /api/spotify/refresh-token] Token from user_metadata is still valid (expires at ${currentProviderTokenExpiresAt}, now is ${nowInSeconds}). Returning existing token.`
    );
    return NextResponse.json({
      accessToken: currentProviderToken,
      expiresAt: currentProviderTokenExpiresAt,
    });
  }
  console.log(
    '[API /api/spotify/refresh-token] Existing token in user_metadata is expired, not present, or expiring soon. Proceeding with Spotify API refresh attempt.'
  );

  const providerRefreshToken = user.user_metadata?.provider_refresh_token as string | undefined;

  if (!providerRefreshToken) {
    console.error(
      '[API /api/spotify/refresh-token] No provider_refresh_token found for user:',
      user.id
    );
    return NextResponse.json(
      { error: 'Spotify refresh token not found. Please re-authenticate with Spotify.' },
      { status: 400 }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      '[API /api/spotify/refresh-token] SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set in environment variables.'
    );
    return NextResponse.json(
      { error: 'Server configuration error for Spotify credentials.' },
      { status: 500 }
    );
  }

  console.log('[API /api/spotify/refresh-token] Attempting to fetch new token from Spotify.');
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: providerRefreshToken,
      }),
      cache: 'no-store', // Ensure fresh request for token refresh
    });

    console.log(
      '[API /api/spotify/refresh-token] Spotify token API response status:',
      response.status
    );

    if (!response.ok) {
      const rawErrorBodyText = await response.text();
      let spotifyErrorBody;
      try {
        spotifyErrorBody = JSON.parse(rawErrorBodyText);
      } catch (parseError) {
        console.warn(
          '[API /api/spotify/refresh-token] Failed to parse Spotify error response as JSON. Raw text:',
          rawErrorBodyText
        );
        spotifyErrorBody = {
          error_description: 'Failed to parse Spotify error response. Raw: ' + rawErrorBodyText,
        };
        console.error(parseError);
      }
      console.error(
        '[API /api/spotify/refresh-token] Spotify token refresh failed. Status:',
        response.status,
        'Parsed Body:',
        spotifyErrorBody
      );

      if (
        response.status === 400 &&
        spotifyErrorBody &&
        (spotifyErrorBody.error === 'invalid_grant' ||
          spotifyErrorBody.error_description?.includes('invalid_grant'))
      ) {
        // Consider clearing the invalid refresh token from Supabase to prevent loops,
        // or forcing re-authentication on the client.
        // For now, returning a specific error.
        return NextResponse.json(
          {
            error: 'Invalid refresh token. Please re-authenticate with Spotify.',
            details: spotifyErrorBody,
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to refresh Spotify token.', details: spotifyErrorBody },
        { status: response.status }
      );
    }

    const refreshedData = (await response.json()) as SpotifyRefreshedTokenResponse;
    console.log('[API /api/spotify/refresh-token] Spotify token successfully refreshed.');

    const newAccessToken = refreshedData.access_token;
    const newExpiresAt = Math.floor(Date.now() / 1000) + refreshedData.expires_in;

    const metadataUpdate: {
      provider_token: string;
      provider_token_expires_at: number;
      provider_refresh_token?: string;
    } = {
      provider_token: newAccessToken,
      provider_token_expires_at: newExpiresAt,
    };

    if (refreshedData.refresh_token) {
      metadataUpdate.provider_refresh_token = refreshedData.refresh_token;
      console.log(
        '[API /api/spotify/refresh-token] Spotify returned a new provider_refresh_token.'
      );
    }

    console.log(
      '[API /api/spotify/refresh-token] Attempting to update Supabase user metadata with new token info.'
    );
    const { error: updateError } = await supabase.auth.updateUser({
      data: metadataUpdate, // This merges with existing user_metadata
    });

    if (updateError) {
      console.error(
        '[API /api/spotify/refresh-token] Failed to update user metadata:',
        updateError.message
      );
      // Even if DB update fails, client might be able to use the token for a short period.
      // However, it's safer to indicate that persistence failed.
      return NextResponse.json(
        { error: 'Failed to save refreshed Spotify token to user profile.' },
        { status: 500 }
      );
    }

    console.log(
      '[API /api/spotify/refresh-token] Successfully updated user metadata. Returning new token.'
    );
    return NextResponse.json({ accessToken: newAccessToken, expiresAt: newExpiresAt });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(
      '[API /api/spotify/refresh-token] Unexpected error during token refresh:',
      message
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + message },
      { status: 500 }
    );
  }
}
