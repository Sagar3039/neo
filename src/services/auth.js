import {
  auth,
  signIn as firebaseSignIn,
  signOut as firebaseSignOut,
  signInWithGoogle as firebaseSignInWithGoogle,
  handleRedirectResult,
} from "../../utils/firebase";
import { createUserWithEmailAndPassword, onAuthStateChanged as firebaseOnAuthStateChanged } from "firebase/auth";

/**
 * Sign up user with email and password
 */
export async function signUp(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let message = error.message;
    if (error.code === "auth/email-already-in-use") {
      message = "Email already in use";
    } else if (error.code === "auth/weak-password") {
      message = "Password is too weak";
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address";
    }
    return { success: false, error: message };
  }
}

/**
 * Sign in user with email and password
 */
export async function signIn(email, password) {
  try {
    const user = await firebaseSignIn(email, password);
    return { success: true, user };
  } catch (error) {
    let message = error.message;
    if (error.code === "auth/user-not-found") {
      message = "Email not found";
    } else if (error.code === "auth/wrong-password") {
      message = "Wrong password";
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address";
    }
    return { success: false, error: message };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    await firebaseSignOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Listen for auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChanged(callback) {
  if (!auth) {
    console.warn("Firebase auth not initialized");
    return () => {};
  }

  return auth.onAuthStateChanged((user) => {
    callback(user);
  });
}

/**
 * Sign in with Google - Opens browser redirect
 */
export async function signInWithGoogle() {
  try {
    // Start Firebase redirect flow (handles OAuth properly)
    await firebaseSignInWithGoogle();
    
    // Return success - user will be redirected to browser
    return { success: true, redirected: true };
  } catch (error) {
    let message = error.message;
    if (error.code === "auth/popup-closed-by-user") {
      message = "Sign-in cancelled";
    } else if (error.code === "auth/popup-blocked") {
      message = "Sign-in popup was blocked";
    } else if (error.code === "auth/unauthorized-domain") {
      message = "Your domain is not authorized. Please add it in Firebase Console.";
    }
    return { success: false, error: message };
  }
}

/**
 * Handle OAuth redirect result (called on app startup for Electron)
 */
export async function handleOAuthRedirect() {
  try {
    const result = await handleRedirectResult();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}
