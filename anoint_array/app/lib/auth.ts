import { auth, currentUser } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { fetchConvexUserByEmail } from '@/lib/convexUsers';

export type AuthUser = {
  id: string;
  email: string | null;
  role?: string | null;
  isActive?: boolean | null;
} | null;

export async function getAuthUserFromRequest(_req?: NextRequest): Promise<AuthUser> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  return {
    id: userId,
    email,
    role: null,
    isActive: true,
  };
}

export async function requireUser(_req?: NextRequest) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  if (!email) throw new Error('Unauthorized');
  const record = await fetchConvexUserByEmail(email.toLowerCase()).catch(() => null);
  if (record?.isActive === false) throw new Error('Forbidden');
  return {
    id: userId,
    email,
    role: record?.role ?? null,
    isActive: record?.isActive ?? true,
  };
}

export async function requireAdmin(req?: NextRequest) {
  const user = await requireUser(req);
  const email = (user?.email || '').toLowerCase();
  if (!email) throw new Error('Unauthorized');

  const record = await fetchConvexUserByEmail(email);
  if (!record || record.role !== 'ADMIN' || record.isActive === false) {
    throw new Error('Forbidden');
  }

  return {
    id: user!.id,
    email: user!.email,
    role: record.role ?? 'ADMIN',
    isActive: record.isActive ?? true,
  };
}
