import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

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

function colorHex(name: string): string {
  const map: Record<string, string> = {
    WHITE: '#FFFFFF', RED: '#DC2626', ORANGE: '#EA580C', YELLOW: '#EAB308', GREEN: '#16A34A',
    AQUA: '#06B6D4', BLUE: '#2563EB', INDIGO: '#4F46E5', PURPLE: '#9333EA', VIOLET: '#7C3AED',
    GOLD: '#F59E0B', SILVER: '#9CA3AF', GRAY: '#6B7280', TURQUOISE: '#40E0D0', TEAL: '#008080',
    CYAN: '#00FFFF', MAGENTA: '#FF00FF', AMBER: '#FFBF00'
  };
  return map[name?.toUpperCase?.() || ''] || '#FFFFFF';
}

async function readIfExists(p: string): Promise<Buffer | null> {
  try { await fs.access(p); return await fs.readFile(p); } catch { return null; }
}

async function loadTemplateDataUri(centralDesign: string): Promise<string | null> {
  const fileCandidates = [
    path.join(process.cwd(), 'data', 'ai-resources', 'templates', `${centralDesign}.png`),
    path.join(process.cwd(), 'public', 'templates', `${centralDesign}-template.png`),
    path.join(process.cwd(), 'app', 'public', 'templates', `${centralDesign}-template.png`),
  ];
  for (const f of fileCandidates) {
    const buf = await readIfExists(f);
    if (buf) return `data:image/png;base64,${buf.toString('base64')}`;
  }
  return null;
}

