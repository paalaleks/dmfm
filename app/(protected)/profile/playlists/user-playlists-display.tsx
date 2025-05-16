'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { deleteUserPlaylist } from '@/app/_actions/delete-playlist';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
interface Playlist {
  id: string;
  playlist_name: string;
  spotify_playlist_id: string;
  playlist_cover_image_url: string | null;
  track_count: number;
}

interface UserPlaylistsDisplayProps {
  initialPlaylists: Playlist[];
  initialError: string | null;
}

const UserPlaylistsDisplay = ({ initialPlaylists, initialError }: UserPlaylistsDisplayProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
  const error = initialError;

  useEffect(() => {
    setPlaylists(initialPlaylists);
  }, [initialPlaylists]);

  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeletePlaylist = async (playlistId: string, playlistName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the playlist "${playlistName}"? This action cannot be undone.`
      )
    ) {
      setDeleteError(null);
      startTransition(async () => {
        const result = await deleteUserPlaylist(playlistId);
        if (result.success) {
          setPlaylists((prevPlaylists) => prevPlaylists.filter((p) => p.id !== playlistId));
        } else {
          console.error('Failed to delete playlist:', result.error);
          setDeleteError(result.error || 'Failed to delete playlist. Please try again.');
        }
      });
    }
  };

  if (error) {
    return (
      <p className='text-center text-peach text-lg p-4 bg-red-100 border border-red-300 rounded-md'>
        {error}
      </p>
    );
  }

  if (!playlists || playlists.length === 0) {
    return (
      <p className='text-center text-muted-foreground text-lg'>
        You haven&apos;t imported any playlists yet.
      </p>
    );
  }

  return (
    <div>
      {deleteError && (
        <div className='mb-4 p-3 bg-red-100 text-peach border border-red-300 rounded-md text-sm'>
          <p>Error deleting playlist: {deleteError}</p>
        </div>
      )}
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
        {playlists.map((playlist) => (
          <Card key={playlist.id}>
            <CardContent>
              {playlist.playlist_cover_image_url ? (
                <Image
                  src={playlist.playlist_cover_image_url}
                  alt={`Cover for ${playlist.playlist_name}`}
                  width={200}
                  height={200}
                  className='w-full h-auto object-cover rounded-md mb-3 aspect-square'
                  priority={false}
                />
              ) : (
                <div className='w-full h-auto bg-muted rounded-md mb-3 aspect-square flex items-center justify-center'>
                  <span className='text-muted-foreground text-2xl'>No Image</span>
                </div>
              )}
              <h4 className='text-lg font-semibold truncate mb-1' title={playlist.playlist_name}>
                {playlist.playlist_name}
              </h4>
              <p className='text-sm'>Tracks: {playlist.track_count}</p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleDeletePlaylist(playlist.id, playlist.playlist_name)}
                disabled={isPending}
                className='w-full'
                variant='destructive'
              >
                <Trash2 className='!w-3.5 !h-3.5' />
                {isPending ? 'Deleting...' : 'Delete Playlist'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserPlaylistsDisplay;
