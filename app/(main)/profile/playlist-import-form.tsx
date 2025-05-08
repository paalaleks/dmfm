'use client';

import { useState, useTransition } from 'react';
// Assuming the server action is at app/_actions/import-playlist.ts
// The relative path from app/(main)/profile/ to app/_actions/ is ../../_actions/
import { importPlaylist } from '../../_actions/import-playlist';
import type { ImportPlaylistResult } from '../../_actions/import-playlist'; // Import the type

export default function PlaylistImportForm() {
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    let finalPlaylistId = inputValue.trim();
    if (!finalPlaylistId) {
      setError('Please enter a Spotify Playlist ID or URL.');
      return;
    }

    // Try to extract ID from URL
    try {
      // Check if it's a Spotify URL
      if (finalPlaylistId.includes('open.spotify.com/playlist/')) {
        const url = new URL(finalPlaylistId);
        const pathParts = url.pathname.split('/');
        const playlistIndex = pathParts.indexOf('playlist');
        if (playlistIndex !== -1 && pathParts.length > playlistIndex + 1) {
          finalPlaylistId = pathParts[playlistIndex + 1].split('?')[0]; // Remove query params like ?si=...
        } else {
          // If "playlist" isn't in the path as expected, or no ID follows.
          setError('Invalid Spotify Playlist URL format.');
          return;
        }
      }
    } catch (e) {
      // Not a valid URL, assume it's an ID or invalid input that will be caught by regex
      // Log the error to mark 'e' as used and for potential debug insights
      console.warn(
        'Error during URL parsing (expected if input is an ID, otherwise check error):',
        e
      );
    }

    // Validate for typical Spotify ID format (alphanumeric, 22 chars)
    if (!/^[a-zA-Z0-9]{22}$/.test(finalPlaylistId)) {
      setError(
        'Invalid Spotify Playlist ID or URL. Please ensure it is a valid ID (22 alphanumeric characters) or a full Spotify playlist URL.'
      );
      return;
    }

    startTransition(async () => {
      try {
        const result: ImportPlaylistResult = await importPlaylist(finalPlaylistId);
        if (result.success) {
          setMessage(result.message || 'Playlist processed successfully!');
          setInputValue(''); // Clear input on success
        } else {
          setError(result.message || 'Failed to process playlist.');
        }
      } catch (e) {
        console.error('Form submission error:', e);
        setError('An unexpected error occurred while submitting the form.');
      }
    });
  };

  return (
    <div
      style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}
    >
      <h3>Import Spotify Playlist</h3>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <div>
          <label htmlFor='playlistId' style={{ display: 'block', marginBottom: '5px' }}>
            Spotify Playlist ID or URL:
          </label>
          <input
            type='text'
            id='playlistId'
            name='playlistId'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='e.g., 37i9dQZF1DXcBWIGoYBM5M or full URL'
            disabled={isPending}
            style={{
              padding: '8px',
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
          />
        </div>
        <button
          type='submit'
          disabled={isPending}
          style={{
            padding: '10px 15px',
            backgroundColor: isPending ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Importing...' : 'Import Playlist'}
        </button>
        {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </form>
    </div>
  );
}
