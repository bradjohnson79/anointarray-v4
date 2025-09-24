'use server';

import {
  fetchConvexUserByEmail,
  setConvexUserPasswordHash,
  upsertConvexUserProfile,
} from '@/lib/convexUsers';

export type CreateAccountInput = {
  name: string;
  email: string;
  passwordHash: string;
};

export type CreateAccountResult = {
  ok: boolean;
  error?: string;
};

export async function createAccountAction({ name, email, passwordHash }: CreateAccountInput): Promise<CreateAccountResult> {
  try {
    const existing = await fetchConvexUserByEmail(email);
    if (existing) {
      return { ok: false, error: 'A user with this email already exists.' };
    }
    await setConvexUserPasswordHash(email, passwordHash);
    if (name?.trim()) {
      await upsertConvexUserProfile(email, { name: name.trim() });
    }
    return { ok: true };
  } catch (error: unknown) {
    const message = (error instanceof Error ? error.message : 'Failed to create account') || 'Failed to create account';
    if (message.includes('user_exists')) {
      return { ok: false, error: 'A user with this email already exists.' };
    }
    return { ok: false, error: message };
  }
}
