import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { readSessionFromCookies, verifySession } from '@/lib/jwt-auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

export type AuthUser = { id: string; email: string | null } | null;

export async function getAuthUserFromRequest(req?: NextRequest): Promise<AuthUser> {
  try {
    const h = headers();
    const authHeader = h.get('Authorization') || (req?.headers?.get?.('Authorization') ?? null);
    const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer) {
      const s = verifySession(bearer);
      return s?.email ? { id: s.email, email: s.email } : null;
    }
    const s = readSessionFromCookies();
    return s?.email ? { id: s.email, email: s.email } : null;
  } catch { return null; }
}

export async function requireUser(req?: NextRequest) {
  const u = await getAuthUserFromRequest(req);
  if (!u) throw new Error('Unauthorized');
  return u;
}

export async function requireAdmin(req?: NextRequest) {
  const u = await requireUser(req);
  const email = (u?.email || '').toLowerCase();
  if (!email) throw new Error('Unauthorized');
  try {
    const out: any = await runConvex('users:byEmail', { email });
    if (!out || out.role !== 'ADMIN' || out.isActive === false) throw new Error('Forbidden');
    return u;
  } catch {
    const out: any = await callConvex({ functionPath: 'users:byEmail', args: { email } });
    if (!out || out.role !== 'ADMIN' || out.isActive === false) throw new Error('Forbidden');
    return u;
  }
}

