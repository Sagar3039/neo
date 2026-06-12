# Quick Reference: Modified Files & Key Changes

## Summary of Changes

This document provides quick reference for all modifications made to existing files.

---

## 1. `/src/App.jsx`

### Imports Added (Lines 1-21):
```javascript
// NEW: Firebase service imports
import { onAuthStateChanged } from "./services/auth";
import { getTmdbKey, migrateTmdbKeyToFirestore } from "./services/tmdbKeyService";
```

### State Added (Lines 43-45):
```javascript
// NEW: Firebase auth state
const [firebaseUser, setFirebaseUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
```

### Startup Effect Replaced (Lines ~320-345):
**OLD CODE** (Removed):
```javascript
// ── Load API key from secure storage on startup ──
useEffect(() => {
  let mounted = true;
  secureStorage.get("apikey").then((val) => {
    if (!mounted) return;
    setApiKey(val || null);
    setApiKeyLoaded(true);
  });
  return () => {
    mounted = false;
  };
}, []);
```

**NEW CODE**:
```javascript
// ── Initialize Firebase Auth and load TMDB key on startup ────────────────
useEffect(() => {
  let mounted = true;

  // Listen to Firebase auth state
  const unsubscribeAuth = onAuthStateChanged(async (user) => {
    if (!mounted) return;

    setFirebaseUser(user);
    setAuthLoading(false);

    if (user) {
      // User logged in: migrate localStorage key to Firestore and load from Firestore
      await migrateTmdbKeyToFirestore();
      const key = await getTmdbKey();
      if (mounted) {
        setApiKey(key || null);
        setApiKeyLoaded(true);
      }
    } else {
      // User not logged in: load from localStorage fallback
      const key = await getTmdbKey();
      if (mounted) {
        setApiKey(key || null);
        setApiKeyLoaded(true);
      }
    }
  });

  return () => {
    mounted = false;
    unsubscribeAuth();
  };
}, []);
```

---

## 2. `/src/components/SetupScreen.jsx`

### Imports Changed (Lines 1-2):

**OLD**:
```javascript
import { useState, useEffect, useRef } from "react";
import { NeoLogo, PlayIcon } from "./Icons";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function validateToken(token) {
  // ... 40 lines of validation code
}

function errorMessage(reason, status) {
  // ... 20 lines of error message code
}
```

**NEW**:
```javascript
import { useState, useEffect, useRef } from "react";
import { NeoLogo, PlayIcon } from "./Icons";
import { validateTmdbKey, getValidationErrorMessage, saveTmdbKey } from "../services/tmdbKeyService";
```

### handleSubmit Function Updated (Lines ~50-60):

**OLD**:
```javascript
const handleSubmit = async () => {
  const token = key.trim();
  if (!token) return;
  setChecking(true);
  setError(null);
  const result = await validateToken(token);
  setChecking(false);
  if (result.ok) {
    onSave(token);
  } else {
    setError(errorMessage(result.reason, result.status));
  }
};
```

**NEW**:
```javascript
const handleSubmit = async () => {
  const token = key.trim();
  if (!token) return;
  setChecking(true);
  setError(null);
  const result = await validateTmdbKey(token);
  setChecking(false);
  if (result.ok) {
    // Save key to Firebase Firestore (or localStorage as fallback)
    await saveTmdbKey(token);
    onSave(token);
  } else {
    setError(getValidationErrorMessage(result.reason, result.status));
  }
};
```

---

## 3. `/src/pages/SettingsPage.jsx`

### Imports Added (Lines 1-31):

**Added at end of existing imports**:
```javascript
import {
  validateTmdbKey,
  getValidationErrorMessage,
  saveTmdbKey,
  deleteTmdbKey,
} from "../services/tmdbKeyService";
```

### New Component Added (Before main export, ~Line 3095):

```javascript
// ── TMDB API Key Manager ──────────────────────────────────────────────────────
function TmdbApiKeyManager({ apiKey, onChangeApiKey }) {
  const [testingKey, setTestingKey] = useState(null);
  const [testStatus, setTestStatus] = useState(null); // null | { ok: bool, msg: string }
  const [isTesting, setIsTesting] = useState(false);

  const handleTestKey = async () => {
    if (!apiKey || !apiKey.trim()) {
      setTestStatus({ ok: false, msg: "No key to test" });
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    try {
      const result = await validateTmdbKey(apiKey);
      if (result.ok) {
        setTestStatus({ ok: true, msg: "✓ API key is valid and working" });
      } else {
        const errMsg = getValidationErrorMessage(result.reason, result.status);
        setTestStatus({ ok: false, msg: `✕ ${errMsg.title}` });
      }
    } catch (e) {
      setTestStatus({
        ok: false,
        msg: `✕ ${e.message || "Failed to test key"}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemoveKey = async () => {
    if (confirm("Remove the saved TMDB API key?")) {
      await deleteTmdbKey();
      onChangeApiKey?.();
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <code
          style={{
            fontSize: 13,
            color: "var(--text2)",
            background: "var(--surface2)",
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid var(--border)",
          }}
        >
          {apiKey ? apiKey.slice(0, 8) + "••••••••••••••••" : "(not set)"}
        </code>
        <button className="btn btn-ghost" onClick={onChangeApiKey}>
          Change API Token
        </button>
        {apiKey && (
          <>
            <button
              className="btn btn-ghost"
              disabled={isTesting}
              onClick={handleTestKey}
              style={{ opacity: isTesting ? 0.6 : 1 }}
            >
              {isTesting ? "Testing…" : "Test Key"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleRemoveKey}
              style={{
                color: "var(--red)",
              }}
            >
              Remove Key
            </button>
          </>
        )}
      </div>
      {testStatus && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: testStatus.ok ? "#48c774" : "var(--red)",
            marginTop: 8,
          }}
        >
          {testStatus.msg}
        </div>
      )}
    </div>
  );
}
```

### TMDB API Token Section Updated (Lines ~3450-3475):

**OLD**:
```javascript
{/* TMDB API Token */}
<div style={{ marginBottom: 40 }}>
  <div className="settings-section-title">TMDB Read Access Token</div>
  <div
    style={{
      fontSize: 13,
      color: "var(--text3)",
      marginBottom: 16,
      lineHeight: 1.6,
    }}
  >
    Used to fetch movie and TV metadata, posters, ratings, and cast
    info from The Movie Database.
  </div>
  <div
    style={{
      display: "flex",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap",
    }}
  >
    <code
      style={{
        fontSize: 13,
        color: "var(--text2)",
        background: "var(--surface2)",
        padding: "6px 14px",
        borderRadius: 6,
        border: "1px solid var(--border)",
      }}
    >
      {apiKey ? apiKey.slice(0, 8) + "••••••••••••••••" : "(not set)"}
    </code>
    <button className="btn btn-ghost" onClick={onChangeApiKey}>
      Change API Token
    </button>
  </div>
