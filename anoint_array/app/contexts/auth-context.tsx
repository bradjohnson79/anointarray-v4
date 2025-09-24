"use client";
import { createContext, useContext, useMemo, useCallback } from 'react';
import { getSession, signIn, signOut, useSession } from 'next-auth/react';

type AuthUser = {
  id: string;
  email: string | null;
  role?: string | null;
  isActive?: boolean | null;
} | null;

type LoginOptions = {
  callbackUrl?: string | null;
};

type AuthState = {
  user: AuthUser;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, options?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const user = useMemo<AuthUser>(() => {
    const details = session?.user;
    if (!details) return null;
    const email = details.email ?? null;
    const id = details.id ?? email;
    if (!id) return null;
    return {
      id: String(id),
      email,
      role: details.role ?? null,
      isActive: typeof details.isActive === 'boolean' ? details.isActive : null,
    };
  }, [session]);

  const login = useCallback(async (email: string, password: string, options?: LoginOptions) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      ...(options?.callbackUrl ? { callbackUrl: options.callbackUrl } : {}),
    });
    if (!result || result.error) {
      throw new Error('Invalid email or password');
    }
    await getSession();
  }, []);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    await getSession();
  }, []);

  const refresh = useCallback(async () => {
    await getSession();
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    isAuthenticated: !!user,
    loading: status === 'loading',
    login,
    logout,
    refresh,
  }), [user, status, login, logout, refresh]);

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
