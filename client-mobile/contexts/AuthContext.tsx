import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { User, UserCredential } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc, collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { FirestoreService } from '../services/firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineSyncService } from '../services/storage/offlineSync';
import { StorageService } from '../services/storage/asyncStorage';

interface UserProfile {
  id: string;
  employeeId?: string;
  phoneNumber?: string;
  email?: string;
  role: string;
  name: string;
  createdAt: Date;
  lastActive: Date;
  stateId?: string;
  stateName?: string;
  coalfieldId?: string;
  coalfieldName?: string;
  mineId?: string;
  mineName?: string;
  safetyScore?: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileLoaded: boolean;
  sosPulse: boolean;
  // control functions for SOS UX
  flashSosPulse: () => void;
  startSosBeep: () => Promise<void>;
  stopSosBeep: () => Promise<void>;
  isSosBeepPlaying: boolean;
  login: (email: string, password: string, location?: { stateId?: string; coalfieldId?: string; mineId?: string }) => Promise<{ isSupervisor: boolean }>;
  register: (name: string, email: string, password: string, location?: { stateId: string; stateName: string; coalfieldId: string; coalfieldName: string; mineId: string; mineName: string }) => Promise<{ isSupervisor: boolean }>;
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
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [sosPulse, setSosPulse] = useState(false);
  const [isSosBeepPlaying, setIsSosBeepPlaying] = useState(false);
  const lastSosId = useRef<string | null>(null);
  const sosUnsubRef = useRef<(() => void) | null>(null);
  // audio player for global SOS beep
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // Looping logic for the global beep player
  useEffect(() => {
    if (status?.didJustFinish && isSosBeepPlaying) {
      try {
        player.seekTo?.(0);
        player.play?.();
      } catch (e) {
        // ignore
      }
    }
  }, [status?.didJustFinish, isSosBeepPlaying]);

  const flashSosPulse = () => {
    setSosPulse(true);
    setTimeout(() => setSosPulse(false), 3200);
  };

  const startSosBeep = async () => {
    try {
      if (isSosBeepPlaying) return;
      // require asset relative to project root
      await player.replace?.(require('../assets/audios/beep.mp3') as any);
      await player.play?.();
      setIsSosBeepPlaying(true);
    } catch (err) {
      console.warn('startSosBeep failed', err);
    }
  };