</div>
```

**NEW**:
```javascript
{/* TMDB API Token */}
<div style={{ marginBottom: 40 }}>
  <div className="settings-section-title">TMDB Read Access Token</div>
  <div
    style={{
      fontSize: 13,
      color: "var(--text3)",
      marginBottom: 16,
      lineHeight: 1.6,
    }}
  >
    Used to fetch movie and TV metadata, posters, ratings, and cast
    info from The Movie Database.
  </div>
  <TmdbApiKeyManager apiKey={apiKey} onChangeApiKey={onChangeApiKey} />
</div>
```

---

## New Service Files Created

| File | Purpose | Main Functions |
|------|---------|-----------------|
| `src/services/auth.js` | Firebase Authentication | signIn, signOut, getCurrentUser, onAuthStateChanged |
| `src/services/tmdbKeyService.js` | TMDB key management with Firebase storage | saveTmdbKey, getTmdbKey, validateTmdbKey, deleteTmdbKey, migrateTmdbKeyToFirestore |
| `src/services/watchlist.js` | Watchlist persistence | addToWatchlist, removeFromWatchlist, getWatchlist, onWatchlistChanged |
| `src/services/favorites.js` | Favorites persistence | addToFavorites, removeFromFavorites, getFavorites, onFavoritesChanged |
| `src/services/continueWatching.js` | Playback progress tracking | saveContinueWatching, getContinueWatching, getProgress, onContinueWatchingChanged |
| `src/services/userPreferences.js` | User settings persistence | saveUserPreferences, getUserPreferences, updatePreference, onPreferencesChanged |

---

## Behavioral Changes

### Before
- TMDB API key stored only in secure storage (Electron safeStorage)
- Key must be re-entered on every app restart (non-Electron browsers)
- No user authentication system
- No cross-device data sync
- No persistent user preferences

### After
- TMDB API key stored in Firestore (authenticated users) + localStorage fallback
- Key persists across app restarts and browsers
- Firebase Authentication available (when implemented)
- All user data can sync across devices via Firestore
- User preferences persist in Firestore
- Watchlist, favorites, and continue watching tracked per user

---

## Breaking Changes

**None** - All changes are backward compatible. Existing apps will continue to work and will migrate their data to Firebase on first login.

---

## Database Migrations

**Automatic**: The `migrateTmdbKeyToFirestore()` function is called on every app startup for authenticated users. It:
1. Checks localStorage for existing API key
2. If found and user is authenticated, saves to Firestore
3. Keeps both copies (safe to call multiple times)

---

## Testing Each Change

### Test 1: First Time Setup (No Saved Key)
1. Start app
2. SetupScreen should appear
3. Enter valid TMDB API key
4. Should save to Firestore (if authenticated) or localStorage
5. Home page loads

### Test 2: Restart App (Key Already Saved)
1. Close app
2. Restart app
3. SetupScreen should NOT appear
4. App loads directly to home page

### Test 3: Test Key Button in Settings
1. Go to Settings
2. Click "Test Key" button
3. Should validate current key without changing it
4. Show success or error message

### Test 4: Change Key in Settings
1. Go to Settings
2. Click "Change API Token"
3. Enter new key
4. Key should be validated and saved

### Test 5: Remove Key in Settings
1. Go to Settings
2. Click "Remove Key"
3. Confirm dialog
4. Key should be deleted
5. Restart app
6. SetupScreen should appear again

---

## Debugging

### View Firebase Auth State
```javascript
// In browser console
const { auth } = await import('./src/utils/firebase.js');
console.log(auth.currentUser);
```

### Check Firestore Data
- Go to Firebase Console → Firestore Database
- Navigate to `users/{uid}` to see stored data
- Check `settings/apiKeys` for saved TMDB key

### View localStorage
```javascript
// In browser console
localStorage.getItem('tmdb_api_key');
```

### Monitor Service Calls
```javascript
// In SettingsPage or any component
import { getTmdbKey } from '../services/tmdbKeyService';

const key = await getTmdbKey();
console.log('TMDB Key loaded:', key ? '✓ Found' : '✗ Not found');
```
