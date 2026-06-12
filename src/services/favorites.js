import { db } from "../../utils/firebase";
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
 * Add item to favorites
 */
export async function addToFavorites(item) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "favorites", "items");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        items: arrayUnion({
          ...item,
          favoritedAt: new Date(),
        }),
      });
    } else {
      await setDoc(docRef, {
        items: [
          {
            ...item,
            favoritedAt: new Date(),
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
 * Remove item from favorites
 */
export async function removeFromFavorites(itemId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "favorites", "items");
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
 * Get all favorites for current user
 */
export async function getFavorites() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const docRef = doc(db, "users", user.uid, "favorites", "items");
    const docSnap = await getDoc(docRef);

    return docSnap.exists() ? docSnap.data().items || [] : [];
  } catch (error) {
    console.error("Error getting favorites:", error);
    return [];
  }
}

/**
 * Check if item is in favorites
 */
export async function isFavorited(itemId) {
  try {
    const favorites = await getFavorites();
    return favorites.some((item) => item.id === itemId);
  } catch {
    return false;
  }
}

/**
 * Listen to favorites changes in real-time
 * Returns unsubscribe function
 */
export function onFavoritesChanged(callback) {
  const user = auth.currentUser;
  if (!user) {
    console.warn("User not authenticated");
    return () => {};
  }

  const docRef = doc(db, "users", user.uid, "favorites", "items");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().items || []);
    } else {
      callback([]);
    }
  });
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(item) {
  const isFav = await isFavorited(item.id);
  if (isFav) {
    return removeFromFavorites(item.id);
  } else {
    return addToFavorites(item);
  }
}
