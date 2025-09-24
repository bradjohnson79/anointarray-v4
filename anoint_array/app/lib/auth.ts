import { getServerSession } from 'next-auth/next';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/next-auth';
import { fetchConvexUserByEmail } from '@/lib/convexUsers';

export type AuthUser = {
  id: string;
  email: string | null;
  role?: string | null;
  isActive?: boolean | null;
} | null;

export async function getAuthUserFromRequest(_req?: NextRequest): Promise<AuthUser> {
  const session = await getServerSession(authOptions);
  const details = session?.user;
  if (!details) return null;
  const email = details.email || null;
  const id = details.id || email || null;
  if (!id) return null;
  return {
    id: String(id),
    email,
    role: details.role ?? null,
    isActive: typeof details.isActive === 'boolean' ? details.isActive : null,
  };
}

export async function requireUser(req?: NextRequest) {
  const user = await getAuthUserFromRequest(req);
  if (!user) throw new Error('Unauthorized');
  if (user.isActive === false) throw new Error('Forbidden');
  return user;
}

export async function requireAdmin(req?: NextRequest) {
  const user = await requireUser(req);
  const email = (user.email || '').toLowerCase();
  if (!email) throw new Error('Unauthorized');

  const record = await fetchConvexUserByEmail(email);
  if (!record || record.role !== 'ADMIN' || record.isActive === false) {
    throw new Error('Forbidden');
  }

  return {
    id: user.id,
    email: user.email,
    role: record.role ?? 'ADMIN',
    isActive: record.isActive ?? true,
  };
}
