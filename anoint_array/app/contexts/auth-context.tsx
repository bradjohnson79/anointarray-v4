"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

export type AuthUser = {
  id: string;
  email: string | null;
  name?: string | null;
  role?: string | null;
  isActive?: boolean | null;
} | null;

type AuthState = {
  user: AuthUser;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchProfile() {
  const res = await fetch('/api/me/profile', { cache: 'no-store' });
  if (!res.ok) throw new Error('Profile fetch failed');
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!clerkUser) {
      setProfile(null);
      return;
    }
    try {
      setLoadingProfile(true);
      const data = await fetchProfile();
      setProfile(data);
      setProfileError(null);
    } catch (error: any) {
      setProfileError(error?.message || 'Unable to load profile');
    } finally {
      setLoadingProfile(false);
    }
  }, [clerkUser]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !clerkUser) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    (async () => {
      try {
        await fetch('/api/onboard', { method: 'POST' });
      } catch (error) {
        // non-critical; continue to load profile
        console.error('Failed to onboard user', error);
      }
      await loadProfile();
    })();
  }, [isLoaded, isSignedIn, clerkUser, loadProfile]);

  const combinedUser: AuthUser = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null;
    const email =
      profile?.email ??
      clerkUser.primaryEmailAddress?.emailAddress ??
      (clerkUser.emailAddresses[0]?.emailAddress ?? null);
    return {
      id: clerkUser.id,
      email,
      name: profile?.name ?? clerkUser.fullName ?? clerkUser.username ?? email,
      role: profile?.role ?? null,
      isActive: profile?.isActive ?? true,
    };
  }, [isSignedIn, clerkUser, profile]);

  const logout = useCallback(async () => {
    await signOut({ redirectUrl: '/' });
    setProfile(null);
  }, [signOut]);

  const refresh = useCallback(async () => {
    if (!isSignedIn || !clerkUser) return;
    await loadProfile();
  }, [isSignedIn, clerkUser, loadProfile]);

  const value = useMemo<AuthState>(() => ({
    user: combinedUser,
    isAuthenticated: !!combinedUser,
    loading: !isLoaded || (isSignedIn && loadingProfile && !profile && !profileError),
    logout,
    refresh,
  }), [combinedUser, isLoaded, isSignedIn, loadingProfile, profile, profileError, logout, refresh]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
