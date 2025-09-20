"use client";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';

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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || null });
      } else {
        // Fallback: read from server cookie via API (covers server-side login)
        try {
          const res = await fetch('/api/me/account', { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            if (j?.id) setUser({ id: String(j.id), email: j.email || null });
          }
        } catch {}
      }
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email || null } : null);
    });
    return () => { isMounted = false; sub.subscription.unsubscribe(); };
  }, [supabase]);

  async function login(email: string, password: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
    if (error) throw new Error(error.message);
    setLoading(false);
  }

  async function logout() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }

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
