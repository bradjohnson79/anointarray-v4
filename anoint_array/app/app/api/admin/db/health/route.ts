import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';
import { getBucketConfig, createS3Client } from '@/lib/aws-config';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createSupabaseServerClient, PRODUCT_IMAGES_BUCKET, CONFIGS_BUCKET, GLYPHS_BUCKET } from '@/lib/supabase-server';

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
  const supa = (()=>{ try { return createSupabaseServerClient(); } catch { return null; }})();
  const s3 = createS3Client();
  async function countS3(prefix: string): Promise<number|null> {
    try {
      const out = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix }));
      return (out.Contents || []).length;
    } catch {
      return null;
    }
  }
  async function countSupabase(bucket: string, prefix = ''): Promise<number|null> {
    if (!supa) return null;
    try {
      // Flat listing; good approximation for counts
      const r = await supa.storage.from(bucket).list(prefix || '', { limit: 1000, offset: 0 });
      if (r.error) return null;
      return (r.data || []).length;
    } catch { return null; }
  }

  // Migration toggles + S3 mirror status for key buckets
  const mirrors: any[] = [];
  const sProducts = await countSupabase(PRODUCT_IMAGES_BUCKET).catch(()=>null);
  const sConfigs = await countSupabase(CONFIGS_BUCKET, 'configs').catch(()=>null);
  const sGlyphs = await countSupabase(GLYPHS_BUCKET).catch(()=>null);
  const s3Products = await countS3(folderPrefix || 'products/');
  const s3Configs = await countS3('configs/');
  const s3Glyphs = await countS3('glyphs/');
  mirrors.push({ key: 'products', supabaseBucket: PRODUCT_IMAGES_BUCKET, supabaseCount: sProducts, s3Prefix: (folderPrefix || 'products/'), s3Count: s3Products, ok: (sProducts==null||s3Products==null) ? null : (s3Products >= sProducts) });
  mirrors.push({ key: 'configs', supabaseBucket: CONFIGS_BUCKET, supabaseCount: sConfigs, s3Prefix: 'configs/', s3Count: s3Configs, ok: (sConfigs==null||s3Configs==null) ? null : (s3Configs >= sConfigs) });
  mirrors.push({ key: 'glyphs', supabaseBucket: GLYPHS_BUCKET, supabaseCount: sGlyphs, s3Prefix: 'glyphs/', s3Count: s3Glyphs, ok: (sGlyphs==null||s3Glyphs==null) ? null : (s3Glyphs >= sGlyphs) });

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
