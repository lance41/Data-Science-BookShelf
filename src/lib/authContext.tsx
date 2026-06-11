import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
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
  return user.uid.startsWith('sim_') || user.uid === 'admin_uid' || user.uid === 'user_bob';
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

  // -------------------------------------------------------------
  // FIRESTORE REALTIME SYNC LISTENERS (FOR ADMIN DASHBOARD)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user || user.role !== 'admin' || isSimulatedUser(user)) {
      setAllRequests([]);
      setAllUsersList([]);
      return;
    }

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
      console.error('[AuthContext] Firestore onSnapshot requests error: ', error);
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
      console.error('[AuthContext] Firestore onSnapshot users error: ', error);
    });

    return () => {
      unsubRequests();
      unsubUsers();
    };
  }, [user]);

  // -------------------------------------------------------------
  // SIMULATOR REALTIME LISTENERS / SYNC (FALLBACK STATE MANAGEMENT)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isFirebaseConfigured && !isSimulatedUser(user)) return;

    // Periodically sync or initialize local lists
    const loadSimulatedData = () => {
      // Load users
      const storedUsers = localStorage.getItem('datascience_sim_users');
      let localUsers: AppUser[] = [];
      if (storedUsers) {
        localUsers = JSON.parse(storedUsers);
      } else {
        // Default list with some test users
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

      // Load requests
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

    // Setup an interval to sync simulated records
    const interval = setInterval(loadSimulatedData, 4000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle system boot check
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        try {
          if (fbUser) {
            // User is signed in with Firebase Auth. Synch in firestore.
            const userRef = doc(db, 'users', fbUser.uid);
            const userSnap = await getDoc(userRef);
            
            const isUserAdmin = fbUser.email?.toLowerCase() === 'adiemus80@gmail.com';
            
            let appUser: AppUser;
            if (userSnap.exists()) {
              const existingData = userSnap.data();
              appUser = {
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || 'Anonymous',
                photoURL: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                role: existingData.role || (isUserAdmin ? 'admin' : 'viewer'),
                libraryAccess: existingData.libraryAccess !== undefined ? existingData.libraryAccess : (isUserAdmin ? true : false),
                createdAt: existingData.createdAt || serverTimestamp(),
                lastLogin: serverTimestamp()
              };
              // Update last login
              await updateDoc(userRef, { lastLogin: serverTimestamp() });
            } else {
              appUser = {
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || 'Anonymous',
                photoURL: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                role: isUserAdmin ? 'admin' : 'viewer',
                libraryAccess: isUserAdmin ? true : false,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
              };
              await setDoc(userRef, appUser);
            }
            
            // Re-fetch clean fields
            const finalSnap = await getDoc(userRef);
            if (finalSnap.exists()) {
              const cleanedData = finalSnap.data();
              setUser({
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || 'Anonymous',
                photoURL: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                role: cleanedData.role as 'admin' | 'viewer',
                libraryAccess: cleanedData.libraryAccess,
                createdAt: cleanedData.createdAt,
                lastLogin: cleanedData.lastLogin
              });
            }
          } else {
            const storedUser = localStorage.getItem('datascience_auth_user');
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
              } catch (_) {
                setUser(null);
              }
            } else {
              setUser(null);
            }
          }
        } catch (error) {
          console.error('[AuthContext] Auth listener error:', error);
        } finally {
          setLoading(false);
        }
      });
      return unsubscribe;
    } else {
      // Simulated Session Recovery
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
  // USER ACTIONS
  // -------------------------------------------------------------
  const signInWithGoogle = async (simulateEmail?: string, simulateName?: string) => {
    setLoading(true);
    if (isFirebaseConfigured && auth && !simulateEmail) {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('[AuthContext] Google Signin Failed:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    } else {
      // Simulate Google Sign-In with popup
      try {
        const targetEmail = simulateEmail || 'user@example.com';
        const targetName = simulateName || 'Data Explorer';
        const isUserAdmin = targetEmail.toLowerCase() === 'adiemus80@gmail.com';
        
        // Recover user state or create new
        const storedUsers = localStorage.getItem('datascience_sim_users');
        let currentUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : [];
        let existingUser = currentUsers.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());

        let simulatedProfile: AppUser;
        if (existingUser) {
          existingUser.lastLogin = new Date().toISOString();
          simulatedProfile = existingUser;
        } else {
          const isAlice = targetEmail.toLowerCase() === 'alice@example.com';
          simulatedProfile = {
            uid: `sim_${Date.now()}`,
            email: targetEmail,
            displayName: targetName,
            photoURL: targetEmail.toLowerCase() === 'adiemus80@gmail.com'
              ? 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80'
              : (isAlice 
                  ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'),
            role: isUserAdmin ? 'admin' : 'viewer',
            libraryAccess: isUserAdmin ? true : (isAlice ? true : false),
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
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
        localStorage.removeItem('datascience_auth_user');
        setUser(null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      localStorage.removeItem('datascience_auth_user');
      setUser(null);
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
      } catch (error) {
        console.error('[AuthContext] Submit access request error:', error);
        throw error;
      }
    } else {
      // Simulated Access Request creation
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
      // In firestore, we will query from our current in-memory feed or query once
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
        // 1. Update accessRequest
        const reqRef = doc(db, 'accessRequests', requestId);
        await updateDoc(reqRef, {
          status: 'approved',
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
          reviewedByEmail: user.email
        });

        // 2. Grant library access to target user
        const targetUserRef = doc(db, 'users', targetUid);
        await updateDoc(targetUserRef, {
          libraryAccess: true
        });

        console.log(`[Admin Auths] Approved request ${requestId} for uid ${targetUid}`);
      } catch (error) {
        console.error('[AuthContext] approveRequest error:', error);
        throw error;
      }
    } else {
      // Simulated
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

      // Update user libraryAccess
      const storedUsers = localStorage.getItem('datascience_sim_users');
      let currentUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : [];
      currentUsers = currentUsers.map(u => u.uid === targetUid ? { ...u, libraryAccess: true } : u);
      localStorage.setItem('datascience_sim_users', JSON.stringify(currentUsers));
      setAllUsersList(currentUsers);
      
      // If target user is current user, sync immediately!
      if (user.uid === targetUid) {
        const updatedSelf = { ...user, libraryAccess: true };
        setUser(updatedSelf);
        localStorage.setItem('datascience_auth_user', JSON.stringify(updatedSelf));
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
      } catch (error) {
        console.error('[AuthContext] denyRequest error:', error);
        throw error;
      }
    } else {
      // Simulated
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
      } catch (error) {
        console.error('[AuthContext] grantAccessDirectly error:', error);
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
        localStorage.setItem('datascience_auth_user', JSON.stringify(updatedSelf));
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
      } catch (error) {
        console.error('[AuthContext] revokeAccessDirectly error:', error);
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
        localStorage.setItem('datascience_auth_user', JSON.stringify(updatedSelf));
      }
    }
  };

  const updateProfile = async (displayName: string, photoURL: string) => {
    if (!user) throw new Error('Must be logged in to update profile.');

    // 1. Update in Firestore if Firebase configured and not a simulated user
    if (isFirebaseConfigured && db && !isSimulatedUser(user)) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName,
          photoURL
        });
      } catch (error) {
        console.error('[AuthContext] Update profile error:', error);
        throw error;
      }
    }

    // 2. Synchronize in simulated user storage if needed
    const storedUsers = localStorage.getItem('datascience_sim_users');
    let currentUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : [];
    if (currentUsers.some(u => u.uid === user.uid)) {
      currentUsers = currentUsers.map(u => u.uid === user.uid ? { ...u, displayName, photoURL } : u);
      localStorage.setItem('datascience_sim_users', JSON.stringify(currentUsers));
      setAllUsersList(currentUsers);
    }

    // 3. Update current user state
    const updatedSelf = { ...user, displayName, photoURL };
    setUser(updatedSelf);
    localStorage.setItem('datascience_auth_user', JSON.stringify(updatedSelf));
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
