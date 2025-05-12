'use client';

import Link from 'next/link';
import { LogoutButton } from './logout-button';
import { Suspense } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '../ui/button';
import PlayerUI from './player';
import { Music } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { User } from '@supabase/supabase-js';
import Notifications from './notifications';
/**
 * Renders the navigation header specific to the rooms section.
 * Includes user avatar popover with logout and conditional playlist adding.
 */
export function Nav({ user }: { user: User | null }) {
  return (
    <nav className='absolute top-0 z-50 px-6 bg-teal-dark w-full'>
      <div className='flex h-14 items-center'>
        <Link href='/' className='mr-6 flex items-center space-x-2'>
          <span className='font-bold'>Discovered.fm</span>
        </Link>
        <div className='flex flex-1 items-center space-x-2 justify-end'>
          <nav className='flex items-center space-x-2'>
            <Notifications />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='ringAround'
                  size='icon'
                  aria-label='Open music player'
                  type='button'
                >
                  <Music className='h-6 w-6 text-accent2 hover:text-accent2/90' />
                </Button>
              </PopoverTrigger>
              <PlayerUI />
            </Popover>
            <Suspense fallback={<div className='h-8 w-8 rounded-full bg-muted' />}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant='ringAround'
                    size='icon'
                    aria-label='Open music player'
                    type='button'
                  >
                    <Avatar>
                      <AvatarImage
                        src={user?.user_metadata.avatar_url}
                        alt={user?.user_metadata.name}
                      />
                      <AvatarFallback>{user?.user_metadata.name}</AvatarFallback>
                    </Avatar>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-56' align='end' forceMount>
                  <div className='flex flex-col gap-2'>
                    <Button variant='ghost' asChild>
                      <Link href='/chat'>Chat</Link>
                    </Button>
                    <Button variant='ghost' asChild>
                      <Link href='/profile'>My profile</Link>
                    </Button>
                    <Suspense fallback={null}>
                      <LogoutButton />
                    </Suspense>
                  </div>
                </PopoverContent>
              </Popover>
            </Suspense>
          </nav>
        </div>
      </div>
    </nav>
  );
}
