'use client';

import React from 'react';
import { useMusic } from '@/music-context/music-context'; // Import the custom hook

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Assuming Shadcn Avatar is installed
import { Button } from '@/components/ui/button'; // Import Button
import { Slider } from '@/components/ui/slider'; // Added Slider
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  ListMusic,
  // Lightbulb,
  // LightbulbOff,
  // ListPlus,
  // ListMinus,
  // CirclePlus,
  // CircleMinus,
  // CircleCheck,
  ChevronFirst,
  ChevronLast,
} from 'lucide-react'; // Added Volume2, VolumeX, Shuffle, Rewind, FastForward, Heart, CheckCircle, PlusCircle
import { PopoverContent } from '@/components/ui/popover';
import { RiAddCircleFill, RiCheckboxCircleFill } from '@remixicon/react';
import { formatTime } from '@/lib/utils'; // Import formatTime
import { VolumePopover } from '@/components/player/VolumePopover'; // Import VolumePopover

const PlayerUI = () => {
  // Task 2: Use the hook to get context state
  const {
    player,
    playbackState,
    isReady,
    deviceId,
    nextTrack,
    previousTrack,
    toggleShuffle,
    nextPlaylist,
    previousPlaylist,
    isCurrentTrackSaved,
    saveCurrentTrack,
    unsaveCurrentTrack,
    currentPlaylistName,
    // isCurrentPlaylistFollowed,
    // followCurrentPlaylist,
    // unfollowCurrentPlaylist,
    trackPositionMs,
    trackDurationMs,
    seek,
  } = useMusic();

  // Use the track history hook to track play duration and mark tracks as played

  const [optimisticSliderValue, setOptimisticSliderValue] = React.useState<number | null>(null);

  const currentTrack = playbackState?.track_window?.current_track;
  const albumArtUrl = currentTrack?.album?.images?.[0]?.url; // Get the first image URL
  // const isCheckingPlayedStatus = checkingPlayedTrackId === currentTrack?.id;

  const handleSeek = (value: number[]) => {
    if (seek && trackDurationMs) {
      seek(value[0]);
    }
    setOptimisticSliderValue(null); // Reset optimistic value after seek
  };

  const handleSliderChange = (value: number[]) => {
    setOptimisticSliderValue(value[0]);
  };

  const displayPosition = optimisticSliderValue !== null ? optimisticSliderValue : trackPositionMs;
  const showTimeline = trackDurationMs && trackDurationMs > 0;

  return (
    <PopoverContent align='end' sideOffset={8} className='w-[310px] bg-popover shadow-lg p-4'>
      <div className='flex flex-col bg-popover overflow-hidden relative'>
        <div className='flex items-center p-2 gap-3'>
          <Avatar className='h-16 w-16 rounded-md flex-shrink-0'>
            <AvatarImage src={albumArtUrl} alt={currentTrack?.album?.name || 'Album art'} />
            <AvatarFallback className='rounded-md bg-muted'>
              <Music className='h-5 w-5 text-muted-foreground' />
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            {currentTrack ? (
              <div className=''>
                <div className='font-medium text-sm truncate'>{currentTrack.name}</div>
                <div className='text-xs truncate'>
                  {currentTrack.artists.map((artist) => artist.name).join(', ')}
                </div>
                {currentPlaylistName && (
                  <div className='text-xs text-popover-foreground/60 truncate mt-1'>
                    <span className='inline-flex items-center'>
                      <ListMusic className='!h-3 !w-3 mr-1' />
                      {currentPlaylistName}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className='text-sm text-muted-foreground'>Nothing playing</div>
            )}
          </div>
        </div>

        {/* Timeline Section */}
        <div className='px-3 pt-1 pb-2'>
          <div className='flex justify-between items-center text-xs text-muted-foreground mb-1'>
            <span>{formatTime(showTimeline ? displayPosition : 0)}</span>
            <span>{formatTime(trackDurationMs)}</span>
          </div>
          <Slider
            value={
              showTimeline
                ? [optimisticSliderValue !== null ? optimisticSliderValue : (trackPositionMs ?? 0)]
                : [0]
            }
            max={showTimeline ? (trackDurationMs ?? 100) : 100} // Ensure max is not 0 to prevent errors
            step={1000} // Seek in 1-second increments
            disabled={!showTimeline || !isReady || !player || !deviceId}
            onValueChange={handleSliderChange}
            onValueCommit={handleSeek}
            aria-label='Track progress'
            aria-valuemin={0}
            aria-valuemax={trackDurationMs ?? 0}
            aria-valuenow={displayPosition ?? 0}
            className='w-full h-2 [&>span:first-child]:h-2 [&>span:first-child>span]:h-2'
          />
        </div>

        <div className='flex justify-between items-center p-2 gap-2'>
          <div className='flex justify-center items-center '>
            <VolumePopover />
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 hover:bg-accent'
              onClick={async (e) => {
                e.stopPropagation();
                if (previousPlaylist) await previousPlaylist();
              }}
              disabled={!isReady || !player || !deviceId || !playbackState}
            >
              <ChevronFirst className='h-5 w-5' />
            </Button>
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
              {playbackState?.paused ? <Play className='h-4 w-4' /> : <Pause className='h-4 w-4' />}
            </Button>

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
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 hover:bg-accent'
              onClick={async (e) => {
                e.stopPropagation();
                if (nextPlaylist) await nextPlaylist();
              }}
              disabled={!isReady || !player || !deviceId || !playbackState}
            >
              <ChevronLast className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              // variant={playbackState?.shuffle ? 'default' : 'ghost'}
              size='sm'
              className='h-8 w-8 hover:bg-accent'
              onClick={async (e) => {
                e.stopPropagation();
                if (toggleShuffle) await toggleShuffle();
              }}
              disabled={!isReady || !player || !deviceId || !playbackState}
            >
              <Shuffle className={`h-4 w-4 ${playbackState?.shuffle ? 'text-primary' : ''}`} />
            </Button>
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 w-8'
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
            {isCurrentTrackSaved ? (
              <RiCheckboxCircleFill className='!h-5 !w-5' />
            ) : (
              <RiAddCircleFill className='!h-5 !w-5' />
            )}
          </Button>
        </div>

        {/* <div className='flex justify-between items-center'>
          <div className='flex gap-1'>
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
                !isReady || !player || !currentPlaylistName || isCurrentPlaylistFollowed === null
              }
            >
              {isCurrentPlaylistFollowed ? (
                <ListMinus className='h-4 w-4' />
              ) : (
                <ListPlus className='h-4 w-4' />
              )}
            </Button>

            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 hover:bg-accent'
              onClick={(e) => {
                e.stopPropagation();
                toggleAutoSkipNewTracks?.();
              }}
              disabled={!isReady || !player}
            >
              {isAutoSkipNewTracksEnabled ? (
                <Lightbulb className='h-4 w-4 text-yellow-400' />
              ) : (
                <LightbulbOff className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div> */}
      </div>
    </PopoverContent>
  );
};

export default PlayerUI;
