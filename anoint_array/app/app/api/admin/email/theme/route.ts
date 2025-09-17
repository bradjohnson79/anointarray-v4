import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const FILE = path.join(process.cwd(), 'data', 'email-theme.html');

async function readTheme(): Promise<string> {
  try { if (fsSync.existsSync(FILE)) return await fs.readFile(FILE, 'utf8'); } catch {}
  try {
    const { createSupabaseServerClient, useSupabaseStorage } = await import('@/lib/supabase-server');
    if (useSupabaseStorage()) {
      const supabase = createSupabaseServerClient();
      const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';
      const { data, error } = await supabase.storage.from(bucket).download('configs/email-theme.html');
      if (!error && data) {
        if (typeof (data as any).text === 'function') return await (data as any).text();
        const ab = await (data as any).arrayBuffer();
        return Buffer.from(ab).toString('utf8');
      }
    }
  } catch {}
  return '<div>{{content}}</div>';
}

export async function GET() { return NextResponse.json({ html: await readTheme() }); }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { html } = await req.json();
    if (!html || typeof html !== 'string') return NextResponse.json({ error: 'Missing html' }, { status: 400 });
    try {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, html, 'utf8');
      return NextResponse.json({ ok: true, storage: 'file' });
    } catch (e: any) {
      const { createSupabaseServerClient, useSupabaseStorage } = await import('@/lib/supabase-server');
      if (!useSupabaseStorage()) throw e;
      const supabase = createSupabaseServerClient();
      const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';
      const blob = new Blob([html], { type: 'text/html' });
      const { error } = await supabase.storage.from(bucket).upload('configs/email-theme.html', blob, { upsert: true, contentType: 'text/html' });
      if (error) throw error;
      return NextResponse.json({ ok: true, storage: 'supabase' });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save theme' }, { status: 500 });
  }
}

