"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type AuthState = {
  user: { id: string; email: string | null } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/me/account', { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          if (j?.id) setUser({ id: String(j.id), email: j.email || null });
        }
      } catch {}
      setLoading(false);
    })();
    return () => { isMounted = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const j = await r.json();
    if (!r.ok) { setLoading(false); throw new Error(j?.error || 'Login failed'); }
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
      }
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
