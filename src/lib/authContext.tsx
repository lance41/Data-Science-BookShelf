import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot,
  serverTimestamp,
  updateDoc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from './firebase';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'viewer';
  libraryAccess: boolean;
  createdAt: any;
  lastLogin: any;
}

export function isSimulatedUser(user: AppUser | null): boolean {
  if (!user) return false;
  return user.uid.startsWith('sim_') || user.uid === 'admin_uid' || user.uid === 'user_bob' || user.uid === 'user_alice';
}

export interface AccessRequest {
  id: string;
  uid: string;
  userEmail: string;
  displayName: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  reviewedByEmail?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  firebaseActive: boolean;
  signInWithGoogle: (simulateEmail?: string, simulateName?: string) => Promise<void>;
  logout: () => Promise<void>;
  submitAccessRequest: (reason: string) => Promise<void>;
  getMyRequests: () => Promise<AccessRequest[]>;
  allRequests: AccessRequest[];
  allUsersList: AppUser[];
  approveRequest: (requestId: string, targetUid: string) => Promise<void>;
  denyRequest: (requestId: string) => Promise<void>;
  grantAccessDirectly: (targetUid: string) => Promise<void>;
  revokeAccessDirectly: (targetUid: string) => Promise<void>;
  updateProfile: (displayName: string, photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState<AccessRequest[]>([]);
  const [allUsersList, setAllUsersList] = useState<AppUser[]>([]);

  // Debug log initialization state
  useEffect(() => {
    console.log('[Firebase Auth Log] Firebase Authentication active:', isFirebaseConfigured);
  }, []);

  // -------------------------------------------------------------
  // FIRESTORE REALTIME SYNC LISTENERS (FOR ADMIN DASHBOARD & LISTS)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user || user.role !== 'admin' || isSimulatedUser(user)) {
      if (isFirebaseConfigured && (!user || user.role !== 'admin')) {
        setAllRequests([]);
        setAllUsersList([]);
      }
      return;
    }

    console.log('[Firebase Auth Log] Setting up realtime listeners for accessRequests and users collections...');

