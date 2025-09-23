import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth';

const FILE = path.join(process.cwd(), 'data', 'email-theme.html');

async function readTheme(): Promise<string> {
  try { if (fsSync.existsSync(FILE)) return await fs.readFile(FILE, 'utf8'); } catch {}
  // Supabase removed; fallback to default
  return '<div>{{content}}</div>';
}

export async function GET() { return NextResponse.json({ html: await readTheme() }); }

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const { html } = await req.json();
    if (!html || typeof html !== 'string') return NextResponse.json({ error: 'Missing html' }, { status: 400 });
    try {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, html, 'utf8');
      return NextResponse.json({ ok: true, storage: 'file' });
    } catch (e: any) { throw e; }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save theme' }, { status: 500 });
  }
}
