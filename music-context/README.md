# MusicContext Refactor

## Problem Addressed

The Spotify Web Playback SDK player would reinitialize during token refresh events, causing playback interruptions. Previous attempts to fix this focused on:

1. Modifying effect dependencies
2. Stabilizing userSession state during token refresh
3. Changing the getOAuthToken callback implementation

These approaches didn't fully resolve the issue because the token refresh process was tightly coupled with React state and component lifecycle.

## Solution: Token Manager Architecture

The new approach uses a decoupled token manager that:

1. Maintains token state outside of React's state system
2. Centralizes all token-related operations
3. Provides a consistent token interface to components and callbacks
4. Handles token refresh without triggering React re-renders

### Key Components

1. **token-manager.ts**
   - Maintains token state in module-level variables
   - Handles token refresh independently of component lifecycle
   - Batches multiple token requests during refresh
   - Provides simple, consistent API for getting tokens
   
2. **Simplified user-session.ts**
   - Removed all token-related state and logic
   - Focuses solely on tracking user ID and Spotify user ID
   - No longer responsible for token refresh
   - Cleaner separation of concerns

3. **Updated MusicContext**
   - Uses token-manager for all token needs
   - Doesn't include token state in effect dependencies
   - Maintains a stable getOAuthToken callback for the player

## How This Fixes The Issues

1. **Player Stability During Token Refresh**
   - Token refresh happens independently of React state
   - Player initialization doesn't depend on token state changes
   - The getOAuthToken callback becomes a stable reference that always gets the latest token

2. **Wake-from-Sleep Scenarios**
   - The token manager can refresh the token when needed without affecting player initialization
   - The player remains initialized during token operations

3. **API Call Reliability**
   - All API calls get tokens from the same centralized source
   - Concurrent API calls during refresh are properly handled

## Implementation Details

The solution separates concerns:
- Token management is handled by token-manager.ts
- User session info (user ID and Spotify user ID) comes from user-session.ts
- Player initialization depends only on essential parameters (isDisabled, sdkReady)

This approach follows the principle of "lifting state up and out" - moving the token state management outside the React component tree to avoid unnecessary re-renders and effect triggers.

## Clean Architecture Benefits

By splitting token management from user session management:

1. Each module has a single responsibility
2. Dependencies are clearer and more explicit
3. Testing is easier with isolated components
4. Future changes to either system won't affect the other
5. The player's lifecycle is completely independent of token refresh events 