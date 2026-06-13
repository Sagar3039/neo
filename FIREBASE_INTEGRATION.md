# Firebase Integration Implementation Guide

## Overview
This document summarizes the Firebase integration added to the Sagar streaming application. The implementation includes:
- Firebase Authentication
- Firestore-based data storage for user preferences, watchlist, favorites, and playback progress
- Persistent TMDB API key storage with Firestore/localStorage fallback
- Real-time syncing of user data

## Files Created

### 1. Service Layer (`/src/services/`)

#### `auth.js`
**Purpose**: Firebase Authentication management
**Exports**:
- `signIn(email, password)` - Sign in with email/password
- `signOut()` - Sign out current user
- `getCurrentUser()` - Get currently authenticated user
- `onAuthStateChanged(callback)` - Listen to auth state changes (returns unsubscribe function)

#### `tmdbKeyService.js`
**Purpose**: TMDB API key storage and validation with Firestore/localStorage fallback
**Key Features**:
- Validates API keys before saving (tests connectivity with TMDB)
- Saves to Firestore under `users/{uid}/settings/apiKeys/tmdbApiKey`
- Falls back to localStorage if Firebase unavailable
- Automatic migration from localStorage to Firestore on login
**Exports**:
- `validateTmdbKey(token)` - Validate API key against TMDB
- `saveTmdbKey(key)` - Save key to Firebase and localStorage
- `getTmdbKey()` - Get key from Firebase or localStorage
- `deleteTmdbKey()` - Delete key from both storage locations
- `hasTmdbKey()` - Check if key exists
- `migrateTmdbKeyToFirestore()` - Migrate localStorage key to Firestore
- `getValidationErrorMessage(reason, status)` - Get user-friendly error messages

#### `watchlist.js`
**Purpose**: User watchlist management (movies/shows to watch)
**Storage**: Firestore at `users/{uid}/watchlist/items`
**Exports**:
- `addToWatchlist(item)` - Add movie/show to watchlist
- `removeFromWatchlist(itemId)` - Remove from watchlist
- `getWatchlist()` - Get all watchlist items
- `isInWatchlist(itemId)` - Check if item in watchlist
- `onWatchlistChanged(callback)` - Real-time updates (returns unsubscribe)
- `syncWatchlist(localItems)` - Merge local items with Firestore

#### `favorites.js`
**Purpose**: User favorites management
**Storage**: Firestore at `users/{uid}/favorites/items`
**Exports**:
- `addToFavorites(item)` - Add item to favorites
- `removeFromFavorites(itemId)` - Remove from favorites
- `getFavorites()` - Get all favorites
- `isFavorited(itemId)` - Check if item is favorited
- `onFavoritesChanged(callback)` - Real-time updates (returns unsubscribe)
- `toggleFavorite(item)` - Toggle favorite status

#### `continueWatching.js`
**Purpose**: Track playback progress and continue watching
**Storage**: Firestore at `users/{uid}/continueWatching/{mediaId}_{mediaType}`
**Stores**: id, title, poster, media_type, timestamp (seconds), season, episode, lastWatched
**Exports**:
- `saveContinueWatching(mediaItem, progressData)` - Save playback progress
- `getContinueWatching()` - Get all continue watching entries (sorted by recent)
- `getProgress(mediaId, mediaType)` - Get progress for specific item
- `removeFromContinueWatching(mediaId, mediaType)` - Remove entry
- `onContinueWatchingChanged(callback)` - Real-time updates
- `syncContinueWatching(localProgress)` - Sync with Firestore

#### `userPreferences.js`
**Purpose**: User settings and preferences
**Storage**: Firestore at `users/{uid}/settings/preferences`
**Default Preferences**:
```javascript
{
  theme: "dark",
  accentColor: "red",
  fontSize: "normal",
  compactMode: false,
  reduceAnimations: false,
  subtitleLang: null,
  preferredGenres: [],
  language: "en-US",
  autoplayNext: true,
  notifyNewEpisodes: true
}
```
**Exports**:
- `saveUserPreferences(preferences)` - Save all preferences
- `getUserPreferences()` - Get preferences with defaults
- `updatePreference(key, value)` - Update single preference
- `onPreferencesChanged(callback)` - Real-time updates
- `syncPreferences(localPreferences)` - Sync with Firestore
- `loadUserProfile()` - Load user profile info
- `updateUserProfile(updates)` - Update profile

## Files Modified

