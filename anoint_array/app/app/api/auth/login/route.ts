import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signSession, setSessionCookie } from '@/lib/jwt-auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const lower = String(email || '').toLowerCase();
    if (!lower || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    let user: any;
    try { user = await callConvex({ functionPath: 'users:byEmail', args: { email: lower } }); }
    catch { user = await runConvex('users:byEmail', { email: lower }); }
    // Bootstrap default admin if not exists
    if (!user && lower === 'info@anoint.me') {
      const hash = await bcrypt.hash('Admin123', 10);
      try { await callConvex({ functionPath: 'users:setPasswordHash', args: { email: lower, passwordHash: hash } }); }
      catch { await runConvex('users:setPasswordHash', { email: lower, passwordHash: hash }); }
      try { user = await callConvex({ functionPath: 'users:byEmail', args: { email: lower } }); } catch { user = await runConvex('users:byEmail', { email: lower }); }
    }
    if (!user || !user.passwordHash) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const ok = await bcrypt.compare(String(password), String(user.passwordHash));
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const token = signSession({ email: lower });
    setSessionCookie(token);
    return NextResponse.json({ ok: true, email: lower, role: user.role || 'USER' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Login failed' }, { status: 500 });
  }
}
