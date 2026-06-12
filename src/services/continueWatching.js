import { db } from "../../utils/firebase";
import { auth } from "../../utils/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";

/**
 * Save playback progress for a movie/show
 * Stores: id, timestamp, poster, title, media_type, season, episode, lastWatched
 */
export async function saveContinueWatching(mediaItem, progressData) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const progressId = `${mediaItem.id}_${mediaItem.media_type}`;
    const docRef = doc(
      db,
      "users",
      user.uid,
      "continueWatching",
      progressId
    );

    const data = {
      id: mediaItem.id,
      media_type: mediaItem.media_type || "movie",
      title: mediaItem.title || mediaItem.name,
      poster_path: mediaItem.poster_path,
      timestamp: progressData.timestamp || 0, // seconds into video
      duration: progressData.duration || 0,
      season: progressData.season,
      episode: progressData.episode,
      lastWatched: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(docRef, data, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all continue watching entries, sorted by most recent
 */
export async function getContinueWatching() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const collectionRef = collection(db, "users", user.uid, "continueWatching");
    const q = query(collectionRef, orderBy("lastWatched", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting continue watching:", error);
    return [];
  }
}

/**
 * Get progress for a specific media item
 */
export async function getProgress(mediaId, mediaType) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const progressId = `${mediaId}_${mediaType}`;
    const docRef = doc(db, "users", user.uid, "continueWatching", progressId);
    const docSnap = await getDoc(docRef);

    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error getting progress:", error);
    return null;
  }
}

/**
 * Remove a continue watching entry
 */
export async function removeFromContinueWatching(mediaId, mediaType) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const progressId = `${mediaId}_${mediaType}`;
    const docRef = doc(db, "users", user.uid, "continueWatching", progressId);
    await setDoc(docRef, { deletedAt: new Date() }, { merge: true });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Listen to continue watching changes in real-time
 * Returns unsubscribe function
 */
export function onContinueWatchingChanged(callback) {
  const user = auth.currentUser;
  if (!user) {
    console.warn("User not authenticated");
    return () => {};
  }

  const collectionRef = collection(db, "users", user.uid, "continueWatching");
  const q = query(collectionRef, orderBy("lastWatched", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(items);
  });
}

/**
 * Sync local playback progress with Firestore
 */
export async function syncContinueWatching(localProgress) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Iterate through local progress and save each to Firestore
    for (const [progressId, progressData] of Object.entries(localProgress)) {
      const docRef = doc(
        db,
        "users",
        user.uid,
        "continueWatching",
        progressId
      );
      
      // Check if exists in Firestore
      const existing = await getDoc(docRef);
      
      // Only sync if local is newer or Firestore doesn't have it
      if (!existing.exists() || 
          new Date(progressData.updatedAt) > new Date(existing.data().updatedAt)) {
        await setDoc(docRef, {
          ...progressData,
          lastWatched: new Date(progressData.lastWatched),
          updatedAt: new Date(progressData.updatedAt),
        });
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
