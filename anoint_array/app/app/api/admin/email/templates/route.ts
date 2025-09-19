import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import fs from 'fs/promises';
import path from 'path';
import { getDefaultTemplates } from '@/lib/email';

const TPL_PATH = path.join(process.cwd(), 'data', 'email-templates.json');

async function ensureDir() {
  const dir = path.join(process.cwd(), 'data');
  try { await fs.access(dir); } catch { await fs.mkdir(dir, { recursive: true }); }
}

export async function GET() {
  try {
    await ensureDir();
    try {
      const raw = await fs.readFile(TPL_PATH, 'utf-8');
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json(getDefaultTemplates());
    }
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const payload = await request.json();
  await ensureDir();
  await fs.writeFile(TPL_PATH, JSON.stringify(payload, null, 2));
  return NextResponse.json({ success: true });
}
