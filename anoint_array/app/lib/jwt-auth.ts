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
  // Derive cookie domain for apex + subdomains in production
  let domain: string | undefined = undefined;
  try {
    const explicit = process.env.COOKIE_DOMAIN;
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    const host = explicit || (baseUrl ? new URL(baseUrl).hostname : '');
    if (host && !/^(localhost|127\.0\.0\.1)$/.test(host)) {
      domain = (host.startsWith('www.') ? host.slice(4) : host);
      domain = '.' + domain; // allow subdomains + apex
    }
  } catch {}
  const isSecure = (() => {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    return /^https:/i.test(baseUrl) || process.env.NODE_ENV === 'production';
  })();
  c.set({ name: COOKIE_NAME, value: token, httpOnly: true, sameSite: 'lax', path: '/', secure: isSecure, maxAge: 60*60*24*7, ...(domain ? { domain } : {}) });
}

export function clearSessionCookie() {
  const c = cookies();
  c.set({ name: COOKIE_NAME, value: '', httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 0 });
}