  const stopSosBeep = async () => {
    try {
      await player.pause?.();
      await player.replace?.(null);
    } catch (e) {}
    setIsSosBeepPlaying(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Use a non-async handler to avoid unhandled promise rejections
      (async () => {
        try {
          setLoading(true);
          setProfileLoaded(false);
          if (user) {
            setUser(user);
            await loadUserProfile(user.uid);
            // mark that profile load attempt completed (including supervisor fallback)
            setProfileLoaded(true);
            // attach listener for emergency alert acknowledgements/resolutions for this user
            try {
              // cleanup previous listener
              if (sosUnsubRef.current) {
                sosUnsubRef.current();
                sosUnsubRef.current = null;
              }
              // Query only by userId and createdAt, then filter status on the client to avoid needing
              // a composite Firestore index (which causes runtime errors if missing).
              // Avoid using orderBy here to keep the query index-free; we will sort client-side.
              const alertsQuery = query(
                collection(db, 'emergency_alerts'),
                where('userId', '==', user.uid),
                limit(10)
              );
              const unsub = onSnapshot(
                alertsQuery,
                (snap) => {
                  if (!snap.empty) {
                    // Sort docs by createdAt (desc) client-side to avoid Firestore index requirements.
                    const docsWithTimestamps = snap.docs
                      .map((d) => ({ doc: d, ts: (d.data() as any).createdAt }))
                      .filter((x) => x.ts)
                      .sort((a, b) => {
                        const ta = a.ts && typeof a.ts.toDate === 'function' ? a.ts.toDate().getTime() : 0;
                        const tb = b.ts && typeof b.ts.toDate === 'function' ? b.ts.toDate().getTime() : 0;
                        return tb - ta;
                      });

                    const docWithStatus = docsWithTimestamps.find(({ doc: d }) => {
                      const s = (d.data() as any).status;
                      return s === 'acknowledged' || s === 'resolved';
                    })?.doc;

                    if (docWithStatus) {
                      const id = docWithStatus.id;
                      if (lastSosId.current !== id) {
                        lastSosId.current = id;
                        // trigger transient pulse visible across the app
                        setSosPulse(true);
                        setTimeout(() => setSosPulse(false), 3200);
                      }
                    }
                  }
                },
                (err) => {
                  console.warn('Emergency alerts listener error:', err);
                }
              );
              sosUnsubRef.current = unsub;
            } catch (e) {
              console.warn('Failed to attach sos listener:', e);
            }
          } else {
            setUser(null);
            setUserProfile(null);
            await AsyncStorage.removeItem('userProfile');
            // cleanup listener
            if (sosUnsubRef.current) {
              sosUnsubRef.current();
              sosUnsubRef.current = null;
            }
            // Mark that we've finished attempting to load profile (there wasn't one)
            setProfileLoaded(true);
          }
        } catch (err) {
          // Log as warning - auth state handler can encounter transient errors (network/permission)
          try {
            console.warn('Auth state handler warning:', (err as any)?.message || String(err));
          } catch (logErr) {
            console.warn('Auth state handler warning');
          }
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
      } else {
        // Fallback: maybe a supervisor account without users doc. Look up by email so we
        // correctly detect supervisors that were linked during registration (supervisor doc id
        // is typically not equal to the auth UID).
        try {
          const currentUser = auth.currentUser;
          const email = currentUser?.email || '';
          if (email) {
            const supLookup = await FirestoreService.getSupervisorDocByEmail(email);
            if (supLookup) {
              const raw = supLookup.data;
              const now = new Date();
              const supProfile: UserProfile = {
                id: userId,
                name: raw.name || raw.Name || 'Supervisor',
                email: email,
                role: 'supervisor',
                employeeId: raw.employeeId,
                phoneNumber: raw.phoneNumber,
                createdAt: now,
                lastActive: now,
                stateId: raw.stateId,
                stateName: raw.stateName,
                coalfieldId: raw.coalfieldId,
                coalfieldName: raw.coalfieldName,
                mineId: raw.mineId,
                mineName: raw.mineName,
              };
              setUserProfile(supProfile);
              try {
                await AsyncStorage.setItem('userProfile', JSON.stringify({ ...supProfile, createdAt: now.toISOString(), lastActive: now.toISOString() }));
              } catch (cacheErr) {
                console.warn('Failed to cache supervisor profile:', cacheErr);
              }
            }
          }
        } catch (supErr) {
          console.warn('Supervisor fallback load failed:', supErr);
        }
      }
    } catch (error) {
      // Loading profile may fail due to network or missing doc; warn concisely and continue
      try {
        console.warn('Load user profile warning:', (error as any)?.message || String(error));
      } catch (logErr) {
        console.warn('Load user profile warning');
      }
    }
  };

  const login = async (email: string, password: string, location?: { stateId?: string; coalfieldId?: string; mineId?: string }): Promise<{ isSupervisor: boolean }> => {
    try {
      const normalized = email.trim().toLowerCase();
      // Attempt auth
      const userCredential = await signInWithEmailAndPassword(auth, normalized, password);
      const userId = userCredential.user.uid;
      setUser(userCredential.user);

      // First attempt to load users doc
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        await loadUserProfile(userId);
        // If caller supplied a location, ensure it matches the stored profile triple
        if (location) {
          const profile = await FirestoreService.getUserProfile(userId);
          if (profile && (profile.stateId || profile.coalfieldId || profile.mineId)) {
            const mismatch = profile.stateId !== location.stateId || profile.coalfieldId !== location.coalfieldId || profile.mineId !== location.mineId;
            if (mismatch) {
              // log out and signal to caller
              await signOut(auth);
              throw new Error('Selected location does not match account.');
            }
          }
        }
        try { await FirestoreService.updateUserProfile(userId, {}); } catch (e) { console.warn('lastActive update failed:', e); }
        const isSupervisor = (userProfile && userProfile.role === 'supervisor') || false;
        return { isSupervisor };
      }

      // Fallback: check supervisors collection by email
      const supLookup = await FirestoreService.getSupervisorDocByEmail(normalized);
      if (supLookup) {
        // If caller provided location, ensure supervisor doc has matching triple
        const supData = supLookup.data || {};
        if (location && (supData.stateId || supData.coalfieldId || supData.mineId)) {
          const mismatch = supData.stateId !== location.stateId || supData.coalfieldId !== location.coalfieldId || supData.mineId !== location.mineId;
          if (mismatch) {
            await signOut(auth);
            throw new Error('Selected location does not match supervisor account.');
          }
        }
        await loadUserProfile(userId); // will trigger supervisor fallback
        return { isSupervisor: true };
      }

      // If neither exists, disallow
      await signOut(auth);
      throw new Error('Account not registered. Please sign up first.');
    } catch (err: any) {
      // For known/expected auth errors, log a concise warning instead of full error stack
      try {
        const code = err?.code || (err?.message && err.message.indexOf('auth/') !== -1 ? 'auth/error' : undefined);
        const msg = err?.message || String(err);
        console.warn('Login failed:', code ? `${code} — ${msg}` : msg);
      } catch (logErr) {
        // fallback to a simple warn
        console.warn('Login failed:', String(err));
      }
      // Re-throw so callers can show an alert, but ensure it's an Error instance
      throw err instanceof Error ? err : new Error(String(err));
    }
  };

  // Register creates or rehydrates an Auth account then creates a users document in Firestore
  // The users document will contain fields in this order: name, role, email, password, createdAt, isActive
  const register = async (name: string, email: string, password: string, location?: { stateId: string; stateName: string; coalfieldId: string; coalfieldName: string; mineId: string; mineName: string }): Promise<{ isSupervisor: boolean }> => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const [existingUserDoc, supervisorDoc] = await Promise.all([
        FirestoreService.findUserDocByEmail(normalizedEmail),
        FirestoreService.getSupervisorDocByEmail(normalizedEmail),
      ]);

      // Debugging output to help triage signup issues in dev builds
      try {
        // eslint-disable-next-line no-console
        console.debug('[register] normalizedEmail=', normalizedEmail);
        // eslint-disable-next-line no-console
        console.debug('[register] existingUserDoc=', !!existingUserDoc);
        // eslint-disable-next-line no-console
        console.debug('[register] supervisorDoc=', !!supervisorDoc);
      } catch (dbgErr) {
        /* ignore debug errors */
      }

      if (existingUserDoc) {
        throw new Error('An account with this email already exists. Please log in.');
      }

      let supervisorLinkOccupied = false;
      const supervisorLinkedUserId = supervisorDoc?.data?.userId;
      if (supervisorLinkedUserId) {
        try {
          const linkedDoc = await getDoc(doc(db, 'users', supervisorLinkedUserId));
          supervisorLinkOccupied = linkedDoc.exists();
        } catch (linkErr) {
          console.warn('Failed to verify supervisor link:', linkErr);
        }
      }

      if (supervisorDoc && supervisorLinkedUserId && supervisorLinkOccupied) {
        throw new Error('This supervisor account has already been registered. Please log in.');
      }

      let hasAuthAccount = false;
      try {
        const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
        hasAuthAccount = Array.isArray(methods) && methods.length > 0;
        // eslint-disable-next-line no-console
        console.debug('[register] fetchSignInMethodsForEmail =>', methods);
      } catch (methodErr) {
        console.warn('Unable to verify existing auth account:', methodErr);
      }

  let userCredential: UserCredential;
      if (hasAuthAccount) {
        try {
          userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (signInError) {
          throw new Error('An account with this email already exists. Please log in with your existing password or reset it before signing up again.');
        }
      } else {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (createErr: any) {
          // Debug create user failure
          // eslint-disable-next-line no-console
          console.debug('[register] createUser error code:', createErr?.code, createErr?.message);
          // In case fetchSignInMethodsForEmail was unreliable and Firebase reports the email already exists,
          // attempt to sign-in with the provided password to allow rehydration of orphaned auth accounts.
          if (createErr?.code === 'auth/email-already-in-use') {
            try {
              userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            } catch (signinErr: any) {
              // eslint-disable-next-line no-console
              console.debug('[register] signIn after createUser failed:', signinErr?.code || signinErr?.message || signinErr);
              // If sign-in also fails, surface a simple message asking the user to sign in.
              throw new Error('An account with this email already exists. Please sign in.');
            }
          } else {
            throw createErr;
          }
        }
      }

      const uid = userCredential.user.uid;
      const now = new Date();
      const isSupervisor = !!supervisorDoc;

      if (isSupervisor) {
        // Only link supervisor record; DO NOT create users doc
        try {
          await FirestoreService.registerSupervisor(supervisorDoc!.id, uid, name, password, location);
        } catch (linkErr) {
          console.warn('Failed to update supervisor record:', linkErr);
        }
        const supProfile: UserProfile = {
          id: uid,
            name,
          role: 'supervisor',
          createdAt: now,
          lastActive: now,
        } as any;
        setUserProfile(supProfile);
        setUser(userCredential.user);
        try {
          await AsyncStorage.setItem('userProfile', JSON.stringify({ ...supProfile, createdAt: now.toISOString(), lastActive: now.toISOString() }));
        } catch (cacheErr) {
          console.warn('Failed to cache supervisor profile after registration:', cacheErr);
        }
        return { isSupervisor: true };
      }

      // Regular user flow: create users doc
      const newProfile: any = {
        name,
        role: '',
        email: normalizedEmail,
        password,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        isActive: true,
      };
      // If location provided at registration, persist it atomically
      if (location && location.stateId && location.coalfieldId && location.mineId) {
        newProfile.stateId = location.stateId;
        newProfile.stateName = location.stateName;
        newProfile.coalfieldId = location.coalfieldId;
        newProfile.coalfieldName = location.coalfieldName;
        newProfile.mineId = location.mineId;
        newProfile.mineName = location.mineName;
      }
      await setDoc(doc(db, 'users', uid), newProfile);
      const userLocal: UserProfile = { id: uid, name, role: '', createdAt: now, lastActive: now, ...(location || {}) } as any;
      setUserProfile(userLocal);
      setUser(userCredential.user);
      try {
        await AsyncStorage.setItem('userProfile', JSON.stringify({ ...userLocal, createdAt: now.toISOString(), lastActive: now.toISOString() }));
      } catch (cacheErr) {
        console.warn('Failed to cache user profile after registration:', cacheErr);
      }
      return { isSupervisor: false };
    } catch (err: any) {
      try {
        const code = err?.code;
        const msg = err?.message || String(err);
        console.warn('Register failed:', code ? `${code} — ${msg}` : msg);
      } catch (logErr) {
        console.warn('Register failed:', String(err));
      }
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

      // Delete Firestore user document and related user data (checklists, hazard reports)
      try {
        // Delete user-related data first (checklists, reports)
        try {
          await FirestoreService.deleteAllUserData(currentUser.uid);
        } catch (delDataErr) {
          console.warn('Failed to delete user related data (checklists/reports):', delDataErr);
        }

        // Delete Firestore user document if present
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid));
        } catch (err) {
          // Non-fatal - log and continue with auth deletion
          console.warn('Failed to delete user profile document:', err);
        }
      } catch (err) {
        console.warn('Error during user data deletion steps:', err);
      }

      // Clear local checklist cache keys for this user
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const checklistKeys = allKeys.filter(k => k.startsWith(`checklist_${currentUser.uid}_`));
        for (const k of checklistKeys) {
          await AsyncStorage.removeItem(k);
        }
      } catch (cacheErr) {
        console.warn('Failed to clear local checklist cache for user:', cacheErr);
      }

      // Remove any offline queued actions related to this user
      try {
        // Filter queue and remove entries for this user
        const queue = await OfflineSyncService.getQueue();
        const remaining = queue.filter(a => {
          const data = a.data || {};
          return data.userId !== currentUser.uid;
        });
        await StorageService.setObject(StorageService.KEYS.OFFLINE_QUEUE, remaining);
      } catch (queueErr) {
        console.warn('Failed to clear offline queue entries for user:', queueErr);
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

    // Only persist to users collection when we have at least one meaningful user field to save.
    // This avoids creating minimal/empty user docs during supervisor fallback or transient states.
    const meaningfulKeys = ['name', 'role', 'email', 'employeeId', 'phoneNumber', 'isActive'];
    const hasMeaningfulUpdate = meaningfulKeys.some((k) => (updates as any)[k] !== undefined && (updates as any)[k] !== '');

    // Always update local in-memory profile and cache so UI reflects the change immediately
    setUserProfile(mergedProfile);
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(mergedProfile));
    } catch (err) {
      console.warn('Failed to cache userProfile to AsyncStorage:', err);
    }

    if (hasMeaningfulUpdate) {
      const { id, ...persistableProfile } = mergedProfile as UserProfile & { id: string };
      try {
        await setDoc(
          userDocRef,
          {
            ...persistableProfile,
            lastActive: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        // If the Firestore write fails (network or auth), enqueue the profile update for later sync.
        console.warn('[updateUserProfile] Firestore write failed, queuing for offline sync:', err);
        try {
          await OfflineSyncService.addToQueue({ type: 'profile_update', data: { userId: user.uid, updates } });
        } catch (queueErr) {
          console.error('Failed to enqueue profile update for offline sync:', queueErr);
        }
      }
    } else {
      // No meaningful updates to persist to Firestore — nothing to enqueue
      console.debug('[updateUserProfile] skipping Firestore persist - no meaningful fields in updates');
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    profileLoaded,
    sosPulse,
    flashSosPulse,
    startSosBeep,
    stopSosBeep,
    isSosBeepPlaying,
    login,
    register,
    logout,
    deleteAccount,
    updateUserProfile,
  } as AuthContextType;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};