### 1. `/src/utils/firebase.js` (Already Created)
Core Firebase initialization and base services. Already includes:
- Firebase app initialization
- Auth, Firestore, and Storage initialization
- Helper functions for secret storage and file uploads

### 2. `/src/App.jsx`
**Changes**:
- Added Firebase auth state listener to initialize user session on app startup
- Added TMDB key loading from Firestore/localStorage with automatic migration
- New state: `firebaseUser`, `authLoading`
- Imports from new services: `onAuthStateChanged`, `getTmdbKey`, `migrateTmdbKeyToFirestore`

**Key Behavior**:
- On app start: Listens to Firebase auth state changes
- If user logged in: Migrates localStorage API key to Firestore, loads from Firestore
- If user not logged in: Loads API key from localStorage fallback
- App waits for auth state and API key to load before showing UI

### 3. `/src/components/SetupScreen.jsx`
**Changes**:
- Imports validation and services from `tmdbKeyService`
- API key validation now uses centralized `validateTmdbKey()` function
- Error messages come from centralized `getValidationErrorMessage()` function
- On successful validation, key is saved to Firebase/localStorage via `saveTmdbKey()`

**Behavior**:
- User enters TMDB API key
- Key is validated against TMDB API
- If valid, saved to Firestore (and localStorage as fallback)
- SetupScreen closes and app starts

### 4. `/src/pages/SettingsPage.jsx`
**Changes**:
- Added imports for TMDB key service functions
- New component `TmdbApiKeyManager` for enhanced API key management
- Replaces simple "Change Token" button with full management interface

**New Features in Settings**:
- View masked API key (first 8 chars + asterisks)
- **Test Key button**: Validates key against TMDB without changing it
- **Change API Token button**: Opens setup to change key
- **Remove Key button**: Deletes key from both Firestore and localStorage
- Status messages showing test results and actions

## Firestore Data Structure

```
users/
  {uid}/
    (user profile data)
    uid: string
    email: string
    createdAt: timestamp
    updatedAt: timestamp
    
    settings/
      apiKeys/
        tmdbApiKey: string
        savedAt: timestamp
      preferences/
        theme: string
        accentColor: string
        fontSize: string
        ...other preferences
        updatedAt: timestamp
        
    watchlist/
      items/
        items: array[{id, title, poster_path, media_type, addedAt}]
        
    favorites/
      items/
        items: array[{id, title, poster_path, media_type, favoritedAt}]
        
    continueWatching/
      {mediaId}_{mediaType}/
        id: string
        media_type: string
        title: string
        poster_path: string
        timestamp: number (seconds)
        duration: number
        season: number
        episode: number
        lastWatched: timestamp
        updatedAt: timestamp
```

## How It Works

### Startup Flow (App.jsx)
1. App mounts
2. Firebase Auth listener is set up (checks current auth state)
3. If user is authenticated:
   - Call `migrateTmdbKeyToFirestore()` (moves localStorage key to Firestore if exists)
   - Call `getTmdbKey()` (loads from Firestore, falls back to localStorage)
4. If user is not authenticated:
   - Call `getTmdbKey()` (loads from localStorage only)
5. Set `apiKeyLoaded=true`, show UI or SetupScreen

### TMDB API Key Flow
1. **First time / No key stored**:
   - User sees SetupScreen
   - Enters TMDB API key
   - SetupScreen calls `validateTmdbKey()` to test it
   - If valid, `saveTmdbKey()` stores it to Firestore + localStorage
   - App continues to home page

2. **User logged in with saved key**:
   - `migrateTmdbKeyToFirestore()` ensures localStorage key is in Firestore
   - `getTmdbKey()` loads from Firestore
   - User never sees SetupScreen (key already valid)

3. **User not logged in**:
   - `getTmdbKey()` loads from localStorage only
   - After login, next session will migrate to Firestore

4. **User changes key in Settings**:
   - Clicks "Change API Token"
   - SetupScreen opens
   - New key is validated and saved
   - App reloads/updates

5. **User tests key in Settings**:
   - Clicks "Test Key"
   - `validateTmdbKey()` validates current saved key
   - Shows success/error message without changing anything

6. **User removes key**:
   - Clicks "Remove Key" in Settings
   - `deleteTmdbKey()` removes from both Firestore and localStorage
   - Next app restart will show SetupScreen

## Usage Examples

