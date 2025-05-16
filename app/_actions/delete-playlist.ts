'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface DeleteResult {
  success: boolean;
  error?: string | null;
}

export async function deleteUserPlaylist(playlistId: string): Promise<DeleteResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Delete playlist: Authentication error', authError);
    return { success: false, error: 'User not authenticated. Please log in again.' };
  }

  if (!playlistId) {
    return { success: false, error: 'Playlist ID is required.' };
  }

  try {
    // First, verify the playlist belongs to the user and exists
    const { data: playlistData, error: fetchError } = await supabase
      .from('playlists')
      .select('id, submitted_by_user_id')
      .eq('id', playlistId)
      .single(); // Use .single() to expect one row or error

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // PostgREST error for zero rows with .single()
        console.warn(`Delete playlist: Playlist ID ${playlistId} not found.`);
        return { success: false, error: 'Playlist not found.' };
      }
      console.error('Delete playlist: Error fetching playlist for verification:', fetchError);
      return { success: false, error: `Error verifying playlist: ${fetchError.message}` };
    }

    if (!playlistData) {
      // Should be caught by PGRST116 but good to double check
      console.warn(`Delete playlist: Playlist ID ${playlistId} not found (after fetch).`);
      return { success: false, error: 'Playlist not found.' };
    }

    if (playlistData.submitted_by_user_id !== user.id) {
      console.warn(
        `Delete playlist: User ${user.id} attempted to delete playlist ${playlistId} owned by ${playlistData.submitted_by_user_id}.`
      );
      return { success: false, error: 'You are not authorized to delete this playlist.' };
    }

    // Proceed with deletion
    const { data: deletedRecords, error: deleteError } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId)
      .select(); // Add .select() to get the deleted records back

    if (deleteError) {
      console.error('Delete playlist: Error deleting playlist:', deleteError);
      return { success: false, error: `Failed to delete playlist: ${deleteError.message}` };
    }

    // Check if any records were actually deleted
    // If deletedRecords is null or empty, it means no rows were affected by the delete operation.
    if (!deletedRecords || deletedRecords.length === 0) {
      console.warn(
        `Delete playlist: Delete operation on playlist ID ${playlistId} by user ${user.id} affected 0 rows. This could be due to RLS, a trigger, or the record already being gone.`
      );
      return {
        success: false,
        error:
          'Failed to delete the playlist. The record may have already been removed, or the operation was blocked.',
      };
    }

    console.log(
      `Playlist ${playlistId} deleted successfully by user ${user.id}. Affected records: ${deletedRecords.length}`
    );

    // Revalidate the path to update the UI if using Next.js App Router with caching
    revalidatePath('/profile/playlists');

    return { success: true };
  } catch (e: unknown) {
    console.error('Delete playlist: Unexpected error:', e);
    let errorMessage = 'An unexpected error occurred during deletion.';
    if (e instanceof Error && e.message) {
      errorMessage = e.message;
    }
    return { success: false, error: errorMessage };
  }
}
