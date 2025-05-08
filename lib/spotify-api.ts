interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// In-memory cache for the token
let spotifyAccessToken: string | null = null;
let tokenExpiryTime: number | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Spotify client ID or secret not configured in environment variables.');
    return null;
  }

  // Check if we have a valid token in cache
  if (spotifyAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return spotifyAccessToken;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: params,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Error fetching Spotify token: ${response.status} ${response.statusText}`,
        errorBody
      );
      return null;
    }

    const data = (await response.json()) as SpotifyTokenResponse;
    spotifyAccessToken = data.access_token;
    // Set expiry time a bit earlier than actual expiry to be safe (e.g., 5 minutes buffer)
    tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000;

    return spotifyAccessToken;
  } catch (error) {
    console.error('Exception fetching Spotify token:', error);
    return null;
  }
}

// We can add more Spotify API helper functions here later

export { getSpotifyAccessToken };