### In Components
```javascript
// Get TMDB key
import { getTmdbKey } from '../services/tmdbKeyService';

const key = await getTmdbKey();
// Use key for API calls

// Listen to watchlist changes
import { onWatchlistChanged } from '../services/watchlist';

useEffect(() => {
  const unsubscribe = onWatchlistChanged((items) => {
    setWatchlist(items);
  });
  return unsubscribe;
}, []);

// Save playback progress
import { saveContinueWatching } from '../services/continueWatching';

await saveContinueWatching(mediaItem, {
  timestamp: currentTime,
  duration: videoDuration,
  season: seasonNumber,
  episode: episodeNumber,
});

// Get user preferences
import { getUserPreferences, updatePreference } from '../services/userPreferences';

const prefs = await getUserPreferences();
await updatePreference('theme', 'light');
```

## Security Notes

### Firestore Rules
The following security rules should be set in Firebase Console for proper protection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own data
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      
      match /settings/{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
      
      match /watchlist/{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
      
      match /favorites/{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
      
      match /continueWatching/{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
    }
  }
}
```

### API Key Storage
- TMDB API keys are stored in Firestore under authenticated user documents
- Only the authenticated user can read/write their own settings
- Fallback to localStorage for unauthenticated users
- Never commit API keys to version control

## Migration from Local Storage

The implementation includes automatic migration:

1. When user logs in after having a localStorage key:
   - `migrateTmdbKeyToFirestore()` is called automatically
   - localStorage key is copied to Firestore
   - Both locations keep the key (can be cleared later if desired)

2. When user logs out and back in:
   - If Firestore has a key, use it (preferred)
   - If not, fall back to localStorage

## Testing Checklist

- [ ] App starts without errors
- [ ] SetupScreen appears if no API key saved
- [ ] API key validation works (test with valid and invalid keys)
- [ ] API key is saved to Firestore after setup
- [ ] API key persists after app restart
- [ ] "Test Key" button in Settings validates without changing key
- [ ] "Change API Token" opens setup screen
- [ ] "Remove Key" deletes from both Firestore and localStorage
- [ ] App shows SetupScreen again after removing key
- [ ] Firebase Auth listener initializes correctly
- [ ] localStorage fallback works when Firebase unavailable

## Dependencies

All implementations use existing dependencies:
- `firebase` (already installed)
- `react` (already installed)
- No new npm packages required

## Next Steps (Optional Enhancements)

1. **Add Authentication UI**:
   - Create login/signup screens using Firebase Auth UI
   - Add user profile page

2. **Implement Watchlist in UI**:
   - Add "Add to Watchlist" button to MoviePage/TVPage
   - Create Watchlist page showing saved items

3. **Implement Favorites**:
   - Add "Favorite" button/heart icon to cards
   - Display favorites on home page or dedicated page

4. **Sync Continue Watching**:
   - Update playback progress in real-time
   - Show Continue Watching carousel on home page

5. **Sync Preferences**:
   - Update user preferences in Firestore when changed in Settings
   - Load preferences automatically after login

6. **Analytics**:
   - Use Firebase Analytics to track user behavior
   - Monitor app performance and crashes

## Troubleshooting

### API Key not persisting
- Check browser console for Firebase errors
- Verify Firestore security rules allow write access
- Check localStorage is enabled in browser
- Verify Firebase credentials in `/src/utils/firebase.js`

### SetupScreen shows repeatedly
- Check Firestore for stored key in `users/{uid}/settings/apiKeys`
- Test the stored key with "Test Key" button
- Try removing key and re-entering

### Auth state not initializing
- Check Firebase Auth is enabled in Firebase Console
- Verify auth initialization in `App.jsx`
- Check browser console for auth errors

### Performance issues with real-time listeners
- Consider using `onSnapshot` with limited batch sizes
- Implement pagination for large datasets
- Use `orderBy` and `limit` in Firestore queries

## File Locations Summary

```
src/
├── utils/
│   └── firebase.js (already created - core Firebase setup)
├── services/
│   ├── auth.js (NEW)
│   ├── tmdbKeyService.js (NEW)
│   ├── watchlist.js (NEW)
│   ├── favorites.js (NEW)
│   ├── continueWatching.js (NEW)
│   └── userPreferences.js (NEW)
├── components/
│   └── SetupScreen.jsx (MODIFIED - uses tmdbKeyService)
├── pages/
│   └── SettingsPage.jsx (MODIFIED - enhanced API key management)
└── App.jsx (MODIFIED - Firebase auth initialization and API key loading)
```
