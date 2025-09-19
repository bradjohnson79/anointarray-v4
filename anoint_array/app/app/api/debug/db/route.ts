import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/api-handler';
import { HttpError } from '@/lib/http-errors';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

async function handler(_req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    // Probe by counting a known table; prefer 'users', fallback to 'products'
    let ok = false;
    let table = 'users';
    let count: number | null = null;
    let errMsg: string | undefined;
    let res = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (res.error) {
      table = 'products';
      const res2 = await supabase.from('products').select('*', { count: 'exact', head: true });
      if (res2.error) {
        errMsg = res2.error.message;
      } else {
        ok = true;
        count = res2.count ?? null;
      }
    } else {
      ok = true;
      count = res.count ?? null;
    }
    if (!ok) throw new Error(errMsg || 'Supabase probe failed');
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const usingServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    return NextResponse.json({ ok: true, table, count, url, usingServiceKey });
  } catch (e: any) {
    const msg = String(e?.message || e || 'DB probe failed');
    const policy = {
      hasUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnon: !!process.env.SUPABASE_ANON_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    throw new HttpError(500, `${msg}\nPolicy: ${JSON.stringify(policy)}`, 'DB_PROBE_FAILED');
  }
}

export const GET = withApiErrorHandling(handler, '/api/debug/db');
