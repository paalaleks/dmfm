import React from 'react';
import { render, act } from '@testing-library/react';
import { MusicProvider, useMusic } from './music-context';
import useLocalStorage from '../hooks/useLocalStorage';
import { MusicContextState } from '../types/music-context';

// Mock the useLocalStorage hook
jest.mock('../hooks/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Test component to access context values
const TestComponent = ({
  onContextValue,
}: {
  onContextValue: (value: MusicContextState) => void;
}) => {
  const context = useMusic();
  React.useEffect(() => {
    onContextValue(context);
  }, [context, onContextValue]);
  return null;
};

describe('MusicContext - Track History', () => {
  // Mock localStorage hook set function
  const mockSetPlayedTrackIds = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default implementation for useLocalStorage
    (useLocalStorage as jest.Mock).mockReturnValue([[], mockSetPlayedTrackIds]);
  });

  it('should initialize with empty played track history', () => {
    // Setup spy to capture context value
    const contextValueSpy = jest.fn();

    // Mock useLocalStorage to return empty array
    (useLocalStorage as jest.Mock).mockReturnValue([[], mockSetPlayedTrackIds]);

    // Render with test component
    render(
      <MusicProvider>
        <TestComponent onContextValue={contextValueSpy} />
      </MusicProvider>
    );

    // Get the latest call arguments
    const contextValue = contextValueSpy.mock.calls[contextValueSpy.mock.calls.length - 1][0];

    // Verify playedTrackIds is an empty array
    expect(contextValue.playedTrackIds).toEqual([]);
    expect(useLocalStorage).toHaveBeenCalledWith('playedTrackHistory', []);
  });

  it('should add track ID to history when markTrackAsPlayed is called', () => {
    // Setup spy to capture context value
    const contextValueSpy = jest.fn();

    // Mock useLocalStorage to handle state updates
    const mockPlayedTracks: string[] = [];
    (useLocalStorage as jest.Mock).mockImplementation(() => {
      return [
        mockPlayedTracks,
        (value: string[] | ((prev: string[]) => string[])) => {
          // Update our mock array when the setter is called
          if (typeof value === 'function') {
            const newValue = value(mockPlayedTracks);
            mockPlayedTracks.length = 0;
            mockPlayedTracks.push(...newValue);
          } else {
            mockPlayedTracks.length = 0;
            mockPlayedTracks.push(...value);
          }
          mockSetPlayedTrackIds(value);
        },
      ];
    });

    // Render with test component
    render(
      <MusicProvider>
        <TestComponent onContextValue={contextValueSpy} />
      </MusicProvider>
    );

    // Get the latest context value
    const contextValue = contextValueSpy.mock.calls[contextValueSpy.mock.calls.length - 1][0];

    // Call markTrackAsPlayed
    act(() => {
      contextValue.markTrackAsPlayed('track123');
    });

    // Verify setter was called with updated array that includes the new track
    expect(mockSetPlayedTrackIds).toHaveBeenCalled();
    expect(mockPlayedTracks).toContain('track123');
  });

  it('should not add duplicate track IDs', () => {
    // Setup spy to capture context value
    const contextValueSpy = jest.fn();

    // Mock useLocalStorage with existing tracks
    const mockPlayedTracks = ['track123'];
    (useLocalStorage as jest.Mock).mockImplementation(() => {
      return [
        mockPlayedTracks,
        (value: string[] | ((prev: string[]) => string[])) => {
          // Update our mock array when the setter is called
          if (typeof value === 'function') {
            const newValue = value(mockPlayedTracks);
            mockPlayedTracks.length = 0;
            mockPlayedTracks.push(...newValue);
          } else {
            mockPlayedTracks.length = 0;
            mockPlayedTracks.push(...value);
          }
          mockSetPlayedTrackIds(value);
        },
      ];
    });

    // Render with test component
    render(
      <MusicProvider>
        <TestComponent onContextValue={contextValueSpy} />
      </MusicProvider>
    );

    // Get the latest context value
    const contextValue = contextValueSpy.mock.calls[contextValueSpy.mock.calls.length - 1][0];

    // Call markTrackAsPlayed with the same track ID
    act(() => {
      contextValue.markTrackAsPlayed('track123');
    });

    // Verify the track wasn't added again (array should still have length 1)
    expect(mockPlayedTracks.length).toBe(1);
    expect(mockPlayedTracks).toEqual(['track123']);
  });

  it('should clear track history when clearPlayedTracksHistory is called', async () => {
    // Setup spy to capture context value
    const contextValueSpy = jest.fn();

    // Mock useLocalStorage with existing tracks
    const mockPlayedTracks = ['track123', 'track456'];
    (useLocalStorage as jest.Mock).mockImplementation(() => {
      return [
        mockPlayedTracks,
        (value: string[] | ((prev: string[]) => string[])) => {
          // Update our mock array when the setter is called
          if (typeof value === 'function') {
            const newValue = value(mockPlayedTracks);
            mockPlayedTracks.length = 0;
            mockPlayedTracks.push(...newValue);
          } else {
            mockPlayedTracks.length = 0;
            mockPlayedTracks.push(...value);
          }
          mockSetPlayedTrackIds(value);
        },
      ];
    });

    // Render with test component
    render(
      <MusicProvider>
        <TestComponent onContextValue={contextValueSpy} />
      </MusicProvider>
    );

    // Get the latest context value
    const contextValue = contextValueSpy.mock.calls[contextValueSpy.mock.calls.length - 1][0];

    // Call clearPlayedTracksHistory
    await act(async () => {
      await contextValue.clearPlayedTracksHistory();
    });

    // Verify the setter was called with an empty array
    expect(mockSetPlayedTrackIds).toHaveBeenCalledWith([]);
    expect(mockPlayedTracks).toEqual([]);
  });
});
