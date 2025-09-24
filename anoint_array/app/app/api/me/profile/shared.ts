import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fetchConvexUserByEmail } from '@/lib/convexUsers';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

function buildProfilePayload(user: { id: string; email: string | null; role?: string | null }, record: any | null, diag: boolean) {
  const payload: Record<string, unknown> = {
    id: String(user.id || record?._id || ''),
    email: record?.email ?? user.email,
    role: record?.role ?? user.role ?? 'USER',
    name: record?.name ?? null,
    isActive: record?.isActive,
    phone: record?.phone ?? null,
    address: record?.address ?? null,
    address2: record?.address2 ?? null,
    city: record?.city ?? null,
    state: record?.state ?? null,
    zip: record?.zip ?? null,
    country: record?.country ?? null,
  };

  if (diag) {
    payload.diag = {
      sessionEmail: user.email,
      rowEmail: record?.email ?? null,
      matchedBy: 'email',
    };
  }

  return payload;
}

export async function handleProfileGet(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const diag = url.searchParams.get('diag') === '1';
    const user = await requireUser(req);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const record = await fetchConvexUserByEmail(user.email);
    if (!record) {
      return NextResponse.json(buildProfilePayload(user, null, diag));
    }

    return NextResponse.json(buildProfilePayload(user, record, diag));
  } catch (error: any) {
    const message = error?.message || 'Failed to load profile';
    const status = /unauthorized/i.test(message) ? 401 : /forbidden/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function handleProfilePatch(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const convexReady = !!(process.env.CONVEX_URL && (process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN));
    const body = await req.json().catch(() => ({}));

    const ALLOWED_KEYS = ['name'] as const;
    type AllowedKey = (typeof ALLOWED_KEYS)[number];
    const safeData = Object.fromEntries(
      Object.entries(body || {}).filter(([k]) => (ALLOWED_KEYS as readonly string[]).includes(k))
    ) as Partial<Record<AllowedKey, string>>;

    const name = typeof safeData?.name === 'string' ? safeData.name.trim() : undefined;
    if (!name) {
      return NextResponse.json({ ok: true, note: 'No changes' });
    }

    if (convexReady) {
      const emailForConvex = user.email.toLowerCase();
      try {
        const out = await runConvex('users:updateByEmail', { email: emailForConvex, name });
        return NextResponse.json({ ok: true, provider: 'convex', result: out });
      } catch (cliError) {
        try {
          const out = await callConvex({ functionPath: 'users:updateByEmail', args: { email: emailForConvex, name } });
          return NextResponse.json({ ok: true, provider: 'convex-http', result: out });
        } catch (httpError: any) {
          return NextResponse.json({ error: httpError?.message || 'Convex update failed', provider: 'convex-http' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = error?.message || 'Failed to update profile';
    const status = /unauthorized/i.test(message) ? 401 : /forbidden/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
