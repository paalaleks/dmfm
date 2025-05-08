import React from 'react';
import PlaylistImportForm from './playlist-import-form';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import Image from 'next/image';

type TopArtist = Database['public']['Tables']['user_top_artists']['Row'];
type TopTrack = Database['public']['Tables']['user_top_tracks']['Row'];

// Define a more specific type for the artist objects within track.artists (JSONB)
interface TrackArtist {
  spotify_id: string;
  name: string;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let topArtists: TopArtist[] = [];
  let topTracks: TopTrack[] = [];
  let fetchError: string | null = null;

  if (user) {
    const { data: artistsData, error: artistsError } = await supabase
      .from('user_top_artists')
      .select('*')
      .eq('user_id', user.id)
      .order('popularity', { ascending: false })
      .limit(10);

    if (artistsError) {
      console.error('Error fetching top artists for profile:', artistsError.message);
      fetchError = 'Could not load top artists.';
    } else {
      topArtists = artistsData || [];
    }

    const { data: tracksData, error: tracksError } = await supabase
      .from('user_top_tracks')
      .select('*')
      .eq('user_id', user.id)
      .order('popularity', { ascending: false })
      .limit(10);

    if (tracksError) {
      console.error('Error fetching top tracks for profile:', tracksError.message);
      if (fetchError) fetchError += ' Also, could not load top tracks.';
      else fetchError = 'Could not load top tracks.';
    } else {
      topTracks = tracksData || [];
    }
  } else {
    // Handle case where user is not authenticated, though route protection should ideally handle this
    // For a server component, this might mean redirecting or showing a login prompt.
    // For now, will result in empty lists.
  }

  return (
    <div className='container mx-auto p-4'>
      <h2 className='text-3xl font-bold mb-6'>User&apos;s Profile</h2>

      {/* Playlist Import Form - keeping existing component */}
      <div className='mb-8 p-6 bg-white shadow-md rounded-lg'>
        <h3 className='text-xl font-semibold mb-4'>Import Spotify Playlist</h3>
        <PlaylistImportForm />
      </div>

      {fetchError && (
        <div className='mb-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md'>
          <p>{fetchError}</p>
        </div>
      )}

      {user ? (
        <div className='grid md:grid-cols-2 gap-8'>
          <section className='p-6 bg-white shadow-md rounded-lg'>
            <h3 className='text-2xl font-semibold mb-4'>Your Top Artists</h3>
            {topArtists.length > 0 ? (
              <ul className='space-y-3'>
                {topArtists.map((artist) => (
                  <li
                    key={artist.artist_spotify_id}
                    className='flex items-center space-x-3 p-3 border-b last:border-b-0'
                  >
                    {artist.image_url && (
                      <Image
                        src={artist.image_url}
                        alt={artist.name}
                        className='w-12 h-12 rounded-full object-cover'
                        width={48}
                        height={48}
                      />
                    )}
                    <div>
                      <p className='font-medium text-gray-800'>{artist.name}</p>
                      {artist.genres &&
                        Array.isArray(artist.genres) &&
                        artist.genres.length > 0 && (
                          <p className='text-sm text-gray-500 capitalize'>
                            {(artist.genres as string[]).slice(0, 3).join(', ')}
                          </p>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-gray-500'>
                No top artists found, or they haven&apos;t been fetched yet.
              </p>
            )}
          </section>

          <section className='p-6 bg-white shadow-md rounded-lg'>
            <h3 className='text-2xl font-semibold mb-4'>Your Top Tracks</h3>
            {topTracks.length > 0 ? (
              <ul className='space-y-3'>
                {topTracks.map((track) => {
                  let artistNames = 'Unknown Artist';
                  if (track.artists && Array.isArray(track.artists)) {
                    const currentTrackArtists = track.artists as unknown as TrackArtist[];
                    artistNames = currentTrackArtists.map((a: TrackArtist) => a.name).join(', ');
                  }
                  return (
                    <li
                      key={track.track_spotify_id}
                      className='flex items-center space-x-3 p-3 border-b last:border-b-0'
                    >
                      {track.album_image_url && (
                        <Image
                          src={track.album_image_url}
                          alt={track.album_name ?? track.name}
                          className='w-12 h-12 rounded-md object-cover'
                          width={48}
                          height={48}
                        />
                      )}
                      <div>
                        <p className='font-medium text-gray-800'>{track.name}</p>
                        <p className='text-sm text-gray-600'>{artistNames}</p>
                        {track.album_name && (
                          <p className='text-xs text-gray-500'>{track.album_name}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className='text-gray-500'>
                No top tracks found, or they haven&apos;t been fetched yet.
              </p>
            )}
          </section>
        </div>
      ) : (
        <p className='text-center text-gray-600'>
          Please log in to see your profile and top items.
        </p>
      )}
    </div>
  );
}
