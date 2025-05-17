'use client';

import React from 'react';
import { useMusic } from '@/music-context/music-context';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Volume2, VolumeX } from 'lucide-react';

export const VolumePopover = () => {
  const { currentVolumePercent, setVolume, toggleMute, isReady, player, deviceId } = useMusic();

  const isMuted = currentVolumePercent === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon' // Using size='icon' for a compact button
          className='h-8 w-8 hover:bg-accent'
          disabled={!isReady || !player || !deviceId}
        >
          {isMuted ? <VolumeX className='h-4 w-4' /> : <Volume2 className='h-4 w-4' />}
          <span className='sr-only'>{isMuted ? 'Unmute' : 'Mute'} / Adjust Volume</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className='h-fit w-auto p-0 bg-transparent border-none shadow-none flex flex-col items-center relative top-[24px]'
        side='left'
        align='end'
        sideOffset={28}
      >
        <div className='flex flex-col items-center gap-2 bg-popover rounded-lg py-2 h-52'>
          <Slider
            orientation='vertical'
            value={currentVolumePercent !== null ? [currentVolumePercent] : [50]}
            onValueChange={(value: number[]) => {
              if (setVolume) setVolume(value[0] / 100);
            }}
            max={100}
            step={1}
            className='data-[orientation=vertical]:w-2'
            disabled={!isReady || !player || !deviceId}
            aria-label='Volume control'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={currentVolumePercent ?? 50}
          />
          <Button
            variant='ghost'
            size='icon'
            onClick={async (e) => {
              e.stopPropagation();
              if (toggleMute) await toggleMute();
            }}
            disabled={!isReady || !player || !deviceId}
            className='w-8'
          >
            {isMuted ? <VolumeX className='h-4 w-4' /> : <Volume2 className='h-4 w-4' />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
