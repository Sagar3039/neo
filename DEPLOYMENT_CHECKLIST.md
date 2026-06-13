# Deployment & Next Steps Checklist

## Pre-Deployment Verification

### Firebase Configuration ✓
- [x] Firebase credentials in `/src/utils/firebase.js` are set
- [x] Firebase project initialized
- [x] Firestore database created
- [x] Authentication enabled in Firebase Console

### Code Changes ✓
- [x] `/src/App.jsx` updated with auth listener and API key loading
- [x] `/src/components/SetupScreen.jsx` updated to use tmdbKeyService
- [x] `/src/pages/SettingsPage.jsx` enhanced with API key management
- [x] All 6 service files created in `/src/services/`
- [x] All imports resolve correctly
- [x] No syntax errors

### Backward Compatibility ✓
- [x] Existing apps still work (API key can be on filesystem or stored previously)
- [x] localStorage fallback for non-authenticated users
- [x] Automatic migration from localStorage to Firestore on login

---

## Immediate Next Steps (After Deployment)

### 1. Test the App Build
```bash
cd /path/to/sagar
npm run dev  # or npm start for production build
```

**Expected Behavior**:
- Vite dev server starts (http://localhost:5173)
- No critical errors in console
- If no API key stored: SetupScreen appears
- If API key exists: App loads to home page

### 2. Test SetupScreen
1. Clear localStorage: `localStorage.clear()` in browser console
2. Refresh app
3. SetupScreen should appear
4. Enter invalid key → Should show error
5. Enter valid TMDB API key → Should save and continue
6. Check Firestore for saved key at `users/{uid}/settings/apiKeys`

### 3. Test Settings Page
1. Go to Settings → General → TMDB Read Access Token
2. Should show masked key
3. Click "Test Key" → Should validate
4. Click "Change API Token" → SetupScreen appears
5. Click "Remove Key" → Key deleted, SetupScreen appears on restart

### 4. Test Persistence
1. Save API key
2. Close app and browser
3. Reopen app
4. API key should load without SetupScreen
5. Verify it's loaded from Firestore (check network tab)

---

## Firebase Security Rules Setup

1. Go to Firebase Console → Firestore Database → Rules
2. Replace with appropriate rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own user data
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      
      match /{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
    }
  }
}
```

3. Publish rules

---

## Integration with Existing Features (Optional Enhancements)

### Phase 1: Basic Persistence (Already Done)
- [x] API key persistence
- [x] Auth state initialization
- [x] Settings page enhancements

### Phase 2: User Data Sync (Ready to Implement)

#### A. Watchlist Integration
1. Import watchlist service in `MoviePage.jsx` and `TVPage.jsx`
2. Add "Add to Watchlist" button to movie/show cards
3. Check if item in watchlist using `isInWatchlist()`
4. Save to watchlist when button clicked
5. Show visual indicator if already in watchlist

**Files to modify**: `src/pages/MoviePage.jsx`, `src/pages/TVPage.jsx`, `src/components/MediaCard.jsx`

#### B. Favorites Integration
1. Import favorites service
2. Add heart/star icon to cards (already might exist)
3. Connect to `toggleFavorite()` function
4. Show favorite status from `isFavorited()`

**Files to modify**: `src/components/MediaCard.jsx`

#### C. Continue Watching
1. Import continueWatching service in player component
2. On every time update, call `saveContinueWatching()`
3. Display Continue Watching carousel on home page
4. Pull from `getContinueWatching()` sorted by recent

**Files to modify**: `src/pages/MoviePage.jsx`, `src/pages/HomePage.jsx`

#### D. User Preferences Sync
1. Import userPreferences service in SettingsPage
2. When settings change, call `updatePreference()`
3. On app load, call `getUserPreferences()` and apply to UI
4. Use real-time listener with `onPreferencesChanged()`

**Files to modify**: `src/pages/SettingsPage.jsx`, `src/App.jsx`

### Phase 3: Authentication UI (Optional)
1. Create login/signup screens
2. Use Firebase Auth UI or custom forms
3. Add user profile page
4. Add logout button to navbar

---

## Troubleshooting Common Issues

### Issue: SetupScreen keeps appearing
**Solution**:
1. Check browser console for Firebase errors
2. Verify Firestore security rules allow write access
3. Check `users/{uid}/settings/apiKeys` exists in Firestore
4. Clear localStorage and try again
5. Check API key is valid with "Test Key" button

### Issue: API key not persisting
**Solution**:
1. Verify user is authenticated (check `firebase.auth().currentUser`)
2. Check Firestore has write permission for authenticated user
3. Verify `localStorage.getItem('tmdb_api_key')` returns something
4. Check browser localStorage limits not exceeded
5. Check browser isn't in private/incognito mode (might limit storage)

### Issue: App slow when loading
**Solution**:
1. Check Firestore queries have indexes (Firestore will suggest)
2. Limit real-time listeners to only what's needed
3. Use `orderBy().limit()` for paginated results
4. Check network tab for slow Firestore calls

### Issue: Firebase errors in console
**Solution**:
1. Check Firebase project ID in `/src/utils/firebase.js` is correct
2. Verify API keys in Firebase config are valid
3. Check Firebase Console → Project Settings → Web App configs
4. Ensure Firestore, Auth are enabled in Firebase Console

---

## Performance Optimization Tips

### 1. Lazy Load Services
```javascript
// Instead of importing at top
import { getTmdbKey } from '../services/tmdbKeyService';

