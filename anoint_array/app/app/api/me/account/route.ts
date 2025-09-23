import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const diag = url.searchParams.get('diag') === '1';
    const user = await getAuthUserFromRequest();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    let row: any = null;
    if (user.email) {
      try { row = await runConvex('users:byEmail', { email: String(user.email).toLowerCase() }); }
      catch { row = await callConvex({ functionPath: 'users:byEmail', args: { email: String(user.email).toLowerCase() } }); }
    }
    if (!row) return NextResponse.json({ id: user.id, email: user.email, role: 'USER' });
    const payload: any = {
      id: user.id,
      email: (row as any).email,
      role: (row as any).role,
      name: (row as any).name || null,
      isActive: (row as any).isActive,
      phone: (row as any).phone || null,
      address: (row as any).address || null,
      address2: (row as any).address2 || null,
      city: (row as any).city || null,
      state: (row as any).state || null,
      zip: (row as any).zip || null,
      country: (row as any).country || null,
    };
    if (diag) {
      payload.diag = {
        serviceKeyPresent: false,
        sessionEmail: (user.email || null),
        rowEmail: (row as any).email || null,
        matchedBy: 'email',
      };
    }
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load account' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    // If Convex is configured, use it for profile updates
    const convexReady = !!(process.env.CONVEX_URL && (process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN));
    const url = new URL(req.url);
    const diag = url.searchParams.get('diag') === '1';
    const user = await getAuthUserFromRequest();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(()=>({}));

    // Strict for stability: allow only guaranteed columns for now
    const ALLOWED_KEYS = ['name'] as const;
    type AllowedKey = (typeof ALLOWED_KEYS)[number];
    const safeData = Object.fromEntries(
      Object.entries(body || {}).filter(([k]) => (ALLOWED_KEYS as readonly string[]).includes(k))
    ) as Partial<Record<AllowedKey, string>>;

    const name = typeof safeData?.name === 'string' ? safeData.name.trim() : undefined;
    if (!name) {
      // No allowed fields were provided/changed; treat as a no‑op success
      return NextResponse.json({ ok: true, note: 'No changes' });
    }

    // If Convex available, do minimal upsert by email+name and return
    if (convexReady) {
      try {
        const emailForConvex = (user.email || '').toLowerCase();
        const out = await runConvex('users:updateByEmail', { email: emailForConvex, name });
        return NextResponse.json({ ok: true, provider: 'convex', result: out });
      } catch (e:any) {
        return NextResponse.json({ error: e?.message || 'Convex update failed', provider: 'convex' }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update account' }, { status: 500 });
  }
}
