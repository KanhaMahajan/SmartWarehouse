import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  Firestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || "AIzaSyAHLa7YU6Xz2TfPWrGzsMvcnvpgC0UY1Qg",
  authDomain: firebaseConfigJson.authDomain || "smart-inventory-and-warehouse.firebaseapp.com",
  projectId: firebaseConfigJson.projectId || "smart-inventory-and-warehouse",
  storageBucket: firebaseConfigJson.storageBucket || "smart-inventory-and-warehouse.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || "694136337232",
  appId: firebaseConfigJson.appId || "1:694136337232:web:04af02a109d1555cdb3255",
  measurementId: firebaseConfigJson.measurementId || ""
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Suppress benign connection retry logs
try {
  setLogLevel('error');
} catch {
  // Ignore
}

// Target database ID
const targetDbId = (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)')
  ? firebaseConfigJson.firestoreDatabaseId
  : undefined;

// Initialize Firestore using long polling in browser to ensure robust connectivity through iframes & proxies
let dbInstance: Firestore;
try {
  if (typeof window !== 'undefined') {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, targetDbId);
  } else {
    dbInstance = targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
  }
} catch (e) {
  dbInstance = targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
}
export const db = dbInstance;

// Verification per Firebase skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'test', 'connection'));
    if (snap.exists()) {
      return true;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch {
    return false;
  }
}

// Ensure active Firebase Auth session (anonymous if not signed in)
export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn("Firebase Auth session note:", err);
    return null;
  }
}

// Non-blocking auto-run connection test
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirestoreConnection().catch(() => {});
    ensureFirebaseAuth().catch(() => {});
  }, 200);
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
};
export type { FirebaseUser };
