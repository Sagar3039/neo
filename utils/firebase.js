// Firebase initialization and helpers
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut, GoogleAuthProvider, signInWithRedirect, getRedirectResult, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Firebase config (provided)
const firebaseConfig = {
  apiKey: "AIzaSyBnae3qeY8Z2ruLZVQWm7BQgKJ2vnVa_rc",
  authDomain: "neeo-8be19.firebaseapp.com",
  projectId: "neeo-8be19",
  storageBucket: "neeo-8be19.firebasestorage.app",
  messagingSenderId: "531232912562",
  appId: "1:531232912562:web:b6118fe3122e21245b45ab",
  measurementId: "G-N4DNVB6N5B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Auth helpers
async function signIn(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

function signOut() {
  return firebaseSignOut(auth);
}

// Google Sign-In with proper Electron browser redirect
async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  
  try {
    // Set persistence to handle redirect flow properly
    await setPersistence(auth, browserSessionPersistence);
    
    // Use redirect flow - Firebase handles the OAuth URL correctly
    await signInWithRedirect(auth, provider);
    
    // Return success - browser redirect initiated
    return { success: true, redirected: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Handle redirect result (called after browser redirects back to app)
async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return { success: true, user: result.user };
    }
    return { success: false, user: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Store a key/value pair for the current user in Firestore under collection `secrets`.
// Note: Ensure your Firestore security rules restrict access appropriately.
async function storeSecret(key, value) {
  const user = auth.currentUser;
  const uid = user ? user.uid : 'public';
  const docRef = doc(db, 'secrets', uid);
  const prev = await getDoc(docRef);
  const data = prev.exists() ? prev.data() : {};
  data[key] = value;
  await setDoc(docRef, data, { merge: true });
}

// Upload a file/blob to Firebase Storage and return download URL
async function uploadFile(path, fileBlob) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, fileBlob);
  return getDownloadURL(storageRef);
}

export {
  app,
  auth,
  db,
  storage,
  firebaseConfig,
  signIn,
  signOut,
  signInWithGoogle,
  handleRedirectResult,
  storeSecret,
  uploadFile
};
