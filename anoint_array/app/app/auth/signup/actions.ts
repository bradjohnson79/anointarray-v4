'use server';

import { createConvexUserAccount } from '@/lib/convexUsers';

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
    await createConvexUserAccount({ email, name, passwordHash });
    return { ok: true };
  } catch (error: unknown) {
    const message = (error instanceof Error ? error.message : 'Failed to create account') || 'Failed to create account';
    if (message.includes('user_exists')) {
      return { ok: false, error: 'A user with this email already exists.' };
    }
    return { ok: false, error: message };
  }
}