async function loadGlyphDataUri(filename: string): Promise<string | null> {
  const fileCandidates = [
    path.join(process.cwd(), 'public', 'glyphs', filename),
    path.join(process.cwd(), 'app', 'public', 'glyphs', filename),
    path.join(process.cwd(), 'data', 'ai-resources', 'glyphs', filename),
    path.join(process.cwd(), 'uploads', 'glyphs', filename),
  ];
  for (const f of fileCandidates) {
    const buf = await readIfExists(f);
    if (buf) {
      const ext = path.extname(filename).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  }
  return null;
}

async function buildSealSVG(seal: any, settings: any, size = 1200): Promise<string> {
  const centerX = size / 2;
  const centerY = size / 2;
  const baseCanvas = settings?.canvasSize || 600;
  const k = size / baseCanvas;
  const r1 = Math.round((settings?.innerRadius ?? 140) * k);
  const r2 = Math.round((settings?.middleRadius ?? 200) * k);
  let r3 = Math.round((settings?.outerRadius ?? 260) * k);
  const cR = Math.round(((settings?.centralRadius ?? 80)) * k);
  const goldW = Math.max(12, Math.round(22 * (size / 1200)));
  const goldOffset = Math.max(12, Math.round(22 * (size / 1200)));
  const maxAllowed = size / 2 - 2;
  if (r3 + goldOffset + goldW / 2 > maxAllowed) r3 = Math.max(60, Math.round(maxAllowed - (goldOffset + goldW / 2)));
  // Pull the affirmation path slightly inward for better legibility near the gold ring
  const textInset = Math.max(8, Math.round(12 * (size / 1200))); // ~12px at 1200
  const textRadius = r3 - textInset;
  const goldRadius = r3 + goldOffset;
  const tokenR = Math.max(12, Math.round(22.5 * (size / 1200)));
  const ring1CircleR = Math.max(12, Math.round(22.5 * (size / 1200) + 3 * (size / 1200))); // +3px radius at 1200
  // Make ring 2 color circles ~5px larger in diameter (=> +2.5px radius at 1200)
  const ring2CircleR = Math.max(14, Math.round((24 + 2.5) * (size / 1200)));
  const glyphBox = Math.max(32, Math.round(50 * (size / 1200)));

  const tmplUri = await loadTemplateDataUri(seal.centralDesign);
  const glyphUris: Record<string, string> = {};
  for (const t of (seal.ring2Tokens || [])) {
    const key = String(t.content || '');
    if (key && !glyphUris[key]) {
      const u = await loadGlyphDataUri(key);
      if (u) glyphUris[key] = u;
    }
  }

  const tokenCircle = (angle: number, radius: number) => {
    const a = (angle - 90) * Math.PI / 180;
    return { x: centerX + Math.cos(a) * radius, y: centerY + Math.sin(a) * radius };
  };

  const rings = `
    <circle cx="${centerX}" cy="${centerY}" r="${r1}" fill="none" stroke="#000" stroke-width="${Math.max(1, Math.round(size/384))}" />
    <circle cx="${centerX}" cy="${centerY}" r="${r2}" fill="none" stroke="#000" stroke-width="${Math.max(1, Math.round(size/384))}" />
    <!-- Ring 3 line omitted; only circular text shows -->
    <circle cx="${centerX}" cy="${centerY}" r="${goldRadius}" fill="none" stroke="#D4AF37" stroke-width="${goldW}" />`;

  const central = tmplUri ? `
    <defs><clipPath id="centralClip"><circle cx="${centerX}" cy="${centerY}" r="${cR}" /></clipPath></defs>
    <image href="${tmplUri}" x="${centerX - cR}" y="${centerY - cR}" width="${cR*2}" height="${cR*2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#centralClip)" />` : '';

  const ring1 = (seal.ring1Tokens || []).map((t: any) => {
    const { x, y } = tokenCircle(t.angle, r1);
    const fill = colorHex(t.color);
    const numFill = '#FFFFFF';
    return `<g>
      <circle cx="${x}" cy="${y}" r="${ring1CircleR}" fill="${fill}" stroke="#000" stroke-width="${Math.max(1, Math.round(size/384))}" />
      <text x="${x}" y="${y + Math.round(ring1CircleR*0.35)}" text-anchor="middle" font-size="${Math.max(18, Math.round(12 * 2.5 * (size/1200)))}" font-weight="900" fill="${numFill}" stroke="#000" stroke-width="${Math.max(0.5, (size/1200)*0.7)}" style="paint-order: stroke fill">${t.content}</text>
    </g>`;
  }).join('\n');

  const ring2 = (seal.ring2Tokens || []).map((t: any) => {
    const { x, y } = tokenCircle(t.angle, r2);
    const fill = colorHex(t.color);
    const href = glyphUris[String(t.content || '')];
    const gx = x - glyphBox/2; const gy = y - glyphBox/2;
    return `<g>
      <circle cx="${x}" cy="${y}" r="${ring2CircleR}" fill="${fill}" stroke="#000" stroke-width="${Math.max(1, Math.round(size/384))}" />
      ${href ? `<image href="${href}" x="${gx}" y="${gy}" width="${glyphBox}" height="${glyphBox}" preserveAspectRatio="xMidYMid meet" />` : ''}
    </g>`;
  }).join('\n');

  const phraseRaw = String(seal.ring3Affirmation || 'OM NAMAH SHIVAYA');
  const phrase = phraseRaw.replace(/^\s*(?:gayatri:?)\s*/i, '').toUpperCase();
  const display = ` ${phrase} •`;
  const circumference = 2 * Math.PI * textRadius;
  // Match preview: slightly larger and bolder text
  const measureCoeff = 0.58; // char width factor
  let fs = Math.max(16, Math.round(22 * (size/1200)));
  const fsMin = Math.max(14, Math.round(14 * (size/1200)));
  const fsMax = Math.max(30, Math.round(30 * (size/1200)));
  const width = (n:number)=> display.length * measureCoeff * n;
  while (width(fs) > circumference * 0.995 && fs > fsMin) fs -= 1;
  while (width(fs+1) < circumference * 0.985 && fs < fsMax) fs += 1;
  const text = `
    <defs><path id="textPath" d="M ${centerX},${centerY} m -${textRadius},0 a ${textRadius},${textRadius} 0 1,1 ${textRadius*2},0 a ${textRadius},${textRadius} 0 1,1 -${textRadius*2},0" /></defs>
    <text font-size="${fs}" fill="#000000" font-family="'Times New Roman', Georgia, serif" font-weight="900" text-anchor="middle">
      <textPath href="#textPath" startOffset="50%" lengthAdjust="spacing" textLength="${Math.round(circumference*0.995)}">${display}</textPath>
    </text>`;

  const innerWhiteR = Math.max(1, Math.round(goldRadius - goldW/2 - 1));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs></defs>
  <g>
    <circle cx="${centerX}" cy="${centerY}" r="${innerWhiteR}" fill="#ffffff" />
    ${rings}
    ${central}
    ${ring1}
    ${ring2}
    ${text}
  </g>
</svg>`;
}

export async function POST(req: NextRequest) {
  try {
    const { filename, seal, size = 1200 } = await req.json();
    let data: any = null;
    if (seal && typeof seal === 'object') data = seal;
    else if (typeof filename === 'string' && filename) {
      const base = path.join(process.cwd(), 'data', 'generated-seals');
      const full = path.join(base, filename.replace(/^\/+/, ''));
      const raw = await fs.readFile(full, 'utf-8');
      data = JSON.parse(raw);
    }
    if (!data) return NextResponse.json({ error: 'Missing seal data or filename' }, { status: 400 });

    const settings = await loadSettings();
    const svg = await buildSealSVG(data, settings, size);

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--font-render-hinting=none'] });
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<html><head><meta charset="utf-8"/></head><body style="margin:0;background:transparent;">${svg}</body></html>`, { waitUntil: 'load' });
    const el = await page.$('svg');
    const buf = await el!.screenshot({ type: 'png', omitBackground: true });
    await browser.close();
    return new NextResponse(buf, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Browser export error:', e);
    return NextResponse.json({ error: 'Failed to export via headless browser' }, { status: 500 });
  }
}
