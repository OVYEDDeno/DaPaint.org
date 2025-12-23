# DaPaint Functions Overview

This document describes all the DaPaint functions available in the application and how to test them.

## Authentication Functions

### `signUp(email, password, displayName)`
- Creates a new user account with authentication and user profile
- **Test**: Verify new user can register with valid credentials

### `signIn(email, password)`
- Authenticates an existing user
- **Test**: Verify existing user can log in with correct credentials

### `signOut()`
- Logs out the current user
- **Test**: Verify user session is cleared after logout

### `getSession()`
- Retrieves the current user session
- **Test**: Verify session data is returned when user is authenticated

### `isAuthenticated()`
- Checks if user is currently authenticated
- **Test**: Verify returns true when logged in, false when logged out

## DaPaint Functions

### `createDaPaint(params)`
- Creates a new DaPaint with specified parameters
- **Test**: Verify DaPaint is created with correct details and appears in database

### `getAvailableDaPaints(userId)`
- Retrieves DaPaints available for a user to join (same winstreak, not hosted by user, no foe yet)
- **Test**: Verify returns correct DaPaints based on user's winstreak and location

### `getExploreDaPaints(userId)`
- Retrieves DaPaints in different locations with same winstreak
- **Test**: Verify returns DaPaints from different zipcodes with same winstreak

### `joinDaPaint(dapaintId, userId, displayName)`
- Joins a user to an available DaPaint
- **Test**: Verify user can join DaPaint and DaPaint status updates correctly

### `leaveDaPaint(dapaintId)`
- Removes user from a DaPaint
- **Test**: Verify user is removed and DaPaint status updates according to business rules

### `getActiveDaPaint(userId)`
- Gets the user's currently active DaPaint
- **Test**: Verify returns active DaPaint when user has one, null when none

### `canUserJoinDaPaint(userId, targetDaPaint)`
- Checks if user can join a specific DaPaint
- **Test**: Verify returns correct status based on user's active DaPaint and DaPaint rules

## User Functions

### `getCurrentUserProfile()`
- Retrieves the current user's profile information
- **Test**: Verify returns complete user profile data

### `getPublicProfile(username)`
- Retrieves a public user profile by username
- **Test**: Verify returns public data for specified user

### `updateUserProfile(updates)`
- Updates the current user's profile information
- **Test**: Verify profile fields are updated correctly in database

### `updateLastActive()`
- Updates the user's last active timestamp
- **Test**: Verify timestamp is updated to current time

### `recordWin()`
- Records a win for the current user, updating winstreak
- **Test**: Verify win count and winstreak are incremented correctly

### `recordLoss()`
- Records a loss for the current user, resetting winstreak
- **Test**: Verify loss count incremented and winstreak reset

### `unlockDaPaint10x()`
- Unlocks the 10x feature for the user
- **Test**: Verify feature flag is set to true

### `unlockDaPaintAds()`
- Unlocks the ads feature for the user
- **Test**: Verify feature flag is set to true

### `getTopWinStreaks(limit)`
- Gets top users by current winstreak
- **Test**: Verify returns users ordered by highest winstreak

### `getTopWins(limit)`
- Gets top users by total wins
- **Test**: Verify returns users ordered by highest wins

### `searchUsers(query, limit)`
- Searches users by username or display name
- **Test**: Verify returns matching users based on search query

## Testing in Development

To test these functions during development:

1. **Using the App**: All functions can be tested through the app's UI
2. **Using React Native Debugger**: Set breakpoints and inspect function calls
3. **Using Supabase Dashboard**: Verify database changes after function calls
4. **Using React Native DevTools**: Monitor network requests and state changes

## Business Logic

### Winstreak Matching
- Users can only join DaPaints with their exact winstreak
- This ensures fair competition between users of similar skill levels

### Exclusivity Rule
- Users can only be in one active DaPaint at a time
- Attempting to join another DaPaint will trigger conflict resolution

### 48-Hour Rule
- If a user tries to leave a DaPaint within 48 hours of start time:
  - Host leaving with a foe = FORFEIT (foe wins)
  - Foe leaving = FORFEIT (host wins)
- Outside 48 hours:
  - Host leaving with a foe = DELETE DaPaint
  - Foe leaving = JUST LEAVE

### Team DaPaints
- Support multiple participants on each side
- Balanced teams are determined by equal participant counts
- Users can switch teams during the DaPaint

## Data Integrity
- Automatic cleanup of unmatched DaPaints
- Proper winstreak management after DaPaint completion
- Dispute resolution for conflicting result submissions