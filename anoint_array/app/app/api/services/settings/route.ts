import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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
    if (!fsSync.existsSync(FILE)) return DEFAULTS;
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      basic: { price: Number(parsed?.basic?.price ?? DEFAULTS.basic.price), description: String(parsed?.basic?.description ?? DEFAULTS.basic.description) },
      full: { price: Number(parsed?.full?.price ?? DEFAULTS.full.price), description: String(parsed?.full?.description ?? DEFAULTS.full.description) },
      environmental: { price: Number(parsed?.environmental?.price ?? DEFAULTS.environmental.price), description: String(parsed?.environmental?.description ?? DEFAULTS.environmental.description) },
    };
  } catch {
    return DEFAULTS;
  }
}

export async function GET() {
  const data = await readSettings();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(clean, null, 2), 'utf8');
    return NextResponse.json({ ok: true, saved: clean });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save' }, { status: 500 });
  }
}

