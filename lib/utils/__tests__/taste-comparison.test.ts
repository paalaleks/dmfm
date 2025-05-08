import * as tasteComparisonModule from '../taste-comparison';

// Explicitly mock the Supabase server client for tests that might call the real calculateTasteSimilarity
// or the public isTasteSimilar (which uses the real calculateTasteSimilarity).
jest.mock('@/lib/supabase/server');

// The old mock for the entire module is no longer needed here as we test isTasteSimilarLogic directly.
// jest.mock('../taste-comparison', () => ({
//   ...jest.requireActual('../taste-comparison'),
//   calculateTasteSimilarity: jest.fn(),
// }));

describe('calculateJaccardIndex', () => {
  // Test the real calculateJaccardIndex directly
  it('should return 1 for identical non-empty sets', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['a', 'b', 'c']);
    expect(tasteComparisonModule.calculateJaccardIndex(setA, setB)).toBe(1);
  });

  it('should return 0 for completely disjoint sets', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['d', 'e', 'f']);
    expect(tasteComparisonModule.calculateJaccardIndex(setA, setB)).toBe(0);
  });

  it('should return 0 if one set is empty', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set<string>();
    expect(tasteComparisonModule.calculateJaccardIndex(setA, setB)).toBe(0);
    expect(tasteComparisonModule.calculateJaccardIndex(setB, setA)).toBe(0);
  });

  it('should return 0 if both sets are empty', () => {
    const setA = new Set<string>();
    const setB = new Set<string>();
    expect(tasteComparisonModule.calculateJaccardIndex(setA, setB)).toBe(0);
  });

  it('should calculate the correct Jaccard Index for partially overlapping sets', () => {
    const setA = new Set(['a', 'b', 'c', 'd']);
    const setB = new Set(['c', 'd', 'e', 'f']);
    expect(tasteComparisonModule.calculateJaccardIndex(setA, setB)).toBeCloseTo(1 / 3);
  });

  it('should calculate correctly when one set is a subset of the other', () => {
    const setA = new Set(['a', 'b']);
    const setB = new Set(['a', 'b', 'c']);
    expect(tasteComparisonModule.calculateJaccardIndex(setA, setB)).toBeCloseTo(2 / 3);
    expect(tasteComparisonModule.calculateJaccardIndex(setB, setA)).toBeCloseTo(2 / 3);
  });
});

// Now testing isTasteSimilarLogic directly
describe('isTasteSimilarLogic', () => {
  let mockCalculateSimilarityFn: jest.Mock;

  beforeEach(() => {
    mockCalculateSimilarityFn = jest.fn();
  });

  it('should return true if similarity score is greater than default threshold', async () => {
    mockCalculateSimilarityFn.mockResolvedValue(0.1);
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user2',
      mockCalculateSimilarityFn
    );
    expect(result).toBe(true);
    expect(mockCalculateSimilarityFn).toHaveBeenCalledWith('user1', 'user2');
  });

  it('should return false if similarity score is equal to default threshold', async () => {
    mockCalculateSimilarityFn.mockResolvedValue(0.05);
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user2',
      mockCalculateSimilarityFn
    );
    expect(result).toBe(false);
  });

  it('should return false if similarity score is less than default threshold', async () => {
    mockCalculateSimilarityFn.mockResolvedValue(0.01);
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user2',
      mockCalculateSimilarityFn
    );
    expect(result).toBe(false);
  });

  it('should return true if similarity score is greater than custom threshold', async () => {
    mockCalculateSimilarityFn.mockResolvedValue(0.2);
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user2',
      mockCalculateSimilarityFn,
      0.15
    );
    expect(result).toBe(true);
  });

  it('should return false if similarity score is less than custom threshold', async () => {
    mockCalculateSimilarityFn.mockResolvedValue(0.1);
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user2',
      mockCalculateSimilarityFn,
      0.15
    );
    expect(result).toBe(false);
  });

  it('should return true if comparing a user to themselves (default threshold < 1.0)', async () => {
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user1',
      mockCalculateSimilarityFn
    );
    expect(result).toBe(true);
    expect(mockCalculateSimilarityFn).not.toHaveBeenCalled();
  });

  it('should return false if comparing a user to themselves with threshold 1.0', async () => {
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user1',
      mockCalculateSimilarityFn,
      1.0
    );
    expect(result).toBe(false);
    expect(mockCalculateSimilarityFn).not.toHaveBeenCalled();
  });

  it('should return false if comparing a user to themselves with threshold > 1.0', async () => {
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user1',
      mockCalculateSimilarityFn,
      1.1
    );
    expect(result).toBe(false);
    expect(mockCalculateSimilarityFn).not.toHaveBeenCalled();
  });

  it('should return false if the calculateSimilarityFn throws an error', async () => {
    mockCalculateSimilarityFn.mockRejectedValue(new Error('Calculation failed'));
    const result = await tasteComparisonModule.isTasteSimilarLogic(
      'user1',
      'user2',
      mockCalculateSimilarityFn
    );
    expect(result).toBe(false);
  });
});
