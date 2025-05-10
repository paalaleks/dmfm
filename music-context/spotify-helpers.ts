import { SpotifyApiTrackFull } from '../types/spotify';

export function mapApiTrackToSdkTrack(apiTrack: SpotifyApiTrackFull): Spotify.Track {
  return {
    uri: apiTrack.uri,
    id: apiTrack.id,
    type: 'track',
    media_type: 'audio',
    name: apiTrack.name,
    is_playable: apiTrack.is_playable ?? false,
    album: {
      uri: apiTrack.album.uri || '',
      name: apiTrack.album.name,
      images: apiTrack.album.images,
    },
    artists: apiTrack.artists.map((a) => ({
      uri: a.uri || '',
      name: a.name,
      url: a.external_urls?.spotify || '',
    })),
    duration_ms: apiTrack.duration_ms || 0,
    uid: apiTrack.id || '',
    track_type: 'audio',
    linked_from: apiTrack.linked_from
      ? { uri: apiTrack.linked_from.uri, id: apiTrack.linked_from.id }
      : { uri: null, id: null },
  };
}
