// Utility functions for comparing user music taste
import { createClient } from '@/lib/supabase/client'; // Using server client as this might be called from actions/server components

/**
 * Calculates the Jaccard Index between two sets of strings.
 * The Jaccard Index is a measure of similarity between two sets,
 * defined as the size of the intersection divided by the size of the union.
 *
 * @param setA - The first set of strings.
 * @param setB - The second set of strings.
 * @returns The Jaccard Index as a number between 0 and 1.
 * Returns 0 if both sets are empty or if an error occurs.
 */
export function calculateJaccardIndex(setA: Set<string>, setB: Set<string>): number {
  if (!setA || !setB) {
    // console.warn('[taste-comparison] One or both sets are null/undefined.');
    return 0;
  }

  const intersection = new Set<string>();
  setA.forEach((item) => {
    if (setB.has(item)) {
      intersection.add(item);
    }
  });

  const union = new Set<string>([...setA, ...setB]);

  if (union.size === 0) {
    // This case handles if both setA and setB are empty.
    // console.log('[taste-comparison] Union of sets is empty (both sets likely empty).');
    return 0; // Or 1 if empty sets are considered perfectly similar, Jaccard is typically 0.
  }

  const score = intersection.size / union.size;
  // console.log(`[taste-comparison] Intersection: ${intersection.size}, Union: ${union.size}, Score: ${score}`);
  return score;
}

/**
 * Calculates a taste similarity score between two users based on their top artists.
 * Fetches data and uses the Jaccard Index on artist IDs.
 * @param userId1 - UUID of the first user.
 * @param userId2 - UUID of the second user.
 * @returns A promise that resolves to a similarity score between 0 and 1.
 */
export async function calculateTasteSimilarity(userId1: string, userId2: string): Promise<number> {
  // Check if comparing a user to themselves
  if (userId1 === userId2) {
    return 1.0; // A user is perfectly similar to themselves
  }

  const supabase = await createClient();

  try {
    // Fetch top artists for both users concurrently
    const [user1ArtistsRes, user2ArtistsRes] = await Promise.all([
      supabase.from('user_top_artists').select('artist_spotify_id').eq('user_id', userId1),
      supabase.from('user_top_artists').select('artist_spotify_id').eq('user_id', userId2),
    ]);

    // Handle potential errors during fetch
    if (user1ArtistsRes.error) {
      console.error(`Error fetching artists for user ${userId1}:`, user1ArtistsRes.error.message);
      return 0;
    }
    if (user2ArtistsRes.error) {
      console.error(`Error fetching artists for user ${userId2}:`, user2ArtistsRes.error.message);
      return 0;
    }

    // Create sets of artist IDs
    const user1ArtistIds = new Set(user1ArtistsRes.data?.map((a) => a.artist_spotify_id) || []);
    const user2ArtistIds = new Set(user2ArtistsRes.data?.map((a) => a.artist_spotify_id) || []);

    // Calculate similarity using the extracted function
    const similarity = calculateJaccardIndex(user1ArtistIds, user2ArtistIds);

    console.log(
      `Similarity between ${userId1} and ${userId2}: ${similarity} (Set1: ${user1ArtistIds.size}, Set2: ${user2ArtistIds.size})`
    );

    return similarity;
  } catch (error) {
    console.error('Unexpected error in calculateTasteSimilarity:', error);
    return 0; // Return 0 on unexpected errors
  }
}

/**
 * Core logic for checking taste similarity, accepting a similarity calculation function.
 * @param userId1 - UUID of the first user.
 * @param userId2 - UUID of the second user.
 * @param calculateSimilarityFn The function to use for calculating similarity.
 * @param threshold - The minimum similarity score required (exclusive). Defaults to 0.05 (5%).
 * @returns A promise that resolves to true if similar, false otherwise.
 */
export async function isTasteSimilarLogic(
  userId1: string,
  userId2: string,
  calculateSimilarityFn: (u1: string, u2: string) => Promise<number>,
  threshold: number = 0.05
): Promise<boolean> {
  if (userId1 === userId2) {
    // A user is always similar to themselves above any typical threshold
    // For a threshold of 1, this would be false, but 1 is an unlikely threshold for "similar"
    return threshold < 1.0;
  }
  try {
    const similarityScore = await calculateSimilarityFn(userId1, userId2);
    return similarityScore > threshold;
  } catch (error) {
    // Log the error from the perspective of isTasteSimilarLogic
    console.error(
      `Error in isTasteSimilarLogic (using provided calculateSimilarityFn) between ${userId1} and ${userId2}:`,
      error
    );
    // If the provided calculateSimilarityFn throws, assume not similar.
    return false;
  }
}

/**
 * Checks if the taste similarity score between two users meets a given threshold.
 * Uses the main calculateTasteSimilarity function.
 * @param userId1 - UUID of the first user.
 * @param userId2 - UUID of the second user.
 * @param threshold - The minimum similarity score required (exclusive). Defaults to 0.05 (5%).
 * @returns A promise that resolves to true if similar, false otherwise.
 */
export async function isTasteSimilar(
  userId1: string,
  userId2: string,
  threshold: number = 0.05
): Promise<boolean> {
  // Delegates to isTasteSimilarLogic, providing the actual calculateTasteSimilarity function
  return isTasteSimilarLogic(userId1, userId2, calculateTasteSimilarity, threshold);
}

// export {}; // No longer needed as we have named exports
