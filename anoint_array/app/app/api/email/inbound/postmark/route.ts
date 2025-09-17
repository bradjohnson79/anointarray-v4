import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const dir = path.join(process.cwd(), 'data', 'inbox');
    await fs.mkdir(dir, { recursive: true });
    const id = payload?.MessageID || `msg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(payload, null, 2), 'utf8');
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: 'POST Postmark inbound JSON here. Configure Postmark Inbound Hook to this route.' });
}

