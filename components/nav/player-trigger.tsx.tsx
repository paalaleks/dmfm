import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { Music } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

import React from 'react';
import PlayerUI from './player';
import { PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export default function PlayerTrigger() {
  return (
    <ErrorBoundary fallbackMessage='The music player is temporarily unavailable. Please try again later.'>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant='ghost' size='icon' aria-label='Open music player' type='button'>
            <Music className='h-6 w-6 text-primary hover:text-primary/90' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align='end'
          sideOffset={8}
          className='p-4 w-[300px] bg-popover border border-border rounded-lg shadow-lg'
        >
          <PlayerUI />
        </PopoverContent>
      </Popover>
    </ErrorBoundary>
  );
}
