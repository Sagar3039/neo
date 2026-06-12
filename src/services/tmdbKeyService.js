import { db, storage } from "../../utils/firebase";
import { auth } from "../../utils/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const TMDB_BASE = "https://api.themoviedb.org/3";
const STORAGE_KEY = "tmdb_api_key"; // localStorage key for fallback

/**
 * Validate TMDB API key by testing with real API calls
 */
export async function validateTmdbKey(token) {
  try {
    const pingRes = await fetch(`${TMDB_BASE}/configuration`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(7000),
    });

    if (pingRes.status === 401) {
      return { ok: false, reason: "invalid_token" };
    }
    if (pingRes.status === 403) {
      return { ok: false, reason: "forbidden" };
    }
    if (!pingRes.ok) {
      return { ok: false, reason: "tmdb_error", status: pingRes.status };
    }

    // Run a real content request to confirm full API access
    const testRes = await fetch(`${TMDB_BASE}/trending/movie/week`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(7000),
    });
    if (!testRes.ok) {
      return { ok: false, reason: "api_error", status: testRes.status };
    }

    return { ok: true };
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "unreachable" };
  }
}

/**
 * Save TMDB API key to Firestore under user profile
 * Fallback: save to localStorage if not authenticated
 */
export async function saveTmdbKey(key) {
  try {
    const user = auth.currentUser;
    if (user) {
      // Save to Firestore under users/{uid}/settings
      const docRef = doc(db, "users", user.uid, "settings", "apiKeys");
      await setDoc(docRef, { tmdbApiKey: key, savedAt: new Date() }, { merge: true });
    }
    // Always save to localStorage as fallback
    localStorage.setItem(STORAGE_KEY, key);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get TMDB API key from Firestore or localStorage
 */
export async function getTmdbKey() {
  try {
    const user = auth.currentUser;
    if (user) {
      // Try Firestore first
      const docRef = doc(db, "users", user.uid, "settings", "apiKeys");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().tmdbApiKey) {
        return docSnap.data().tmdbApiKey;
      }
    }
    // Fallback to localStorage
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch (error) {
    console.error("Error getting TMDB key:", error);
    // Fallback to localStorage if Firestore fails
    return localStorage.getItem(STORAGE_KEY) || null;
  }
}

/**
 * Delete TMDB API key from both Firestore and localStorage
 */
export async function deleteTmdbKey() {
  try {
    const user = auth.currentUser;
    if (user) {
      // Save empty value to Firestore
      const docRef = doc(db, "users", user.uid, "settings", "apiKeys");
      await setDoc(docRef, { tmdbApiKey: "", deletedAt: new Date() }, { merge: true });
    }
    // Remove from localStorage
    localStorage.removeItem(STORAGE_KEY);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if API key exists in Firestore or localStorage
 */
export async function hasTmdbKey() {
  const key = await getTmdbKey();
  return !!key;
}

/**
 * Migrate API key from localStorage to Firestore after login
 */
export async function migrateTmdbKeyToFirestore() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const localKey = localStorage.getItem(STORAGE_KEY);
    if (localKey) {
      // Save to Firestore
      const docRef = doc(db, "users", user.uid, "settings", "apiKeys");
      await setDoc(
        docRef,
        { tmdbApiKey: localKey, migratedAt: new Date() },
        { merge: true }
      );
      // Optionally clear from localStorage after migration
      // localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error migrating TMDB key to Firestore:", error);
  }
}

/**
 * Get error message for validation failure
 */
export function getValidationErrorMessage(reason, status) {
  switch (reason) {
    case "invalid_token":
      return {
        title: "Invalid token",
        body: "TMDB rejected the token (401 Unauthorized). Make sure you copied the long JWT Read Access Token, not the shorter API Key.",
      };
    case "forbidden":
      return {
        title: "Access denied",
        body: "TMDB returned 403 Forbidden. Your account may be suspended or the token may have been revoked.",
      };
    case "timeout":
      return {
        title: "Request timed out",
        body: "TMDB took too long to respond. Check your internet connection and try again.",
      };
    case "unreachable":
      return {
        title: "Cannot reach TMDB",
        body: "No connection to api.themoviedb.org. Check your internet connection.",
      };
    default:
      return {
        title: "Something went wrong",
        body: `TMDB returned an unexpected error${status ? ` (HTTP ${status})` : ""}. Try again in a moment.`,
      };
  }
}
