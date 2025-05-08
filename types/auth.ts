export interface SpotifyUserMetadata {
  provider_token?: string;
  provider_refresh_token?: string;
  provider_token_expires_at?: number; // Assuming this is a numeric timestamp
  // You can add other known properties of user_metadata here if needed
}
