import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { callConvex } from '@/lib/convexHttp';

export async function POST() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email not available' }, { status: 400 });
  }

  try {
    await callConvex({
      functionPath: 'users:upsertByEmail',
      args: { email, name: user?.fullName ?? null },
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to onboard user' },
      { status: 500 }
    );
  }
}
