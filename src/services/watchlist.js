import {
  db,
  storeSecret,
} from "../../utils/firebase";
import { auth } from "../../utils/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";

/**
 * Add movie/show to watchlist
 */
export async function addToWatchlist(item) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "watchlist", "items");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Update existing watchlist
      await updateDoc(docRef, {
        items: arrayUnion({
          ...item,
          addedAt: new Date(),
        }),
      });
    } else {
      // Create new watchlist
      await setDoc(docRef, {
        items: [
          {
            ...item,
            addedAt: new Date(),
          },
        ],
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove movie/show from watchlist
 */
export async function removeFromWatchlist(itemId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "watchlist", "items");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const items = docSnap.data().items || [];
      const updatedItems = items.filter((item) => item.id !== itemId);
      
      await setDoc(docRef, { items: updatedItems });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all watchlist items for current user
 */
export async function getWatchlist() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "watchlist", "items");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().items || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting watchlist:", error);
    return [];
  }
}

/**
 * Check if item is in watchlist
 */
export async function isInWatchlist(itemId) {
  try {
    const watchlist = await getWatchlist();
    return watchlist.some((item) => item.id === itemId);
  } catch {
    return false;
  }
}

/**
 * Listen to watchlist changes in real-time
 * Returns unsubscribe function
 */
export function onWatchlistChanged(callback) {
  const user = auth.currentUser;
  if (!user) {
    console.warn("User not authenticated");
    return () => {};
  }

  const docRef = doc(db, "users", user.uid, "watchlist", "items");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().items || []);
    } else {
      callback([]);
    }
  });
}

/**
 * Sync local watchlist with Firestore
 * Merges local items with Firestore items
 */
export async function syncWatchlist(localItems) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "watchlist", "items");
    const docSnap = await getDoc(docRef);

    const firestoreItems = docSnap.exists() ? docSnap.data().items || [] : [];
    
    // Merge: keep items from both sources, prefer Firestore items by ID
    const itemMap = new Map();
    
    // Add Firestore items first (higher priority)
    firestoreItems.forEach((item) => {
      itemMap.set(item.id, item);
    });
    
    // Add local items if not already present
    localItems.forEach((item) => {
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, item);
      }
    });

    const mergedItems = Array.from(itemMap.values());
    await setDoc(docRef, { items: mergedItems });

    return { success: true, items: mergedItems };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
