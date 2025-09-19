import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || typeof token !== 'string') return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const s = createSupabaseAdminClient();
    const { data: record } = await s.from('verificationtokens').select('*').eq('token', token).maybeSingle();
    if (!record || (record.expires && record.expires < new Date())) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const { data: user } = await s.from('users').select('id, email').eq('email', (record as any).identifier.toLowerCase()).maybeSingle();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const hash = await bcrypt.hash(password, 10);
    await s.from('users').update({ password: hash }).eq('id', (user as any).id);
    await s.from('verificationtokens').delete().eq('identifier', (record as any).identifier);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Reset password error:', e);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
