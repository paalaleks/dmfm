'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '../ui/button';
import PlayerUI from '../player/player';
import {
  Music,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { User } from '@supabase/supabase-js';
import Notifications from './notifications';
import { signOutAction } from './logout-action';
import { PlayerTrigger } from '../player/player-trigger';
import { useMusic } from '@/music-context/music-context';
import Image from 'next/image';
/**
 * Renders the navigation header specific to the rooms section.
 * Includes user avatar popover with logout and conditional playlist adding.
 */
export function Nav({ user }: { user: User | null }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const { playbackState } = useMusic();

  const isPlaying = playbackState ? !playbackState.paused : false;
  const currentTrack = playbackState?.track_window?.current_track;
  const albumArtUrl = currentTrack?.album?.images?.[0]?.url;

  // const navigateAndExpand = (path: string) => {
  //   router.push(path);
  //   setIsExpanded(true);
  // };

  useEffect(() => {
    if (!pathname.startsWith('/profile')) {
      setIsExpanded(false);
    }
  }, [pathname]);

  return (
    <nav className='absolute top-0 z-50 px-5 bg-teal-dark w-full'>
      <div className='flex h-14 items-center'>
        <Link href='/' className='mr-6 flex items-center space-x-2'>
          <span className='font-bold'>Discovered.fm</span>
        </Link>
        <div className='flex flex-1 items-center space-x-2 justify-end'>
          <nav className='flex items-center space-x-2'>
            <Notifications />
            <Popover>
              <PopoverTrigger asChild>
                <PlayerTrigger isPlaying={isPlaying}>
                  {albumArtUrl ? (
                    <Image
                      src={albumArtUrl}
                      alt={currentTrack?.name ?? 'Album art'}
                      className='h-6 w-6 rounded object-cover'
                      fill
                      sizes='(max-width: 768px) 100vw, (max-width: 200px) 50vw, 25vw'
                    />
                  ) : (
                    <Music className='h-6 w-6 text-accent2 hover:text-accent2/90' />
                  )}
                </PlayerTrigger>
              </PopoverTrigger>
              <PlayerUI />
            </Popover>
            {user ? (
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
                          className='object-cover'
                          src={user?.user_metadata.avatar_url}
                          alt={user?.user_metadata.name}
                        />
                        <AvatarFallback>{user?.user_metadata.name}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-56' align='start' forceMount sideOffset={8}>
                    <div className='flex flex-col gap-1'>
                      <Button
                        variant='ghost'
                        asChild
                        className={`${pathname === '/chat' ? '' : ''} pl-6 justify-start`}
                      >
                        <Link href='/chat'>
                          <MessageCircle className='h-4 w-4 mr-2' />
                          Chat
                        </Link>
                      </Button>
                      <Button
                        className='relative disabled:opacity-100 pl-6 justify-start'
                        variant='ghost'
                        onClick={() => (isExpanded ? setIsExpanded(false) : setIsExpanded(true))}
                      >
                        <UserIcon className='h-4 w-4 mr-2' />
                        Profile
                        <span className='flex items-center gap-1 absolute right-2'>
                          {isExpanded ? (
                            <ChevronUp className='h-4 w-4' />
                          ) : (
                            <ChevronDown className='h-4 w-4' />
                          )}
                        </span>
                      </Button>
                      <div
                        className={`transition-all flex flex-col duration-300 relative py-1 ${isExpanded ? 'opacity-100 h-auto block ' : 'opacity-0 h-0 hidden'}`}
                      >
                        <div className='h-full flex items-center absolute left-4.5 top-0 bottom-0'>
                          <div className='border-l-2 border-popover-foreground/25 pl-4 h-24' />
                        </div>
                        <div className='flex flex-col gap-2 pl-6 ml-2 mr-2-'>
                          <Button
                            size='sm'
                            variant='ghost'
                            asChild
                            className={`${pathname === '/profile/playlists' ? '' : ''} justify-start pl-5`}
                          >
                            <Link href='/profile/playlists'>Playlists</Link>
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            asChild
                            className={`${pathname === '/profile/profile-page' ? '' : ''} justify-start pl-5`}
                          >
                            <Link href='/profile/profile-page'>Profile page</Link>
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            asChild
                            className={`${pathname === '/profile/play-history' ? '' : ''} justify-start pl-5`}
                          >
                            <Link href='/profile/play-history'>Play History</Link>
                          </Button>
                        </div>
                      </div>
                      <Suspense fallback={null}>
                        <form className='w-full' action={signOutAction}>
                          <Button type='submit' className='w-full justify-start ' variant={'ghost'}>
                            <LogOut className='!h-3.5 !w-3.5 ml-0.5 mr-2' />
                            Sign out
                          </Button>
                        </form>
                      </Suspense>
                    </div>
                  </PopoverContent>
                </Popover>
              </Suspense>
            ) : (
              <Button asChild variant='default'>
                <Link href='/auth/login'>Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </nav>
  );
}