    // Realtime requests feed
    const unsubRequests = onSnapshot(collection(db, 'accessRequests'), (snapshot) => {
      const reqs: AccessRequest[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        reqs.push({
          id: docSnapshot.id,
          ...data,
          requestedAt: data.requestedAt ? (data.requestedAt as Timestamp).toDate().toISOString() : new Date().toISOString()
        } as AccessRequest);
      });
      // Sort requestedAt desc
      reqs.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      setAllRequests(reqs);
    }, (error) => {
      console.error('[Firebase Auth Log] Firestore onSnapshot accessRequests error:', error.code || error, error.message || '');
    });

    // Realtime users feed
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usrs: AppUser[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        usrs.push({
          uid: docSnapshot.id,
          ...data,
          createdAt: data.createdAt ? (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt) : '',
          lastLogin: data.lastLogin ? (data.lastLogin instanceof Timestamp ? data.lastLogin.toDate().toISOString() : data.lastLogin) : ''
        } as AppUser);
      });
      setAllUsersList(usrs);
    }, (error) => {
      console.error('[Firebase Auth Log] Firestore onSnapshot users error:', error.code || error, error.message || '');
    });

    return () => {
      unsubRequests();
      unsubUsers();
    };
  }, [user]);

  // -------------------------------------------------------------
  // LOCAL SIMULATION FALLBACK (ONLY RUNS WHEN FIREBASE IS NOT CONFIGURED)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isFirebaseConfigured) {
      // STRICT REQUIREMENT: When Firebase is configured, do not load datascience_sim_users
      // or datascience_sim_requests or show Bob/Alice sample users.
      return;
    }

    const loadSimulatedData = () => {
      const storedUsers = localStorage.getItem('datascience_sim_users');
      let localUsers: AppUser[] = [];
      if (storedUsers) {
        localUsers = JSON.parse(storedUsers);
      } else {
        localUsers = [
          {
            uid: 'admin_uid',
            email: 'adiemus80@gmail.com',
            displayName: 'Owner Admin',
            photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            role: 'admin',
            libraryAccess: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          },
          {
            uid: 'user_alice',
            email: 'alice@example.com',
            displayName: 'Alice Approved Researcher',
            photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
            role: 'viewer',
            libraryAccess: true,
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            lastLogin: new Date(Date.now() - 7200000).toISOString()
          },
          {
            uid: 'user_bob',
            email: 'bob@example.com',
            displayName: 'Bob The Analytics Nerd',
            photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
            role: 'viewer',
            libraryAccess: false,
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            lastLogin: new Date(Date.now() - 3600000).toISOString()
          }
        ];
        localStorage.setItem('datascience_sim_users', JSON.stringify(localUsers));
      }
      setAllUsersList(localUsers);

      const storedReqs = localStorage.getItem('datascience_sim_requests');
      let localReqs: AccessRequest[] = [];
      if (storedReqs) {
        localReqs = JSON.parse(storedReqs);
      } else {
        localReqs = [
          {
            id: 'req_1',
            uid: 'user_bob',
            userEmail: 'bob@example.com',
            displayName: 'Bob The Analytics Nerd',
            reason: 'I need to study machine learning algorithms for my research paper.',
            status: 'pending',
            requestedAt: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ];
        localStorage.setItem('datascience_sim_requests', JSON.stringify(localReqs));
      }
      setAllRequests(localReqs);
    };

    loadSimulatedData();
    const interval = setInterval(loadSimulatedData, 4000);
    return () => clearInterval(interval);
  }, [user]);

  // -------------------------------------------------------------
  // FIREBASE ONAUTHSTATECHANGED AUTHENTICATION LISTENER
  // -------------------------------------------------------------
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      console.log('[Firebase Auth Log] Listening to Firebase onAuthStateChanged...');
      
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        const userPresent = !!fbUser;
        console.log('[Firebase Auth Log] onAuthStateChanged user present:', userPresent);

        if (fbUser) {
          console.log('[Firebase Auth Log] Firebase authenticated UID:', fbUser.uid);
          console.log('[Firebase Auth Log] Firebase authenticated email:', fbUser.email);

          try {
            const userRef = doc(db, 'users', fbUser.uid);
            const userSnap = await getDoc(userRef);

            const userEmail = (fbUser.email || '').trim().toLowerCase();
            const isUserAdmin = userEmail === 'adiemus80@gmail.com';

            if (userSnap.exists()) {
              const existingData = userSnap.data();
              console.log('[Firebase Auth Log] Firestore user profile loaded for UID:', fbUser.uid);

              const role: 'admin' | 'viewer' = isUserAdmin ? 'admin' : (existingData.role || 'viewer');
              // Preserve existing viewer's libraryAccess value during later sign-ins
              const libraryAccess: boolean = isUserAdmin 
                ? true 
                : (existingData.libraryAccess !== undefined ? existingData.libraryAccess : false);

              const updatePayload: any = {
                lastLogin: serverTimestamp(),
                displayName: fbUser.displayName || existingData.displayName || 'Google User',
                photoURL: fbUser.photoURL || existingData.photoURL || ''
              };

              if (isUserAdmin) {
                updatePayload.role = 'admin';
                updatePayload.libraryAccess = true;
              }

              await updateDoc(userRef, updatePayload);
              console.log('[Firebase Auth Log] Updated lastLogin timestamp in Firestore users/', fbUser.uid);

              setUser({
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || existingData.displayName || 'Google User',
                photoURL: fbUser.photoURL || existingData.photoURL || '',
                role,
                libraryAccess,
                createdAt: existingData.createdAt,
                lastLogin: new Date().toISOString()
              });
            } else {
              console.log('[Firebase Auth Log] Creating new Firestore user profile at users/', fbUser.uid);
              const newProfile = {
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || 'Google User',
                photoURL: fbUser.photoURL || '',
                role: isUserAdmin ? 'admin' : 'viewer',
                libraryAccess: isUserAdmin ? true : false,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
              };

              await setDoc(userRef, newProfile);
              console.log('[Firebase Auth Log] Firestore user profile created successfully!');

              setUser({
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || 'Google User',
                photoURL: fbUser.photoURL || '',
                role: isUserAdmin ? 'admin' : 'viewer',
                libraryAccess: isUserAdmin ? true : false,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
              });
            }
          } catch (err: any) {
            console.error('[Firebase Auth Log] Error syncing user profile with Firestore:', err.code || err, err.message || '');
            setUser(null);
          } finally {
            setLoading(false);
          }
        } else {
          console.log('[Firebase Auth Log] No active Firebase Auth session. Setting user to null.');
          // Do NOT restore any user from localStorage when Firebase is configured!
          setUser(null);
          setLoading(false);
        }
      });

      return unsubscribe;
    } else {
      // Non-Firebase environment fallback
      try {
        const storedUser = localStorage.getItem('datascience_auth_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // -------------------------------------------------------------
  // USER AUTHENTICATION ACTIONS
  // -------------------------------------------------------------
  const signInWithGoogle = async (simulateEmail?: string, simulateName?: string) => {
    setLoading(true);
    if (isFirebaseConfigured && auth) {
      // ALWAYS use real Firebase Auth in production / Firebase configured mode
      try {
        console.log('[Firebase Auth Log] Starting Google sign-in popup...');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account'
        });

        const result = await signInWithPopup(auth, provider);
        console.log('[Firebase Auth Log] Google sign-in succeeded!');
        console.log(' - Firebase authenticated UID:', result.user.uid);
        console.log(' - Firebase authenticated email:', result.user.email);
      } catch (error: any) {
        console.error('[Firebase Auth Log] Authentication error code:', error.code || 'unknown', 'message:', error.message || error);
        throw error;
      } finally {
        setLoading(false);
      }
    } else {
      // Simulated sign-in for non-Firebase local environment only
      try {
        const targetEmail = simulateEmail || 'user@example.com';
        const targetName = simulateName || 'Data Explorer';
        const isUserAdmin = targetEmail.toLowerCase() === 'adiemus80@gmail.com';
        
        const storedUsers = localStorage.getItem('datascience_sim_users');
        let currentUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : [];
        let existingUser = currentUsers.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());

        let simulatedProfile: AppUser;
        if (existingUser) {
          existingUser.lastLogin = new Date().toISOString();
          simulatedProfile = existingUser;
        } else {
          simulatedProfile = {
            uid: `sim_${Date.now()}`,
            email: targetEmail,
            displayName: targetName,
            photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
            role: isUserAdmin ? 'admin' : 'viewer',
            libraryAccess: isUserAdmin ? true : false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };
          currentUsers.push(simulatedProfile);
        }

        localStorage.setItem('datascience_sim_users', JSON.stringify(currentUsers));
        localStorage.setItem('datascience_auth_user', JSON.stringify(simulatedProfile));
        setUser(simulatedProfile);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await signOut(auth);
        console.log('[Firebase Auth Log] Signed out successfully from Firebase Auth.');
      }
      // Remove obsolete/simulated auth localStorage keys
      localStorage.removeItem('datascience_auth_user');
      localStorage.removeItem('datascience_sim_users');
      localStorage.removeItem('datascience_sim_requests');
      setUser(null);
    } catch (err: any) {
      console.error('[Firebase Auth Log] Sign out error:', err.code || err, err.message || '');
    } finally {
      setLoading(false);
    }
  };

  const submitAccessRequest = async (reason: string) => {
    if (!user) throw new Error('Must be logged in to submit request.');
    
    if (isFirebaseConfigured && db && !isSimulatedUser(user)) {
      try {
        const reqData = {
          uid: user.uid,
          userEmail: user.email,
          displayName: user.displayName,
          reason,
          status: 'pending',
          requestedAt: serverTimestamp(),
          reviewedAt: null,
          reviewedBy: null,
          reviewedByEmail: null
        };
        await addDoc(collection(db, 'accessRequests'), reqData);
        console.log('[Firebase Auth Log] Access request submitted to Firestore accessRequests');
      } catch (error: any) {
        console.error('[Firebase Auth Log] Submit access request error:', error.code || error, error.message || '');
        throw error;
      }
    } else {
      const storedReqs = localStorage.getItem('datascience_sim_requests');
      const reqs: AccessRequest[] = storedReqs ? JSON.parse(storedReqs) : [];
      
      const newReq: AccessRequest = {
        id: `sim_req_${Date.now()}`,
        uid: user.uid,
        userEmail: user.email,
        displayName: user.displayName,
        reason,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
      reqs.unshift(newReq);
      localStorage.setItem('datascience_sim_requests', JSON.stringify(reqs));
      setAllRequests(reqs);
    }
  };

  const getMyRequests = async (): Promise<AccessRequest[]> => {
    if (!user) return [];
    if (isFirebaseConfigured && db && !isSimulatedUser(user)) {
      return allRequests.filter(r => r.uid === user.uid);
    } else {
      const storedReqs = localStorage.getItem('datascience_sim_requests');
      const reqs: AccessRequest[] = storedReqs ? JSON.parse(storedReqs) : [];
      return reqs.filter(r => r.uid === user.uid);
    }
  };

  // -------------------------------------------------------------
  // ADMIN CONTROL OPERATIONS
  // -------------------------------------------------------------
  const approveRequest = async (requestId: string, targetUid: string) => {
    if (!user || user.role !== 'admin') throw new Error('Needs administrative credentials.');

    if (isFirebaseConfigured && db && !isSimulatedUser(user)) {
      try {
        const reqRef = doc(db, 'accessRequests', requestId);
        await updateDoc(reqRef, {
          status: 'approved',
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
          reviewedByEmail: user.email
        });

        const targetUserRef = doc(db, 'users', targetUid);
        await updateDoc(targetUserRef, {
          libraryAccess: true
        });

        console.log(`[Firebase Auth Log] Approved request ${requestId} for targetUid ${targetUid}`);
      } catch (error: any) {
        console.error('[Firebase Auth Log] approveRequest error:', error.code || error, error.message || '');
        throw error;
      }
    } else {
      const storedReqs = localStorage.getItem('datascience_sim_requests');
      let reqs: AccessRequest[] = storedReqs ? JSON.parse(storedReqs) : [];
      reqs = reqs.map(r => r.id === requestId ? {
        ...r,
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.uid,
        reviewedByEmail: user.email
      } : r);
      localStorage.setItem('datascience_sim_requests', JSON.stringify(reqs));
      setAllRequests(reqs);

      const storedUsers = localStorage.getItem('datascience_sim_users');
      let currentUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : [];
      currentUsers = currentUsers.map(u => u.uid === targetUid ? { ...u, libraryAccess: true } : u);
      localStorage.setItem('datascience_sim_users', JSON.stringify(currentUsers));
      setAllUsersList(currentUsers);
      
      if (user.uid === targetUid) {
        const updatedSelf = { ...user, libraryAccess: true };
        setUser(updatedSelf);
      }
    }
  };

  const denyRequest = async (requestId: string) => {
    if (!user || user.role !== 'admin') throw new Error('Needs administrative credentials.');

    if (isFirebaseConfigured && db && !isSimulatedUser(user)) {
      try {
        const reqRef = doc(db, 'accessRequests', requestId);
        await updateDoc(reqRef, {
          status: 'denied',
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
          reviewedByEmail: user.email
        });
      } catch (error: any) {
        console.error('[Firebase Auth Log] denyRequest error:', error.code || error, error.message || '');
        throw error;
      }
    } else {
      const storedReqs = localStorage.getItem('datascience_sim_requests');
      let reqs: AccessRequest[] = storedReqs ? JSON.parse(storedReqs) : [];
      reqs = reqs.map(r => r.id === requestId ? {
        ...r,
        status: 'denied',
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.uid,
        reviewedByEmail: user.email
      } : r);
      localStorage.setItem('datascience_sim_requests', JSON.stringify(reqs));
      setAllRequests(reqs);
    }
  };

  const grantAccessDirectly = async (targetUid: string) => {
    if (!user || user.role !== 'admin') throw new Error('Needs administrative credentials.');

    if (isFirebaseConfigured && db && !isSimulatedUser(user)) {
      try {
        const targetUserRef = doc(db, 'users', targetUid);
        await updateDoc(targetUserRef, {
          libraryAccess: true
        });
      } catch (error: any) {
        console.error('[Firebase Auth Log] grantAccessDirectly error:', error.code || error, error.message || '');
        throw error;
      }
    } else {
      const storedUsers = localStorage.getItem('datascience_sim_users');
      let currentUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : [];
      currentUsers = currentUsers.map(u => u.uid === targetUid ? { ...u, libraryAccess: true } : u);
      localStorage.setItem('datascience_sim_users', JSON.stringify(currentUsers));
      setAllUsersList(currentUsers);
      
      if (user.uid === targetUid) {
        const updatedSelf = { ...user, libraryAccess: true };
        setUser(updatedSelf);
      }
    }
  };

  const revokeAccessDirectly = async (targetUid: string) => {
    if (!user || user.role !== 'admin') throw new Error('Needs administrative credentials.');

    if (isFirebaseConfigured && db && !isSimulatedUser(user)) {
      try {
        const targetUserRef = doc(db, 'users', targetUid);
        await updateDoc(targetUserRef, {
          libraryAccess: false
        });
      } catch (error: any) {
        console.error('[Firebase Auth Log] revokeAccessDirectly error:', error.code || error, error.message || '');
        throw error;
      }
    } else {
      const storedUsers = localStorage.getItem('datascience_sim_users');
      let currentUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : [];
      currentUsers = currentUsers.map(u => u.uid === targetUid ? { ...u, libraryAccess: false } : u);
      localStorage.setItem('datascience_sim_users', JSON.stringify(currentUsers));
      setAllUsersList(currentUsers);
      
      if (user.uid === targetUid) {
        const updatedSelf = { ...user, libraryAccess: false };
        setUser(updatedSelf);
      }
    }
  };

  const updateProfile = async (displayName: string, photoURL: string) => {
    if (!user) throw new Error('Must be logged in to update profile.');

    if (isFirebaseConfigured && db && !isSimulatedUser(user)) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName,
          photoURL
        });
      } catch (error: any) {
        console.error('[Firebase Auth Log] Update profile error:', error.code || error, error.message || '');
        throw error;
      }
    }

    const updatedSelf = { ...user, displayName, photoURL };
    setUser(updatedSelf);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      firebaseActive: isFirebaseConfigured,
      signInWithGoogle,
      logout,
      submitAccessRequest,
      getMyRequests,
      allRequests,
      allUsersList,
      approveRequest,
      denyRequest,
      grantAccessDirectly,
      revokeAccessDirectly,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
