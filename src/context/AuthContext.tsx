import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  db,
  doc,
  getDocFromServer,
  FirebaseUser
} from '../lib/firebase';
import { saveUserToFirestore } from '../services/firestoreService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, phone: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile to Firestore using dedicated firestoreService
  const syncUserToFirestore = async (user: User) => {
    try {
      await saveUserToFirestore(user);
    } catch (e) {
      console.warn("Firestore user sync error handled:", e);
    }
  };

  // Reconcile and verify user role strictly against backend database
  const verifySessionWithBackend = async (localUser?: User | null) => {
    try {
      const res = await api.getMe();
      if (res && res.user) {
        // Enforce backend/database role, rejecting any tampered client role
        const verifiedUser: User = {
          ...res.user,
          role: res.user.role // Fixed role assigned by backend/database
        };
        setCurrentUser(verifiedUser);
        localStorage.setItem('si_auth_user', JSON.stringify(verifiedUser));
        return verifiedUser;
      }
    } catch {
      // Backend rejected or session invalid
      if (localUser) {
        console.warn("Backend session validation failed for local cache");
      }
    }
    return null;
  };

  useEffect(() => {
    // 1. Initial cached user load followed immediately by backend verification
    let initialUser: User | null = null;
    try {
      const stored = localStorage.getItem('si_auth_user');
      if (stored) {
        initialUser = JSON.parse(stored);
        setCurrentUser(initialUser);
      }
    } catch {
      localStorage.removeItem('si_auth_user');
    }

    if (initialUser) {
      verifySessionWithBackend(initialUser);
    }

    // 2. Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Attempt to load profile from Firestore
          let role: Role = 'User';
          let phone = firebaseUser.phoneNumber || '';
          let name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';

          // Assign Admin role ONLY for the verified project owner email
          if (firebaseUser.email?.toLowerCase() === 'nileshkgn1111@gmail.com') {
            role = 'Admin';
          }

          try {
            const userDoc = await getDocFromServer(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (firebaseUser.email?.toLowerCase() === 'nileshkgn1111@gmail.com') {
                role = 'Admin';
              } else {
                // Role is fixed and loaded from database: Non-admin can only be Warehouse Manager or User
                role = data.role === 'Warehouse Manager' ? 'Warehouse Manager' : 'User';
              }
              name = data.name || name;
              phone = data.phone || phone;
            }
          } catch {
            // Firestore rules or offline
          }

          const resolvedUser: User = {
            id: firebaseUser.uid,
            name,
            email: firebaseUser.email || '',
            phone,
            role,
            status: 'Active',
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
          };

          setCurrentUser(resolvedUser);
          localStorage.setItem('si_auth_user', JSON.stringify(resolvedUser));
          await syncUserToFirestore(resolvedUser);
          // Verify with backend as well
          await verifySessionWithBackend(resolvedUser);
        } catch (e) {
          console.error("Failed resolving Firebase user profile:", e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      let role: Role = 'User';
      if (fbUser.email?.toLowerCase() === 'nileshkgn1111@gmail.com') {
        role = 'Admin';
      }

      // Check if user already exists in Firestore to preserve database-assigned role
      try {
        const userDoc = await getDocFromServer(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (fbUser.email?.toLowerCase() === 'nileshkgn1111@gmail.com') {
            role = 'Admin';
          } else {
            role = data.role === 'Warehouse Manager' ? 'Warehouse Manager' : 'User';
          }
        }
      } catch {
        // use default role
      }

      const newUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email: fbUser.email || '',
        phone: fbUser.phoneNumber || '',
        role,
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      setCurrentUser(newUser);
      localStorage.setItem('si_auth_user', JSON.stringify(newUser));
      await syncUserToFirestore(newUser);

      // Also register / sync on backend
      try {
        await api.register({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: 'google_authenticated',
          role: newUser.role
        });
      } catch {
        // already exists or handled
      }

      await verifySessionWithBackend(newUser);
    } catch (err: any) {
      console.error("Google sign in error:", err);
      throw err;
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      // 1. Try Firebase Auth first
      let uid: string | undefined;
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, pass);
        uid = userCred.user.uid;
      } catch (fbErr) {
        console.log("Firebase direct password login fallback to backend API:", fbErr);
      }

      // 2. Call backend login API
      const res = await api.login({ email, password: pass });
      const activeUser = uid ? { ...res.user, id: uid } : res.user;

      setCurrentUser(activeUser);
      localStorage.setItem('si_auth_user', JSON.stringify(activeUser));
      await syncUserToFirestore(activeUser);
    } catch (err: any) {
      console.error("Login failed:", err);
      throw err;
    }
  };

  const register = async (name: string, email: string, phone: string, pass: string) => {
    try {
      let uid: string | undefined;
      // 1. Register with Firebase Auth
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        uid = userCred.user.uid;
      } catch (fbErr) {
        console.log("Firebase Auth creation fallback to API:", fbErr);
      }

      // 2. Call backend register API - public registrations are strictly User (or Admin for verified email)
      const res = await api.register({ name, email, phone, password: pass, role: 'User' });
      const activeUser = uid ? { ...res.user, id: uid } : res.user;

      setCurrentUser(activeUser);
      localStorage.setItem('si_auth_user', JSON.stringify(activeUser));
      await syncUserToFirestore(activeUser);
    } catch (err: any) {
      console.error("Register failed:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signout warning:", e);
    }
    setCurrentUser(null);
    localStorage.removeItem('si_auth_user');
  };

  // Fixed role policy: Users CANNOT change their role through profile/settings
  const updateCurrentUser = (user: User) => {
    if (!currentUser) return;
    const fixedRoleUser: User = {
      ...user,
      id: currentUser.id,
      role: currentUser.role // Role is strictly immutable by the user
    };
    setCurrentUser(fixedRoleUser);
    localStorage.setItem('si_auth_user', JSON.stringify(fixedRoleUser));
    syncUserToFirestore(fixedRoleUser);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
