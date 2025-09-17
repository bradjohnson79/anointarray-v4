import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getConfig } from '@/lib/app-config';
import { renderSealPNGBuffer } from '@/lib/seal-renderer-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadSettings() {
  try {
    const p = path.join(process.cwd(), 'generator-data', 'generator-config.json');
    const raw = await fs.readFile(p, 'utf-8');
    const cfg = JSON.parse(raw);
    return cfg?.settings || {};
  } catch {
    return { centerX: 0, centerY: 0, centralRadius: 80, innerRadius: 140, middleRadius: 200, outerRadius: 260, canvasSize: 600 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { filename, seal, size = 1200 } = await req.json();
    let data: any = null;
    if (seal && typeof seal === 'object') {
      data = seal;
    } else if (typeof filename === 'string' && filename) {
      const cfg = await getConfig<any>('generator-config');
      const baseTmp = path.join(process.env.WRITABLE_DIR || cfg?.system?.writableDir || '/tmp', 'generated-seals');
      const baseData = path.join(process.cwd(), 'data', 'generated-seals');
      const rel = filename.replace(/^\/+/, '');
      const fullCandidates = [path.join(baseTmp, rel), path.join(baseData, rel)];
      let full: string | null = null;
      for (const p of fullCandidates) {
        try { await fs.access(p); full = p; break; } catch {}
      }
      if (!full) return NextResponse.json({ error: 'Seal JSON not found' }, { status: 404 });
      const raw = await fs.readFile(full, 'utf-8');
      data = JSON.parse(raw);
    }
    if (!data) return NextResponse.json({ error: 'Missing seal data or filename' }, { status: 400 });

    const settings = await loadSettings();
    const png = await renderSealPNGBuffer({
      centralDesign: data.centralDesign,
      ring1Tokens: data.ring1Tokens || [],
      ring2Tokens: data.ring2Tokens || [],
      ring3Affirmation: data.ring3Affirmation || ''
    }, settings, Number(size) || 1200);
    return new NextResponse(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Export error:', e);
    return NextResponse.json({ error: 'Failed to export seal' }, { status: 500 });
  }
}

