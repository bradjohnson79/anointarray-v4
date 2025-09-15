import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { getConfig } from '@/lib/app-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function fileOk(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

export async function GET() {
  try {
    // Resolve writable directory: env → generator-config.system.writableDir → /tmp
    const genCfg = await getConfig<any>('generator-config');
    const writableDir = process.env.WRITABLE_DIR || genCfg?.system?.writableDir || '/tmp';

    // AI config presence
    const aiPath = path.join(process.cwd(), 'data', 'ai-config.json');
    let aiPresent = false; let aiConfigured = false;
    try {
      const raw = await fs.readFile(aiPath, 'utf-8');
      const j = JSON.parse(raw || '{}');
      aiPresent = true; aiConfigured = !!(j?.isConfigured && j?.openAiApiKey);
    } catch {}

    // Templates/glyphs
    const templates = [
      path.join(process.cwd(), 'data', 'ai-resources', 'templates', 'flower-of-life.png'),
      path.join(process.cwd(), 'data', 'ai-resources', 'templates', 'sri-yantra.png'),
      path.join(process.cwd(), 'data', 'ai-resources', 'templates', 'torus-field.png'),
    ];
    const glyphSamples = [
      path.join(process.cwd(), 'public', 'glyphs', 'om.png'),
      path.join(process.cwd(), 'public', 'glyphs', 'ward.png'),
    ];
    const templatesOk = await Promise.all(templates.map(fileOk));
    const glyphsOk = await Promise.all(glyphSamples.map(fileOk));

    // Writable test
    let canWrite = false; let writeError: string | null = null;
    try {
      const testDir = path.join(writableDir, 'health-check');
      await fs.mkdir(testDir, { recursive: true });
      const f = path.join(testDir, `probe_${Date.now()}.txt`);
      await fs.writeFile(f, 'ok');
      canWrite = existsSync(f);
      await fs.rm(f).catch(() => {});
    } catch (e: any) {
      writeError = String(e?.message || e);
    }

    const out = {
      ok: aiConfigured && templatesOk.every(Boolean) && glyphsOk.every(Boolean) && canWrite,
      ai: { present: aiPresent, configured: aiConfigured, path: aiPath },
      templates: { ok: templatesOk.every(Boolean), files: templates.map((p, i) => ({ file: p, ok: !!templatesOk[i] })) },
      glyphs: { ok: glyphsOk.every(Boolean), files: glyphSamples.map((p, i) => ({ file: p, ok: !!glyphsOk[i] })) },
      writable: { dir: writableDir, canWrite, error: writeError },
    };
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

