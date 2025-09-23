import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';
import { getBucketConfig, createS3Client } from '@/lib/aws-config';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
// Supabase removed

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
      // Prefer Convex CLI per policy; on serverless (e.g., Vercel) fall back to HTTP client
      let list: any;
      try {
        // Some serverless providers don't allow npx to write to $HOME. This may throw (ENOENT).
        list = await runConvex<any>('products:list', {});
      } catch (cliErr: any) {
        // Fallback strictly for health check only
        const http = await callConvex({ functionPath: 'products:list', args: {} });
        list = http;
        // Attach the CLI error so it’s visible for diagnostics
        details.convex.cliError = (cliErr?.message || String(cliErr)).slice(0, 600);
      }
      const items = Array.isArray(list) ? list : (Array.isArray((list as any)?.result) ? (list as any).result : []);
      details.convex.products = { count: items.length, sample: items.slice(0, 3) };
      try {
        let totals: any;
        try {
          totals = await runConvex<any>('stats:totals', {});
        } catch {
          totals = await callConvex({ functionPath: 'stats:totals', args: {} });
        }
        details.convex.totals = totals;
      } catch {}
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

  // Migration toggles + storage migration snapshot
  const supa = null;
  const s3 = createS3Client();
  async function countS3(prefix: string): Promise<number|null> {
    try {
      const out = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix }));
      return (out.Contents || []).length;
    } catch {
      return null;
    }
  }
  async function countSupabase(_bucket: string, _prefix = ''): Promise<number|null> { return null; }

  // Migration toggles + S3 mirror status for key buckets
  const mirrors: any[] = [];
  const sProducts = null;
  const sConfigs = null;
  const sGlyphs = null;
  const s3Products = await countS3(folderPrefix || 'products/');
  const s3Configs = await countS3('configs/');
  const s3Glyphs = await countS3('glyphs/');
  mirrors.push({ key: 'products', supabaseBucket: null as any, supabaseCount: sProducts, s3Prefix: (folderPrefix || 'products/'), s3Count: s3Products, ok: s3Products!=null });
  mirrors.push({ key: 'configs', supabaseBucket: null as any, supabaseCount: sConfigs, s3Prefix: 'configs/', s3Count: s3Configs, ok: s3Configs!=null });
  mirrors.push({ key: 'glyphs', supabaseBucket: null as any, supabaseCount: sGlyphs, s3Prefix: 'glyphs/', s3Count: s3Glyphs, ok: s3Glyphs!=null });

  details.migration = {
    autoMigrate: process.env.AUTO_MIGRATE_CONVEX === '1',
    migrationToken: !!process.env.MIGRATION_TOKEN,
    s3: {
      configured: !!process.env.AWS_ACCESS_KEY_ID,
      bucket: bucketName,
      mirrors,
    }
  };

  // Legacy Supabase envs (so we can remove after cutover)
  details.supabase = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
  };

  return NextResponse.json({ ok, details });
}
