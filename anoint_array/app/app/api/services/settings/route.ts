import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createSupabaseServerClient, useSupabaseStorage, PRODUCT_IMAGES_BUCKET } from '@/lib/supabase-server';
import { createS3Client, getBucketConfig } from '@/lib/aws-config';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/lib/auth';

type ServiceKey = 'basic' | 'full' | 'environmental';
type ServiceSettings = Record<ServiceKey, { price: number; description: string }>;

const FILE = path.join(process.cwd(), 'data', 'service-settings.json');

const DEFAULTS: ServiceSettings = {
  basic: { price: 35, description: 'Scalar and Transcendental Frequencies for personal and environmental rejuvenation.' },
  full: { price: 98, description: 'Scan of major organs and subtle bodies + imbuing of up to 3 items.' },
  environmental: { price: 143, description: 'Full Body Scan + environmental imbuing of an entire room.' },
};

async function readSettings(): Promise<ServiceSettings> {
  try {
    // Prefer S3 configs when available
    try {
      const s3 = createS3Client();
      const { bucketName } = getBucketConfig();
      const key = 'configs/service-settings.json';
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
      const text = await (obj.Body as any).transformToString();
      const parsed = JSON.parse(text || '{}');
      return {
        basic: { price: Number(parsed?.basic?.price ?? DEFAULTS.basic.price), description: String(parsed?.basic?.description ?? DEFAULTS.basic.description) },
        full: { price: Number(parsed?.full?.price ?? DEFAULTS.full.price), description: String(parsed?.full?.description ?? DEFAULTS.full.description) },
        environmental: { price: Number(parsed?.environmental?.price ?? DEFAULTS.environmental.price), description: String(parsed?.environmental?.description ?? DEFAULTS.environmental.description) },
      };
    } catch {}
    if (!fsSync.existsSync(FILE)) return DEFAULTS;
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      basic: { price: Number(parsed?.basic?.price ?? DEFAULTS.basic.price), description: String(parsed?.basic?.description ?? DEFAULTS.basic.description) },
      full: { price: Number(parsed?.full?.price ?? DEFAULTS.full.price), description: String(parsed?.full?.description ?? DEFAULTS.full.description) },
      environmental: { price: Number(parsed?.environmental?.price ?? DEFAULTS.environmental.price), description: String(parsed?.environmental?.description ?? DEFAULTS.environmental.description) },
    };
  } catch {
    // Try Supabase Storage fallback
    try {
      if (useSupabaseStorage()) {
        const supabase = createSupabaseServerClient();
        const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs' || PRODUCT_IMAGES_BUCKET || 'Storage';
        const { data, error } = await supabase.storage.from(bucket).download('configs/service-settings.json');
        if (!error && data) {
          let text: string = '';
          if (typeof (data as any).text === 'function') text = await (data as any).text();
          else if (typeof (data as any).arrayBuffer === 'function') {
            const buf = Buffer.from(await (data as any).arrayBuffer()); text = buf.toString('utf8');
          }
          const parsed = JSON.parse(text || '{}');
          return {
            basic: { price: Number(parsed?.basic?.price ?? DEFAULTS.basic.price), description: String(parsed?.basic?.description ?? DEFAULTS.basic.description) },
            full: { price: Number(parsed?.full?.price ?? DEFAULTS.full.price), description: String(parsed?.full?.description ?? DEFAULTS.full.description) },
            environmental: { price: Number(parsed?.environmental?.price ?? DEFAULTS.environmental.price), description: String(parsed?.environmental?.description ?? DEFAULTS.environmental.description) },
          };
        }
      }
    } catch {}
    return DEFAULTS;
  }
}

export async function GET() {
  const data = await readSettings();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const body = await req.json();
    const incoming: ServiceSettings = {
      basic: { price: Number(body?.basic?.price), description: String(body?.basic?.description || '') },
      full: { price: Number(body?.full?.price), description: String(body?.full?.description || '') },
      environmental: { price: Number(body?.environmental?.price), description: String(body?.environmental?.description || '') },
    };
    const clean: ServiceSettings = {
      basic: { price: isFinite(incoming.basic.price) ? incoming.basic.price : DEFAULTS.basic.price, description: incoming.basic.description || DEFAULTS.basic.description },
      full: { price: isFinite(incoming.full.price) ? incoming.full.price : DEFAULTS.full.price, description: incoming.full.description || DEFAULTS.full.description },
      environmental: { price: isFinite(incoming.environmental.price) ? incoming.environmental.price : DEFAULTS.environmental.price, description: incoming.environmental.description || DEFAULTS.environmental.description },
    };
    // Prefer S3; fallback to local file; finally Supabase
    try {
      const s3 = createS3Client();
      const { bucketName } = getBucketConfig();
      const key = 'configs/service-settings.json';
      const body = Buffer.from(JSON.stringify(clean, null, 2));
      await s3.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: body, ContentType: 'application/json', ACL: 'private' as any }));
      return NextResponse.json({ ok: true, saved: clean, storage: 's3' });
    } catch (e: any) {
      try {
        await fs.mkdir(path.dirname(FILE), { recursive: true });
        await fs.writeFile(FILE, JSON.stringify(clean, null, 2), 'utf8');
        return NextResponse.json({ ok: true, saved: clean, storage: 'file' });
      } catch (fe: any) {
        try {
          if (!useSupabaseStorage()) throw new Error('Supabase storage not configured');
          const supabase = createSupabaseServerClient();
          const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs' || PRODUCT_IMAGES_BUCKET || 'Storage';
          const blob = new Blob([JSON.stringify(clean)], { type: 'application/json' });
          const { error } = await supabase.storage.from(bucket).upload('configs/service-settings.json', blob, { upsert: true, contentType: 'application/json' });
          if (error) throw error;
          return NextResponse.json({ ok: true, saved: clean, storage: 'supabase' });
        } catch (be: any) {
          return NextResponse.json({ error: be?.message || fe?.message || e?.message || 'Failed to save' }, { status: 500 });
        }
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save' }, { status: 500 });
  }
}
