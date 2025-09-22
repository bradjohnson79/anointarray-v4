import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { callConvex } from '@/lib/convexHttp';
import { getBucketConfig } from '@/lib/aws-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }); }
  const details: any = {};
  let ok = true;

  // Convex status
  const convexReady = !!(process.env.CONVEX_URL && (process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN));
  details.convex = { url: process.env.CONVEX_URL || null, adminKey: !!process.env.CONVEX_ADMIN_KEY, teamToken: !!process.env.CONVEX_TEAM_ACCESS_TOKEN, ready: convexReady };
  if (convexReady) {
    try {
      const list = await callConvex({ functionPath: 'products:list', args: {} });
      const items = Array.isArray(list) ? list : (Array.isArray((list as any)?.result) ? (list as any).result : []);
      details.convex.products = { count: items.length, sample: items.slice(0, 3) };
    } catch (e: any) {
      details.convex.error = e?.message || String(e);
      ok = false;
    }
  } else {
    ok = false;
  }

  // S3 status
  const { bucketName, folderPrefix } = getBucketConfig();
  details.s3 = {
    bucketName,
    folderPrefix,
    region: process.env.AWS_REGION || 'us-east-1',
    accessKey: !!process.env.AWS_ACCESS_KEY_ID,
  };

  // Migration toggles
  details.migration = {
    autoMigrate: process.env.AUTO_MIGRATE_CONVEX === '1',
    migrationToken: !!process.env.MIGRATION_TOKEN,
  };

  // Legacy Supabase envs (so we can remove after cutover)
  details.supabase = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
  };

  return NextResponse.json({ ok, details });
}

