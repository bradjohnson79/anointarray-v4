import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'aa_session';

export function signSession(payload: { email: string }): string {
  const secret = process.env.AUTH_SECRET || 'dev-secret-change-me';
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '7d' });
}

export function verifySession(token: string): { email: string } | null {
  try {
    const secret = process.env.AUTH_SECRET || 'dev-secret-change-me';
    return jwt.verify(token, secret) as any;
  } catch { return null; }
}

export function readSessionFromCookies(): { email: string } | null {
  try {
    const c = cookies();
    const t = c.get(COOKIE_NAME)?.value;
    if (!t) return null;
    return verifySession(t);
  } catch { return null; }
}

export function setSessionCookie(token: string) {
  const c = cookies();
  c.set({ name: COOKIE_NAME, value: token, httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 60*60*24*7 });
}

export function clearSessionCookie() {
  const c = cookies();
  c.set({ name: COOKIE_NAME, value: '', httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 0 });
}

