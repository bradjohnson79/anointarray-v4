import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = getServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Logout failed' }, { status: 500 });
  }
}

