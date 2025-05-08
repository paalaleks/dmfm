// This is the mock Supabase client instance that will be returned
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockImplementation(async () => ({ data: [], error: null })), // .eq() might be the end of a chain
  // Mock other Supabase client methods you use here as needed:
  insert: jest.fn().mockImplementation(async () => ({ data: [], error: null })),
  update: jest.fn().mockImplementation(async () => ({ data: [], error: null })),
  delete: jest.fn().mockImplementation(async () => ({ data: [], error: null })),
  rpc: jest.fn().mockImplementation(async () => ({ data: null, error: null })),
  // Add a catch-all for any other methods that might be called on the client
  // and ensure they return a promise if they are part of an async chain.
  mock: jest.fn().mockReturnThis(), // Default for unhandled chained calls
  then: undefined, // Remove if it causes issues, was for direct promise-like behavior
};

// createClient is an async function, so the mock should also be async
// or return a Promise that resolves to the mock client object.
export const createClient = jest.fn(async () => mockSupabaseClient);
