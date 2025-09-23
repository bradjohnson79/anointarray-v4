"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type AuthUser = { id: string; email: string | null } | null;
type AuthState = {
  user: AuthUser;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/me/account', { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          if (j?.id) setUser({ id: String(j.id), email: j.email || null });
        } else if (res.status === 401) {
          // Unauthenticated is a valid state on public pages
          if (typeof window !== 'undefined') console.log('Unauthenticated user — skipping /api/me/account');
          setUser(null);
        }
      } catch {
        // Network issues: don’t crash the app; leave user as null
        setUser(null);
      }
      setLoading(false);
    })();
    return () => { isMounted = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const j = await r.json();
    if (!r.ok) { setLoading(false); throw new Error(j?.error || 'Login failed'); }
    // Minimal set; a later refresh will hydrate full profile/role
    setUser({ id: j.email, email: j.email });
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setLoading(false);
  }, []);

  async function refresh() {
    try {
      const res = await fetch('/api/me/account', { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json();
        if (j?.id) setUser({ id: String(j.id), email: j.email || null });
      } else if (res.status === 401) {
        // If session expired, reflect unauthenticated state silently
        if (typeof window !== 'undefined') console.log('Session expired — /api/me/account returned 401');
        setUser(null);
      }
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
