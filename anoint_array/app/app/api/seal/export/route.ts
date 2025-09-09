import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

type SealToken = {
  position: string;
  angle: number;
  color: string;
  content: string | number;
  type: 'number' | 'glyph';
};

type SealData = {
  centralDesign: string;
  ring1Tokens: SealToken[];
  ring2Tokens: SealToken[];
  ring3Affirmation: string;
  userConfig?: {
    name: string;
    category: string;
    subCategory: string;
  };
};

async function readIfExists(p: string): Promise<Buffer | null> {
  try {
    await fs.access(p);
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

async function loadTemplateImage(centralDesign: string): Promise<{ dataUri: string | null }> {
  const fileCandidates = [
    path.join(process.cwd(), 'data', 'ai-resources', 'templates', `${centralDesign}.png`),
    path.join(process.cwd(), 'app', 'public', 'templates', `${centralDesign}-template.png`),
    path.join(process.cwd(), 'public', 'templates', `${centralDesign}-template.png`),
  ];
  for (const f of fileCandidates) {
    const buf = await readIfExists(f);
    if (buf) return { dataUri: `data:image/png;base64,${buf.toString('base64')}` };
  }
  return { dataUri: null };
}

async function loadGlyphImage(filename: string): Promise<{ dataUri: string | null }> {
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
      return { dataUri: `data:${mime};base64,${buf.toString('base64')}` };
    }
  }
  return { dataUri: null };
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

function adaptiveTextColor(hex: string): string {
  try {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160 ? '#000000' : '#FFFFFF';
  } catch {
    return '#FFFFFF';
  }
}

function getDirLabel(i: number): string {
  if (i === 0) return '12:00';
  if (i === 1) return '12:30';
  const h = Math.floor(i / 2);
  return `${h}:${i % 2 === 0 ? '00' : '30'}`;
}

async function buildSealSVG(seal: SealData, opts: { size: number; showTicks?: boolean; settings: any }): Promise<string> {
  const size = Math.max(600, Math.min(2400, Math.floor(opts.size || 1200)));
  const centerX = size / 2;
  const centerY = size / 2;
  const baseCanvas = opts.settings?.canvasSize || 600;
  const k = size / baseCanvas;
  const r1 = Math.round((opts.settings?.innerRadius ?? 140) * k);
  const r2 = Math.round((opts.settings?.middleRadius ?? 200) * k);
  let r3 = Math.round((opts.settings?.outerRadius ?? 260) * k);
  const cR = Math.round(((opts.settings?.centralRadius ?? 80)) * k);
  const goldW = Math.max(12, Math.round(22 * (size / 1200)));
  const goldOffset = Math.max(12, Math.round(22 * (size / 1200)));
  const maxAllowed = size / 2 - 2;
  if (r3 + goldOffset + goldW / 2 > maxAllowed) {
    r3 = Math.max(60, Math.round(maxAllowed - (goldOffset + goldW / 2)));
  }
  const textRadius = r3;
  const goldRadius = r3 + goldOffset;
  // Match client renderer sizing @1200 canvas: ring1 token diameter ~45px, ring2 circle ~48px, glyph box ~50px
  const tokenR = Math.max(12, Math.round(22.5 * (size / 1200))); // ring1 number tokens radius
  const ring2CircleR = Math.max(14, Math.round(24 * (size / 1200))); // ring2 colored circle radius
  const glyphBox = Math.max(32, Math.round(50 * (size / 1200)));

  // Embed central template image if available
  const tmpl = await loadTemplateImage(seal.centralDesign);
  // Preload glyphs
  const glyphMap: Record<string, string> = {};
  for (const t of (seal.ring2Tokens || [])) {
    const key = String(t.content || '');
    if (!key || glyphMap[key]) continue;
    const g = await loadGlyphImage(key);
    if (g.dataUri) glyphMap[key] = g.dataUri;
  }

  const tokenCircle = (angle: number, radius: number) => {
    const a = (angle - 90) * Math.PI / 180;
    const x = centerX + Math.cos(a) * radius;
    const y = centerY + Math.sin(a) * radius;
    return { x, y };
  };

  const ringsSvg = `
    <circle cx="${centerX}" cy="${centerY}" r="${r1}" fill="none" stroke="#000" stroke-width="${Math.max(1, Math.round(size/384))}" />
    <circle cx="${centerX}" cy="${centerY}" r="${r2}" fill="none" stroke="#000" stroke-width="${Math.max(1, Math.round(size/384))}" />
    <circle cx="${centerX}" cy="${centerY}" r="${r3}" fill="none" stroke="#000" stroke-width="${Math.max(1, Math.round(size/480))}" />
    <circle cx="${centerX}" cy="${centerY}" r="${goldRadius}" fill="none" stroke="#D4AF37" stroke-width="${goldW}" />
  `;

  const centralSvg = tmpl.dataUri ? `
    <defs>
      <clipPath id="centralClip">
        <circle cx="${centerX}" cy="${centerY}" r="${cR}" />
      </clipPath>
    </defs>
    <image href="${tmpl.dataUri}" x="${centerX - cR}" y="${centerY - cR}" width="${cR*2}" height="${cR*2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#centralClip)" />
  ` : '';

  const ring1Svg = (seal.ring1Tokens || []).map((t) => {
    const { x, y } = tokenCircle(t.angle, r1);
    const fill = colorHex(t.color);
    const numColor = adaptiveTextColor(fill);
    return `
      <g>
        <circle cx="${x}" cy="${y}" r="${tokenR}" fill="${fill}" stroke="#000" stroke-width="${Math.max(1, Math.round(size/384))}" />
        <text x="${x}" y="${y + Math.round(tokenR*0.35)}" text-anchor="middle" font-size="${Math.max(12, Math.round(12 * (size/1200)))}" font-weight="bold" fill="${numColor}" stroke="#000" stroke-width="${Math.max(0.35, (size/1200)*0.35)}" style="paint-order: stroke fill">${t.content}</text>
      </g>
    `;
  }).join('\n');

  const ring2Svg = (seal.ring2Tokens || []).map((t) => {
    const { x, y } = tokenCircle(t.angle, r2);
    const fill = colorHex(t.color);
    const href = glyphMap[String(t.content || '')];
    const gx = x - glyphBox/2;
    const gy = y - glyphBox/2;
    return `
      <g>
        <circle cx="${x}" cy="${y}" r="${ring2CircleR}" fill="${fill}" stroke="#000" stroke-width="${Math.max(1, Math.round(size/384))}" />
        ${href ? `<image href="${href}" x="${gx}" y="${gy}" width="${glyphBox}" height="${glyphBox}" preserveAspectRatio="xMidYMid meet" />` : ''}
      </g>
    `;
  }).join('\n');

  const circumference = 2 * Math.PI * textRadius;
  const phraseRaw = (seal.ring3Affirmation || '').trim();
  const phrase = phraseRaw ? phraseRaw.toUpperCase() : 'OM NAMAH SHIVAYA';
  const textSvg = `
    <defs>
      <path id="textPath" d="M ${centerX},${centerY} m -${textRadius},0 a ${textRadius},${textRadius} 0 1,1 ${textRadius*2},0 a ${textRadius},${textRadius} 0 1,1 -${textRadius*2},0" />
    </defs>
    <text font-size="${Math.max(16, Math.round(24 * (size/1200)))}" fill="#000000" font-family="Times, serif" font-weight="700" text-anchor="middle">
      <textPath xlink:href="#textPath" href="#textPath" startOffset="50%">${phrase}</textPath>
    </text>
  `;

  const ticksSvg = opts.showTicks ? (() => {
    const parts: string[] = [];
    for (let i = 0; i < 24; i++) {
      const angle = i * 15;
      const a = (angle - 90) * Math.PI/180;
      const inner = r1 - Math.max(4, Math.round(tokenR*0.5));
      const outer = r3 + 10;
      const x1 = centerX + Math.cos(a) * inner;
      const y1 = centerY + Math.sin(a) * inner;
      const x2 = centerX + Math.cos(a) * outer;
      const y2 = centerY + Math.sin(a) * outer;
      const p1x = centerX + Math.cos(a) * r1; const p1y = centerY + Math.sin(a) * r1;
      const p2x = centerX + Math.cos(a) * r2; const p2y = centerY + Math.sin(a) * r2;
      const p3x = centerX + Math.cos(a) * r3; const p3y = centerY + Math.sin(a) * r3;
      const lx = centerX + Math.cos(a) * (r3 + 16);
      const ly = centerY + Math.sin(a) * (r3 + 16);
      const label = getDirLabel(i);
      parts.push(`
        <g>
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#7c3aed" stroke-width="${Math.max(1, Math.round(size/384))}" />
          <circle cx="${p1x}" cy="${p1y}" r="${Math.max(2, Math.round(2 * (size/1200)))}" fill="#22d3ee" />
          <circle cx="${p2x}" cy="${p2y}" r="${Math.max(2, Math.round(2 * (size/1200)))}" fill="#ef4444" />
          <circle cx="${p3x}" cy="${p3y}" r="${Math.max(2, Math.round(2 * (size/1200)))}" fill="#f59e0b" />
          <text x="${lx}" y="${ly}" font-size="${Math.max(8, Math.round(8 * (size/1200)))}" fill="#111827" text-anchor="middle" alignment-baseline="middle">${label}</text>
        </g>
      `);
    }
    return `<g opacity="0.75">${parts.join('\n')}</g>`;
  })() : '';

  // Background handling: white background only INSIDE the gold ring; transparent outside
  const innerWhiteR = Math.max(1, Math.round(goldRadius - goldW/2 - 1));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g>
    <circle cx="${centerX}" cy="${centerY}" r="${innerWhiteR}" fill="#ffffff" />
    ${ringsSvg}
    ${centralSvg}
    ${ring1Svg}
    ${ring2Svg}
    ${textSvg}
    ${ticksSvg}
  </g>
</svg>`;
  return svg;
}

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
    const { filename, seal, size = 1200, showTicks = false } = await req.json();

    let data: SealData | null = null;
    if (seal && typeof seal === 'object') {
      data = seal as SealData;
    } else if (typeof filename === 'string' && filename) {
      // Read generated seal JSON from disk
      const fname = filename.replace(/^\/+/, '');
      const base = path.join(process.cwd(), 'data', 'generated-seals');
      const full = path.join(base, fname);
      const raw = await fs.readFile(full, 'utf-8');
      data = JSON.parse(raw);
    }

    if (!data) {
      return NextResponse.json({ error: 'Missing seal data or filename' }, { status: 400 });
    }

    const settings = await loadSettings();
    const svg = await buildSealSVG(data, { size, showTicks, settings });

    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    return new NextResponse(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    console.error('Server PNG export error:', err);
    return NextResponse.json({ error: 'Failed to export PNG' }, { status: 500 });
  }
}
