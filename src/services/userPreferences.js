import { db } from "../../utils/firebase";
import { auth } from "../../utils/firebase";
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES = {
  theme: "dark",
  accentColor: "red",
  fontSize: "normal",
  compactMode: false,
  reduceAnimations: false,
  subtitleLang: null,
  preferredGenres: [],
  language: "en-US",
  autoplayNext: true,
  notifyNewEpisodes: true,
};

/**
 * Save user preferences to Firestore
 */
export async function saveUserPreferences(preferences) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "settings", "preferences");
    await setDoc(
      docRef,
      {
        ...preferences,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user preferences from Firestore
 */
export async function getUserPreferences() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "settings", "preferences");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { ...DEFAULT_PREFERENCES, ...docSnap.data() };
    }

    // Create with defaults if doesn't exist
    await setDoc(docRef, DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update a single preference
 */
export async function updatePreference(key, value) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "settings", "preferences");
    await updateDoc(docRef, {
      [key]: value,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Listen to preferences changes in real-time
 * Returns unsubscribe function
 */
export function onPreferencesChanged(callback) {
  const user = auth.currentUser;
  if (!user) {
    console.warn("User not authenticated");
    return () => {};
  }

  const docRef = doc(db, "users", user.uid, "settings", "preferences");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ ...DEFAULT_PREFERENCES, ...docSnap.data() });
    } else {
      callback(DEFAULT_PREFERENCES);
    }
  });
}

/**
 * Sync local preferences with Firestore
 */
export async function syncPreferences(localPreferences) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "settings", "preferences");
    const docSnap = await getDoc(docRef);

    let remotePrefs = DEFAULT_PREFERENCES;
    if (docSnap.exists()) {
      remotePrefs = { ...DEFAULT_PREFERENCES, ...docSnap.data() };
    }

    // Merge preferences: remote takes precedence, but local is used if remote is default
    const merged = {};
    for (const [key, value] of Object.entries(DEFAULT_PREFERENCES)) {
      if (localPreferences[key] !== undefined && 
          remotePrefs[key] === DEFAULT_PREFERENCES[key]) {
        // Remote has default, use local
        merged[key] = localPreferences[key];
      } else if (remotePrefs[key] !== undefined) {
        // Remote has custom value, use remote
        merged[key] = remotePrefs[key];
      } else {
        // Use local
        merged[key] = localPreferences[key] ?? DEFAULT_PREFERENCES[key];
      }
    }

    // Save merged to Firestore
    await setDoc(docRef, merged, { merge: true });
    return merged;
  } catch (error) {
    console.error("Error syncing preferences:", error);
    return localPreferences;
  }
}

/**
 * Load user profile (basic info)
 */
export async function loadUserProfile() {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }

    // Create basic profile if doesn't exist
    const profile = {
      uid: user.uid,
      email: user.email,
      createdAt: new Date(),
    };
    await setDoc(docRef, profile);
    return profile;
  } catch (error) {
    console.error("Error loading user profile:", error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
