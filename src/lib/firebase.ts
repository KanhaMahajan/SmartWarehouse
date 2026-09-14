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
  getFirestore,
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

// Initialize Firestore with configured databaseId or fallback
let dbInstance: Firestore;
try {
  if (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)') {
    dbInstance = getFirestore(app, firebaseConfigJson.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
} catch (e) {
  console.warn("Falling back to default Firestore database:", e);
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

// Verification per Firebase skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified successfully.");
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('the client is offline')) {
      console.warn("Firestore connection check: offline or connecting to database...");
    } else {
      console.log("Firestore connection initialized:", msg);
    }
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

// Auto-run connection test
if (typeof window !== 'undefined') {
  testFirestoreConnection();
  ensureFirebaseAuth().catch(() => {});
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
