import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  id: string;
  employeeId?: string;
  phoneNumber?: string;
  role: string;
  name: string;
  createdAt: Date;
  lastActive: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Use a non-async handler to avoid unhandled promise rejections
      (async () => {
        try {
          setLoading(true);
          if (user) {
            setUser(user);
            await loadUserProfile(user.uid);
          } else {
            setUser(null);
            setUserProfile(null);
            await AsyncStorage.removeItem('userProfile');
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err);
        } finally {
          setLoading(false);
        }
      })();
    });

    return unsubscribe;
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      // Try to load from local storage first (offline support)
      const cachedProfile = await AsyncStorage.getItem('userProfile');
      if (cachedProfile) {
        try {
          setUserProfile(JSON.parse(cachedProfile));
        } catch (err) {
          console.warn('Failed to parse cached userProfile, ignoring cache:', err);
        }
      }

      // Then load from Firestore
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const raw = docSnap.data();
        // Normalize Firestore Timestamp objects to plain Date strings for storage
        const normalize = (val: any) => {
          if (val && typeof val.toDate === 'function') {
            try {
              return val.toDate().toISOString();
            } catch (e) {
              return String(val);
            }
          }
          return val;
        };

        const profile: any = { id: userId };
        Object.keys(raw).forEach((k) => {
          profile[k] = normalize((raw as any)[k]);
        });

        // If createdAt/lastActive present as ISO strings, convert back to Date for in-memory profile
        const inMemoryProfile: UserProfile = {
          id: profile.id,
          name: profile.name || '',
          role: profile.role || '',
          employeeId: profile.employeeId,
          phoneNumber: profile.phoneNumber,
          createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
          lastActive: profile.lastActive ? new Date(profile.lastActive) : new Date(),
          ...profile,
        } as UserProfile;

        setUserProfile(inMemoryProfile);
        try {
          await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
        } catch (err) {
          console.warn('Failed to cache userProfile to AsyncStorage:', err);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Sign in with Firebase Auth first
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Ensure a corresponding Firestore users document exists for this uid
      const userId = userCredential.user.uid;
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // If no users doc exists, immediately sign out and surface an error
        await signOut(auth);
        throw new Error('Account not allowed to sign in. Please sign up first or contact administrator.');
      }

      // Make sure local state is updated synchronously so callers don't operate on null user
      setUser(userCredential.user);
      await loadUserProfile(userId);
    } catch (err: any) {
      console.error('Login error:', err);
      // Re-throw so callers can show an alert, but ensure it's an Error instance
      throw err instanceof Error ? err : new Error(String(err));
    }
  };

  // Register creates an Auth account then creates a users document in Firestore
  // The users document will contain fields in this order: name, role, email, password, createdAt, isActive
  const register = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Build profile object with requested order of fields.
      // Note: Storing plaintext passwords is insecure; we store here because the product requirement asked for a Password field.
      // In a production app prefer storing no password or a securely hashed value on a trusted server.
      const newProfile = {
        name,
        role: '',
        email,
        password, // stored here per requirement; consider removing in future
        createdAt: serverTimestamp(),
        isActive: true,
      } as any;

      await setDoc(doc(db, 'users', uid), newProfile);
      // Keep local profile in memory (createdAt will be a Timestamp when read back)
      const localProfile = { id: uid, name, role: '', email, createdAt: new Date(), lastActive: new Date() } as UserProfile;
      setUserProfile(localProfile);
      setUser(userCredential.user);
    } catch (err: any) {
      console.error('Register error:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  };

  const logout = async () => {
    await signOut(auth);
    await AsyncStorage.removeItem('userProfile');
  };

  const deleteAccount = async (password: string) => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user found.');
    }

    try {
      const currentUser = auth.currentUser;
      const email = currentUser.email;
      if (!email) throw new Error('Current user has no email associated');

      const credential = EmailAuthProvider.credential(email, password);
      // Reauthenticate the user with the provided password
      await reauthenticateWithCredential(currentUser, credential);

      // Delete Firestore user document if present
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid));
      } catch (err) {
        // Non-fatal - log and continue with auth deletion
        console.warn('Failed to delete user profile document:', err);
      }

      // Delete auth user
      await deleteUser(currentUser);

      // Clear local state and cache
      setUser(null);
      setUserProfile(null);
      await AsyncStorage.removeItem('userProfile');
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('No authenticated user found. Please sign in again.');
    }

    const userDocRef = doc(db, 'users', user.uid);

    let currentProfile = userProfile;

    if (!currentProfile) {
      // Attempt to load the latest profile from Firestore when it's not yet cached locally
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        currentProfile = {
          id: user.uid,
          name: (data.name as string) || '',
          role: (data.role as string) || '',
          employeeId: data.employeeId as string | undefined,
          phoneNumber: data.phoneNumber as string | undefined,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : new Date(),
          ...data,
        } as UserProfile;
      } else {
        currentProfile = {
          id: user.uid,
          name: '',
          role: '',
          createdAt: new Date(),
          lastActive: new Date(),
        };
      }
    }

    const mergedProfile: UserProfile = {
      ...currentProfile,
      ...updates,
      lastActive: updates.lastActive ?? new Date(),
    };

    const { id, ...persistableProfile } = mergedProfile as UserProfile & { id: string };

    await setDoc(
      userDocRef,
      {
        ...persistableProfile,
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );

    setUserProfile(mergedProfile);
    await AsyncStorage.setItem('userProfile', JSON.stringify(mergedProfile));
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    deleteAccount,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};