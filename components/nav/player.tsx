'use client';

import React from 'react';
import { useMusic } from '@/music-context/music-context'; // Import the custom hook
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
    currentVolumePercent,
    isReady,
    deviceId,
    nextTrack,
    previousTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    tasteMatchedPlaylists,
    nextPlaylist,
    previousPlaylist,
    isCurrentTrackSaved,
    saveCurrentTrack,
    unsaveCurrentTrack,
    currentPlaylistName,
    isCurrentPlaylistFollowed,
    followCurrentPlaylist,
    unfollowCurrentPlaylist,
  } = useMusic();

  // Extract current track data safely
  const currentTrack = playbackState?.track_window?.current_track;
  const albumArtUrl = currentTrack?.album?.images?.[0]?.url; // Get the first image URL

  // Component logic will go here
  // console.log('Player State:', playbackState);
  // console.log('Player Ready:', isReady);
  // console.log('Device ID:', deviceId);

  return (
    <TooltipProvider delayDuration={100}>
      <div className='flex flex-col bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/75 rounded-lg overflow-hidden relative'>
        {/* Top Section: Album Art and Track Info */}
        <div className='flex items-center p-3 gap-3'>
          <Avatar className='h-10 w-10 rounded-md flex-shrink-0'>
            {albumArtUrl ? (
              <AvatarImage src={albumArtUrl} alt={currentTrack?.album?.name || 'Album art'} />
            ) : (
              <AvatarFallback className='rounded-md bg-muted'>
                <Music className='h-5 w-5 text-muted-foreground' />
              </AvatarFallback>
            )}
          </Avatar>
          <div className='min-w-0 flex-1'>
            {currentTrack ? (
              <div className='space-y-1'>
                <div className='text-sm font-medium truncate'>{currentTrack.name}</div>
                <div className='text-xs text-muted-foreground truncate'>
                  {currentTrack.artists.map((artist) => artist.name).join(', ')}
                </div>
              </div>
            ) : (
              <div className='text-sm text-muted-foreground'>Nothing playing</div>
            )}
          </div>
        </div>

        {/* Bottom Section: Controls */}
        <div className='p-2 flex flex-col gap-2 border-t border-border/50'>
          {/* Main Controls */}
          <div className='flex justify-center items-center gap-1'>
            {/* Previous Playlist Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 hover:bg-accent'
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (previousPlaylist) await previousPlaylist();
                  }}
                  disabled={!isReady || !player || !deviceId || tasteMatchedPlaylists.length < 2}
                >
                  <Rewind className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Playlist</TooltipContent>
            </Tooltip>

            {/* Previous Track Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 hover:bg-accent'
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (previousTrack) await previousTrack();
                  }}
                  disabled={!isReady || !player || !deviceId || !playbackState}
                >
                  <SkipBack className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Track</TooltipContent>
            </Tooltip>

            {/* Play/Pause Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 hover:bg-accent'
                  onClick={(e) => {
                    e.stopPropagation();
                    if (player) {
                      player.togglePlay().catch((e) => console.error('Error toggling play', e));
                    }
                  }}
                  disabled={!isReady || !player || !deviceId || !playbackState}
                >
                  {playbackState?.paused ? (
                    <Play className='h-4 w-4' />
                  ) : (
                    <Pause className='h-4 w-4' />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{playbackState?.paused ? 'Play' : 'Pause'}</TooltipContent>
            </Tooltip>

            {/* Next Track Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 hover:bg-accent'
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (nextTrack) await nextTrack();
                  }}
                  disabled={!isReady || !player || !deviceId || !playbackState}
                >
                  <SkipForward className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Track</TooltipContent>
            </Tooltip>

            {/* Next Playlist Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 hover:bg-accent'
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (nextPlaylist) await nextPlaylist();
                  }}
                  disabled={!isReady || !player || !deviceId || tasteMatchedPlaylists.length < 2}
                >
                  <FastForward className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Playlist</TooltipContent>
            </Tooltip>
          </div>

          {/* Volume Controls */}
          <div className='flex items-center gap-2'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 hover:bg-accent'
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (toggleMute) await toggleMute();
                  }}
                  disabled={!isReady || !player || !deviceId}
                >
                  {currentVolumePercent === 0 ? (
                    <VolumeX className='h-4 w-4' />
                  ) : (
                    <Volume2 className='h-4 w-4' />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{currentVolumePercent === 0 ? 'Unmute' : 'Mute'}</TooltipContent>
            </Tooltip>
            <Slider
              value={currentVolumePercent !== null ? [currentVolumePercent] : [50]}
              onValueChange={(value: number[]) => {
                if (setVolume) setVolume(value[0] / 100);
              }}
              max={100}
              step={1}
              className='flex-1'
              disabled={!isReady || !player || !deviceId}
            />
          </div>

          {/* Additional Controls */}
          <div className='flex justify-between items-center'>
            <div className='flex gap-2'>
              {/* Save Track Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 hover:bg-accent'
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isCurrentTrackSaved === false) {
                        await saveCurrentTrack?.();
                      } else if (isCurrentTrackSaved === true) {
                        await unsaveCurrentTrack?.();
                      }
                    }}
                    disabled={!isReady || !player || !currentTrack || isCurrentTrackSaved === null}
                  >
                    <Heart
                      className='h-4 w-4'
                      fill={isCurrentTrackSaved ? 'currentColor' : 'none'}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCurrentTrackSaved ? 'Unsave Track' : 'Save Track'}
                </TooltipContent>
              </Tooltip>

              {/* Follow Playlist Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 hover:bg-accent'
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isCurrentPlaylistFollowed === false) {
                        await followCurrentPlaylist?.();
                      } else if (isCurrentPlaylistFollowed === true) {
                        await unfollowCurrentPlaylist?.();
                      }
                    }}
                    disabled={
                      !isReady ||
                      !player ||
                      !currentPlaylistName ||
                      isCurrentPlaylistFollowed === null
                    }
                  >
                    {isCurrentPlaylistFollowed ? (
                      <CheckCircle className='h-4 w-4' />
                    ) : (
                      <PlusCircle className='h-4 w-4' />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCurrentPlaylistFollowed ? 'Unfollow Playlist' : 'Follow Playlist'}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Shuffle Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={playbackState?.shuffle ? 'default' : 'ghost'}
                  size='sm'
                  className='h-8 w-8 hover:bg-accent'
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (toggleShuffle) await toggleShuffle();
                  }}
                  disabled={!isReady || !player || !deviceId || !playbackState}
                >
                  <Shuffle className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {playbackState?.shuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PlayerUI;
