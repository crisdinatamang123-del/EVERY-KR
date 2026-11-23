import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import {
  signInWithGoogle,
  authenticateEmailUser,
  clearAllAuthSessionStorage,
  verifyActiveAuthSession,
  getCachedProfileByUid,
  getAuthSessionEpoch,
  bumpAuthSessionEpoch,
  isLogoutInProgress,
  performFirebaseSignOut
} from '../services/firebaseService';
import { rotateGuestSessionOnLogout } from '../services/chatSessionService';

export interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isAuthReady: boolean;
  loginWithGoogle: (useRedirect?: boolean, selectedRole?: UserRole) => Promise<UserProfile | null>;
  loginWithEmail: (
    email: string,
    role?: UserRole,
    name?: string,
    isSignup?: boolean,
    password?: string
  ) => Promise<UserProfile>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const isLoggingOutRef = useRef<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      const epoch = getAuthSessionEpoch();
      if (isLogoutInProgress()) {
        setFirebaseUser(null);
        setUserProfile(null);
        setIsAuthReady(true);
        return;
      }

      setFirebaseUser(fbUser);
      if (fbUser) {
        const cached = getCachedProfileByUid(fbUser.uid);
        if (cached && !isLogoutInProgress() && getAuthSessionEpoch() === epoch) {
          setUserProfile(cached);
        }
        setIsAuthReady(true);
      } else {
        try {
          const check = await verifyActiveAuthSession(null);
          if (isLogoutInProgress() || getAuthSessionEpoch() !== epoch) {
            return;
          }
          if (check.authenticated && check.user) {
            setUserProfile(check.user);
          } else {
            setUserProfile(null);
          }
        } catch {
          if (!isLogoutInProgress() && getAuthSessionEpoch() === epoch) {
            setUserProfile(null);
          }
        }
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (
    useRedirect: boolean = false,
    selectedRole?: UserRole
  ): Promise<UserProfile | null> => {
    const profile = await signInWithGoogle(useRedirect, selectedRole);
    if (profile) {
      bumpAuthSessionEpoch();
      setUserProfile(profile);
    }
    return profile;
  };

  const loginWithEmail = async (
    email: string,
    role: UserRole = 'student',
    name?: string,
    isSignup: boolean = false,
    password?: string
  ): Promise<UserProfile> => {
    const profile = await authenticateEmailUser({
      email,
      password,
      role,
      name,
      isSignup
    });
    bumpAuthSessionEpoch();
    setUserProfile(profile);
    return profile;
  };

  const logoutUser = async (): Promise<void> => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    rotateGuestSessionOnLogout();
    setFirebaseUser(null);
    setUserProfile(null);
    try {
      await performFirebaseSignOut();
    } finally {
      clearAllAuthSessionStorage();
      isLoggingOutRef.current = false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        isAuthenticated: !!userProfile,
        isGuest: !userProfile,
        isAuthReady,
        loginWithGoogle,
        loginWithEmail,
        logoutUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
