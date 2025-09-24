import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

export type ConvexUserRecord = {
  _id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  passwordHash?: string | null;
  isActive?: boolean | null;
  phone?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  [key: string]: unknown;
};

function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const lower = String(input).trim().toLowerCase();
  return lower || null;
}

async function withConvexFallback<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  let primaryError: unknown = null;
  try {
    return await fn();
  } catch (err) {
    primaryError = err;
  }
  try {
    return await fallback();
  } catch (err) {
    if (primaryError instanceof Error) {
      const message = `${primaryError.message}; fallback failed: ${(err as Error)?.message ?? err}`;
      throw new Error(message);
    }
    throw err;
  }
}

export async function fetchConvexUserByEmail(email: string): Promise<ConvexUserRecord | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const args = { email: normalized };
  const result = await withConvexFallback(
    () => callConvex({ functionPath: 'users:byEmail', args }),
    () => runConvex('users:byEmail', args)
  );
  return (result ?? null) as ConvexUserRecord | null;
}

export async function setConvexUserPasswordHash(email: string, passwordHash: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Email is required');
  const args = { email: normalized, passwordHash };
  await withConvexFallback(
    () => callConvex({ functionPath: 'users:setPasswordHash', args }),
    () => runConvex('users:setPasswordHash', args)
  );
}

export async function upsertConvexUserProfile(email: string, payload: { name?: string | null }): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Email is required');
  const args = { email: normalized, name: payload?.name ?? undefined };
  await withConvexFallback(
    () => callConvex({ functionPath: 'users:upsertByEmail', args }),
    () => runConvex('users:upsertByEmail', args)
  );
}

export async function createConvexUserAccount(params: { email: string; name?: string | null; passwordHash: string }) {
  const normalized = normalizeEmail(params.email);
  if (!normalized) throw new Error('Email is required');
  const args = {
    email: normalized,
    name: params.name ?? null,
    passwordHash: params.passwordHash,
  };
  return withConvexFallback(
    () => callConvex({ functionPath: 'users:createWithPassword', args }),
    () => runConvex('users:createWithPassword', args)
  );
}
