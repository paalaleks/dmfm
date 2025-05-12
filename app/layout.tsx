import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import Script from 'next/script';
import { Suspense } from 'react';
import { MusicProvider } from '@/music-context/music-context';
import { Nav } from '@/components/nav/nav';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Playlist Rooms',
  description: 'Real-time chat rooms for Spotify playlists',
};

const cabinetGrotesk = localFont({
  src: '../public/fonts/CabinetGrotesk-Variable.ttf',
  variable: '--font-cabinet-grotesk',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${cabinetGrotesk.variable} antialiased flex flex-col min-h-screen bg-sidepanels`}
      >
        <MusicProvider isDisabled={!user.data.user}>
          <main className='flex-grow max-w-screen-xl mx-auto w-full bg-background relative'>
            <Nav user={user.data.user} />
            <div className='absolute top-0 left-0 w-full h-full z-0 noise' />
            <div className='absolute top-0 left-0 w-full h-full z-0 bg-linear-[170deg,_var(--teal-dark)_25%,_oklch(from_var(--seafoam-green)_l_c_h_/_0.4)_50%,_transparent_70%,_transparent_100%]' />
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </main>
          <Toaster />
        </MusicProvider>
        <Script src='https://sdk.scdn.co/spotify-player.js' strategy='afterInteractive' />
      </body>
    </html>
  );
}
