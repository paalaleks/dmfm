'use client';

import React, { useEffect } from 'react';
import { useMusic } from '@/context/music-context'; // Import the custom hook
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Assuming Shadcn Avatar is installed
import { Button } from '@/components/ui/button'; // Import Button
import { Slider } from '@/components/ui/slider'; // Added Slider
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Added Tooltip
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Rewind,
  FastForward,
  Heart,
  CheckCircle,
  PlusCircle,
} from 'lucide-react'; // Added Volume2, VolumeX, Shuffle, Rewind, FastForward, Heart, CheckCircle, PlusCircle

const PlayerUI = () => {
  // Task 2: Use the hook to get context state
  const {
    player,
    playbackState,
    currentVolumePercent, // Added for Task 3
    isReady,
    deviceId,
    // Destructure new methods from context for Task 2
    nextTrack,
    previousTrack,
    setVolume, // Added for Task 3
    toggleMute, // Added for Task 3
    toggleShuffle, // Added for Task 4
    // Added for Task 6
    tasteMatchedPlaylists,
    currentPlaylistName,
    nextPlaylist,
    previousPlaylist,
    isCurrentTrackSaved,
    saveCurrentTrack,
    unsaveCurrentTrack,
    isCurrentPlaylistFollowed,
    followCurrentPlaylist,
    unfollowCurrentPlaylist,
  } = useMusic();

  useEffect(() => {
    console.log('[PlayerUI] Playback State Updated:', playbackState);
    console.log(
      '[PlayerUI] isReady:',
      isReady,
      'deviceId:',
      deviceId,
      'player available:',
      !!player
    );
  }, [playbackState, isReady, deviceId, player]);

  // Extract current track data safely
  const currentTrack = playbackState?.track_window?.current_track;
  const albumArtUrl = currentTrack?.album?.images?.[0]?.url; // Get the first image URL

  // Component logic will go here
  // console.log('Player State:', playbackState);
  // console.log('Player Ready:', isReady);
  // console.log('Device ID:', deviceId);

  return (
    <TooltipProvider delayDuration={100}>
      <div className='h-20 bg-background border-t p-2 flex items-center space-x-3'>
        {/* Album Art */}
        <Avatar className='h-12 w-12 rounded-sm'>
          {' '}
          {/* Adjust size as needed */}
          {albumArtUrl ? (
            <AvatarImage src={albumArtUrl} alt={currentTrack?.album?.name || 'Album art'} />
          ) : (
            <AvatarFallback className='rounded-sm bg-muted'>
              <Music className='h-6 w-6 text-muted-foreground' /> {/* Placeholder icon */}
            </AvatarFallback>
          )}
        </Avatar>
        {/* Track & Playlist Info */}
        <div className='flex-grow overflow-hidden'>
          {currentTrack ? (
            <div>
              <div className='text-sm font-medium truncate'>{currentTrack.name}</div>
              <div className='text-xs text-muted-foreground truncate'>
                {currentTrack.artists.map((artist) => artist.name).join(', ')}
              </div>
              {/* Display Current Playlist Name (Task 6.2) */}
              {currentPlaylistName && (
                <div className='text-xs text-muted-foreground/70 truncate mt-0.5'>
                  Playlist: {currentPlaylistName}
                </div>
              )}
            </div>
          ) : (
            <div className='text-sm text-muted-foreground'>Nothing playing</div>
          )}
        </div>
        {/* Controls Container (Track) */}
        <div className='flex items-center space-x-1'>
          {/* Previous Playlist Button (Task 6.3) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  if (previousPlaylist) await previousPlaylist();
                }}
                disabled={!isReady || !player || !deviceId || tasteMatchedPlaylists.length < 2} // Task 6.5: Disabled logic
                aria-label='Previous Playlist'
              >
                <Rewind className='h-5 w-5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Previous Playlist</p>
            </TooltipContent>
          </Tooltip>

          {/* Previous Track Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  if (previousTrack) await previousTrack();
                }}
                disabled={!isReady || !player || !deviceId || !playbackState}
                aria-label='Previous Track'
              >
                <SkipBack className='h-5 w-5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Previous Track</p>
            </TooltipContent>
          </Tooltip>

          {/* Play/Pause Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => {
                  if (player) {
                    player.togglePlay().catch((e) => console.error('Error toggling play', e));
                  }
                }}
                disabled={!isReady || !player || !deviceId || !playbackState}
                aria-label={playbackState?.paused ? 'Play' : 'Pause'}
              >
                {playbackState?.paused ? (
                  <Play className='h-5 w-5' />
                ) : (
                  <Pause className='h-5 w-5' />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{playbackState?.paused ? 'Play' : 'Pause'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Next Track Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  if (nextTrack) await nextTrack();
                }}
                disabled={!isReady || !player || !deviceId || !playbackState}
                aria-label='Next Track'
              >
                <SkipForward className='h-5 w-5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Next Track</p>
            </TooltipContent>
          </Tooltip>

          {/* Next Playlist Button (Task 6.4) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  if (nextPlaylist) await nextPlaylist();
                }}
                disabled={!isReady || !player || !deviceId || tasteMatchedPlaylists.length < 2} // Task 6.5: Disabled logic
                aria-label='Next Playlist'
              >
                <FastForward className='h-5 w-5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Next Playlist</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Save/Follow Buttons - Moved Here */}
        <div className='flex items-center space-x-1'>
          {/* Save Track Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  if (isCurrentTrackSaved === false) {
                    await saveCurrentTrack?.(); // Use optional chaining
                  } else if (isCurrentTrackSaved === true) {
                    await unsaveCurrentTrack?.();
                  }
                }}
                disabled={!isReady || !player || !currentTrack || isCurrentTrackSaved === null}
                className={'text-primary/70 hover:text-primary'}
                aria-label={isCurrentTrackSaved ? 'Unsave Track' : 'Save Track'}
              >
                <Heart className='h-5 w-5' fill={isCurrentTrackSaved ? 'currentColor' : 'none'} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isCurrentTrackSaved ? 'Unsave Track' : 'Save Track'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Follow Playlist Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  if (isCurrentPlaylistFollowed === false) {
                    await followCurrentPlaylist?.();
                  } else if (isCurrentPlaylistFollowed === true) {
                    await unfollowCurrentPlaylist?.();
                  }
                }}
                disabled={
                  !isReady || !player || !currentPlaylistName || isCurrentPlaylistFollowed === null
                }
                className={'text-primary/70 hover:text-primary'}
                aria-label={isCurrentPlaylistFollowed ? 'Unfollow Playlist' : 'Follow Playlist'}
              >
                {isCurrentPlaylistFollowed ? (
                  <CheckCircle className='h-5 w-5' />
                ) : (
                  <PlusCircle className='h-5 w-5' />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isCurrentPlaylistFollowed ? 'Unfollow Playlist' : 'Follow Playlist'}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Volume Controls */}
        <div className='flex items-center space-x-2 w-32'>
          {/* Mute Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  if (toggleMute) await toggleMute();
                }}
                disabled={!isReady || !player || !deviceId}
                aria-label={currentVolumePercent === 0 ? 'Unmute' : 'Mute'}
              >
                {currentVolumePercent === 0 ? (
                  <VolumeX className='h-5 w-5' />
                ) : (
                  <Volume2 className='h-5 w-5' />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{currentVolumePercent === 0 ? 'Unmute' : 'Mute'}</p>
            </TooltipContent>
          </Tooltip>
          {/* Volume Slider */}
          <Slider
            value={currentVolumePercent !== null ? [currentVolumePercent] : [50]}
            onValueChange={(value: number[]) => {
              if (setVolume) setVolume(value[0] / 100);
            }}
            max={100}
            step={1}
            className='flex-grow'
            disabled={!isReady || !player || !deviceId}
            aria-label='Volume'
          />
        </div>

        {/* Shuffle Control */}
        <div className='ml-auto'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={playbackState?.shuffle ? 'default' : 'ghost'}
                size='icon'
                onClick={async () => {
                  if (toggleShuffle) await toggleShuffle();
                }}
                disabled={!isReady || !player || !deviceId || !playbackState}
                aria-label={playbackState?.shuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
              >
                <Shuffle
                  className={`h-5 w-5 ${playbackState?.shuffle ? 'text-primary-foreground' : ''}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{playbackState?.shuffle ? 'Disable Shuffle' : 'Enable Shuffle'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PlayerUI;