// Consider dynamic import for rarely-used services
const { getWatchlist } = await import('../services/watchlist');
```

### 2. Cache Firestore Queries
```javascript
// Add caching layer for frequently accessed data
const cache = new Map();
export async function getCachedWatchlist() {
  if (cache.has('watchlist')) return cache.get('watchlist');
  const items = await getWatchlist();
  cache.set('watchlist', items);
  return items;
}
```

### 3. Batch Write Operations
```javascript
// Instead of multiple writes, batch them
async function bulkAddToWatchlist(items) {
  const batch = writeBatch(db);
  items.forEach(item => {
    // Add to batch
  });
  await batch.commit();
}
```

### 4. Pagination for Large Datasets
```javascript
// For continue watching with 1000+ entries
import { query, orderBy, limit, startAfter } from 'firebase/firestore';

export async function getPaginatedContinueWatching(pageSize = 20, startAfterDoc = null) {
  let q = query(
    collection(db, 'users', user.uid, 'continueWatching'),
    orderBy('lastWatched', 'desc'),
    limit(pageSize)
  );
  
  if (startAfterDoc) {
    q = query(...queries, startAfter(startAfterDoc));
  }
  
  const snapshot = await getDocs(q);
  return snapshot;
}
```

---

## Monitoring & Analytics

### Add Firebase Analytics (Optional)
```javascript
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics(app);

// Track API key saved
logEvent(analytics, 'tmdb_key_saved', { 
  timestamp: new Date().toISOString() 
});

// Track watchlist item added
logEvent(analytics, 'watchlist_item_added', {
  media_id: item.id,
  media_type: item.media_type
});
```

### Error Tracking (Optional)
```javascript
// Capture and log errors to Firestore for debugging
async function logError(error, context) {
  try {
    const user = auth.currentUser;
    await setDoc(doc(db, 'errors', `${Date.now()}`), {
      uid: user?.uid,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}
```

---

## Documentation for Future Maintainers

### Key Files
- **Main integration**: `/src/utils/firebase.js`
- **Services**: `/src/services/*.js` (6 files)
- **Modified components**: `App.jsx`, `SetupScreen.jsx`, `SettingsPage.jsx`

### How to Add New Services
1. Create new file in `/src/services/` (e.g., `watchedMovies.js`)
2. Import Firestore functions needed
3. Export async functions following the pattern in existing services
4. Use `users/{uid}/` as base path for user data
5. Add optional real-time listeners with `onSnapshot()`

### Common Patterns Used
```javascript
// Get authenticated user
const user = auth.currentUser;
if (!user) throw new Error('User not authenticated');

// Create/update document
const docRef = doc(db, 'users', user.uid, 'collection', 'document');
await setDoc(docRef, data, { merge: true });

// Listen for changes
return onSnapshot(docRef, (docSnap) => {
  callback(docSnap.data());
});
```

---

## Rollback Plan

If issues occur after deployment:

### Option 1: Disable Firebase Features
1. Comment out `onAuthStateChanged()` in App.jsx
2. Keep using localStorage only: `secureStorage.get('apikey')`
3. Service functions become no-op
4. App continues with original behavior

### Option 2: Revert Files
```bash
git checkout -- src/App.jsx src/components/SetupScreen.jsx src/pages/SettingsPage.jsx
rm -rf src/services/
```

### Option 3: Keep Both Systems
- Keep original localStorage-based system
- New services run in parallel
- Can migrate users gradually
- Easier rollback if issues found

---

## Long-term Maintenance

### Weekly
- [ ] Monitor Firebase usage and costs
- [ ] Check error logs in Firebase Console
- [ ] Review slow Firestore queries (can be seen in metrics)

### Monthly
- [ ] Update Firebase SDK: `npm update firebase`
- [ ] Review user preferences for optimization opportunities
- [ ] Analyze which features users use most

### Quarterly
- [ ] Performance audit of Firestore queries
- [ ] User data cleanup (old continue watching, forgotten items)
- [ ] Security review (check Firestore rules)

---

## Success Metrics

Track these to verify successful implementation:

1. **API Key Persistence**
   - Users don't need to re-enter key on restart
   - Key persists across browser sessions
   - Target: 95%+ of users keep their key

2. **User Data Sync**
   - Watchlist items appear consistently
   - Continue watching updates in real-time
   - Target: <100ms latency for updates

3. **Error Rates**
   - Firebase errors < 0.1% of operations
   - Validation errors properly handled
   - Target: 99.9% success rate

4. **User Engagement** (if implemented)
   - Watchlist usage increases
   - Continue watching feature used by 20%+ of users
   - Cross-device sync enables 15%+ more sessions

---

## Support Contacts

When issues arise:

1. **Firebase Issues**: Check [Firebase Status](https://status.firebase.google.com)
2. **Code Issues**: Review CHANGES_REFERENCE.md and FIREBASE_INTEGRATION.md
3. **Service Issues**: Check browser console and Firestore error logs
4. **User Data**: Check Firestore Database in Firebase Console

---

## Related Documentation

- `FIREBASE_INTEGRATION.md` - Complete integration guide
- `CHANGES_REFERENCE.md` - Detailed change list
- Firebase Docs: https://firebase.google.com/docs
- Firestore Docs: https://firebase.google.com/docs/firestore

---

## Questions or Issues?

Refer to the troubleshooting section in this document or check the error messages in browser console and Firebase logs.

**Key Debugging Steps**:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Check Firebase Console → Logs for backend errors
5. Verify Firestore rules allow operation
