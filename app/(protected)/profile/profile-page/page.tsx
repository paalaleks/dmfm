import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className='mx-auto p-4 z-10 relative pt-14'>
      {user ? (
        <div className='grid md:grid-cols-2 gap-8'>
          <Card className='shadow-md'>
            <CardHeader className='pt-4'>
              <CardTitle>Your Top Artists</CardTitle>
            </CardHeader>
            {topArtists.length > 0 ? (
              <CardContent as='ul' className='space-y-3'>
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
                      <p className='font-medium '>{artist.name}</p>
                      {artist.genres &&
                        Array.isArray(artist.genres) &&
                        artist.genres.length > 0 && (
                          <p className='text-sm capitalize'>
                            {(artist.genres as string[]).slice(0, 3).join(', ')}
                          </p>
                        )}
                    </div>
                  </li>
                ))}
              </CardContent>
            ) : (
              <CardContent>
                <p>No top artists available yet. Listen to some music on Spotify!</p>
              </CardContent>
            )}
          </Card>

          <Card className=' shadow-md'>
            <CardHeader className='pt-4'>
              <CardTitle>Your Top Tracks</CardTitle>
            </CardHeader>
            {topTracks.length > 0 ? (
              <CardContent as='ul'>
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
                          <p className='font-medium '>{track.name}</p>
                          <p className='text-sm '>{artistNames}</p>
                          {track.album_name && <p className='text-xs '>{track.album_name}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            ) : (
              <CardContent>
                <p>No top tracks available yet. Listen to some music on Spotify!</p>
              </CardContent>
            )}
          </Card>
        </div>
      ) : (
        <Card className='text-center text-gray-600'>
          <CardContent>Please log in to see your profile and top items.</CardContent>
        </Card>
      )}
    </div>
  );
}
