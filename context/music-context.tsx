'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the context state
interface MusicContextState {
  isPlaying: boolean;
  currentTrack: string | null;
  volume: number; // Example: 0-100
  // Add other relevant music player states here
}

// Define the shape of the context value (state + updater functions)
interface MusicContextValue extends MusicContextState {
  togglePlayPause: () => void;
  setCurrentTrack: (trackId: string) => void;
  setVolume: (volume: number) => void;
  // Add other relevant updater functions here
}

// Create the context with a default undefined value (or a default state)
const MusicContext = createContext<MusicContextValue | undefined>(undefined);

// Define the props for the provider
interface MusicProviderProps {
  children: ReactNode;
}

// Create the provider component
export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrackState] = useState<string | null>(null);
  const [volume, setVolumeState] = useState<number>(50); // Default volume

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
    // TODO: Add actual play/pause logic with Spotify SDK
  };

  const setCurrentTrack = (trackId: string) => {
    setCurrentTrackState(trackId);
    setIsPlaying(true); // Auto-play when a new track is set, for example
    // TODO: Add logic to load and play the track with Spotify SDK
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(100, newVolume))); // Clamp volume 0-100
    // TODO: Add logic to set volume with Spotify SDK
  };

  const contextValue: MusicContextValue = {
    isPlaying,
    currentTrack,
    volume,
    togglePlayPause,
    setCurrentTrack,
    setVolume,
  };

  return <MusicContext.Provider value={contextValue}>{children}</MusicContext.Provider>;
};

// Create a custom hook to use the MusicContext
export const useMusic = (): MusicContextValue => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
