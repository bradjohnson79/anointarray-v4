import path from 'path';
import fs from 'fs/promises';
import { createCanvas, loadImage, Image, Canvas } from '@napi-rs/canvas';

interface RingElement {
  direction: string;
  number?: number;
  glyph?: string;
  color: string;
}

interface SealDataCanvas {
  CentralCircle: {
    template: string;
  };
  Ring1: RingElement[];
  Ring2: RingElement[];
  Ring3: {
    text: string;
    repetitions: number;
  };
}

interface GeneratorSettings {
  centerX: number;
  centerY: number;
  centralRadius: number; // central template circle
  innerRadius: number;   // ring 1 (numbers)
  middleRadius: number;  // ring 2 (glyphs)
  outerRadius: number;   // ring 3 (text path)
  showGrid: boolean;
  showWatermark: boolean;
  canvasSize: number;
  whiteInsideGoldOnly?: boolean;
}

const DIRECTION_ANGLES: { [key: string]: number } = {
  '12:00': -90, '12:30': -75,
  '01:00': -60, '01:30': -45,
  '02:00': -30, '02:30': -15,
  '03:00': 0,   '03:30': 15,
  '04:00': 30,  '04:30': 45,
  '05:00': 60,  '05:30': 75,
  '06:00': 90,  '06:30': 105,
  '07:00': 120, '07:30': 135,
  '08:00': 150, '08:30': 165,
  '09:00': 180, '09:30': 195,
  '10:00': 210, '10:30': 225,
  '11:00': 240, '11:30': 255,
  '1:00': -60,  '1:30': -45, '2:00': -30, '2:30': -15,
  '3:00': 0,    '3:30': 15,  '4:00': 30,  '4:30': 45,
  '5:00': 60,   '5:30': 75,  '6:00': 90,  '6:30': 105,
  '7:00': 120,  '7:30': 135, '8:00': 150, '8:30': 165,
  '9:00': 180,  '9:30': 195,
};

const COLOR_HEX_MAP: { [key: string]: string } = {
  WHITE: '#FFFFFF',
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  RED: '#FF0000',
  ORANGE: '#FFA500',
  YELLOW: '#FFFF00',
  GREEN: '#00FF00',
  BLUE: '#0000FF',
  INDIGO: '#4B0082',
  VIOLET: '#8B00FF',
  PURPLE: '#800080',
  PINK: '#FFC0CB',
  BROWN: '#A52A2A',
  GRAY: '#808080',
  TURQUOISE: '#40E0D0',
  TEAL: '#008080',
  CYAN: '#00FFFF',
  MAGENTA: '#FF00FF',
  CRIMSON: '#DC143C',
  SCARLET: '#FF2400',
  AMBER: '#FFBF00',
  CORAL: '#FF7F50',
  PEACH: '#FFCBA4',
  LAVENDER: '#E6E6FA',
  MINT: '#98FB98',
  JADE: '#00A86B',
  EMERALD: '#50C878',
  RUBY: '#E0115F',
  SAPPHIRE: '#0F52BA',
  AMETHYST: '#9966CC',
  CITRINE: '#E4D00A',
  ROSE: '#FF007F',
  AZURE: '#007FFF',
  OCHRE: '#CC7722',
  IVORY: '#FFFFF0',
  PEARL: '#EAE0C8',
  PLATINUM: '#E5E4E2',
  COPPER: '#B87333',
  BRONZE: '#CD7F32',
  STEEL: '#71797E'
};

async function resolveGlyphPath(filename: string): Promise<string | null> {
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'glyphs', filename),
    path.join(process.cwd(), 'app', 'public', 'glyphs', filename),
    path.join(process.cwd(), 'data', 'ai-resources', 'glyphs', filename),
    path.join(process.cwd(), 'uploads', 'glyphs', filename),
  ];
  for (const p of possiblePaths) {
    try { await fs.access(p); return p; } catch {}
  }
  return null;
}

async function resolveTemplatePath(template: string): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), 'data', 'ai-resources', 'templates', `${template}.png`),
    path.join(process.cwd(), 'public', 'templates', `${template}-template.png`),
    path.join(process.cwd(), 'app', 'public', 'templates', `${template}-template.png`),
  ];
  for (const p of candidates) {
    try { await fs.access(p); return p; } catch {}
  }
  return null;
}

export class SealRendererServer {
  private canvas: Canvas;
  private ctx: any;
  private settings: GeneratorSettings;
  private glyphImages: { [key: string]: Image } = {};
  private templateImages: { [key: string]: Image } = {};

  constructor(canvas: Canvas, settings: GeneratorSettings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings;
  }

  async preloadGlyphImages(glyphFilenames: string[]): Promise<void> {
    for (const filename of glyphFilenames) {
      if (!filename || this.glyphImages[filename]) continue;
      const p = await resolveGlyphPath(filename);
      if (!p) continue;
      try {
        const img = await loadImage(p);
        this.glyphImages[filename] = img as unknown as Image;
      } catch {
        // skip
      }
    }
  }

  async preloadTemplateImages(templateNames: string[]): Promise<void> {
    for (const template of templateNames) {
      if (!template || this.templateImages[template]) continue;
      const p = await resolveTemplatePath(template);
      if (!p) continue;
      try {
        const img = await loadImage(p);
        this.templateImages[template] = img as unknown as Image;
      } catch {
        // skip
      }
    }
  }

  private drawInnerWhiteOnly(): void {
    const cx = this.canvas.width / 2 + this.settings.centerX;
    const cy = this.canvas.height / 2 + this.settings.centerY;
    const r3 = this.settings.outerRadius * 2;
    const goldOffset = 22; // match client
    const goldW = 22;      // match client
    const innerWhiteR = r3 + goldOffset - goldW/2 - 1;
    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerWhiteR, 0, Math.PI*2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawBackground(): void {
    if (this.settings.whiteInsideGoldOnly) {
      this.drawInnerWhiteOnly();
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private drawRingBoundaries(): void {
    const cx = this.canvas.width / 2 + this.settings.centerX;
    const cy = this.canvas.height / 2 + this.settings.centerY;
    const r1 = this.settings.innerRadius * 2;
    const r2 = this.settings.middleRadius * 2;
    const r3 = this.settings.outerRadius * 2;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    [r1, r2, r3].forEach(r => { this.ctx.beginPath(); this.ctx.arc(cx, cy, r, 0, Math.PI*2); this.ctx.stroke(); });
    // Gold outer border
    this.ctx.strokeStyle = '#D4AF37';
    this.ctx.lineWidth = 22;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r3 + 22, 0, Math.PI*2);
    this.ctx.stroke();
  }

  drawCentralCircle(template: string): void {
    const centerX = this.canvas.width / 2 + this.settings.centerX;
    const centerY = this.canvas.height / 2 + this.settings.centerY;
    const radius = (this.settings.centralRadius || 80) * 2;

    const templateImage = this.templateImages[template];
    if (templateImage) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.clip();
      this.ctx.drawImage(templateImage as any, centerX - radius, centerY - radius, radius * 2, radius * 2);
      this.ctx.restore();
    }

    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  drawRing1(ring1: RingElement[]): void {
    const centerX = this.canvas.width / 2 + this.settings.centerX;
    const centerY = this.canvas.height / 2 + this.settings.centerY;
    const radius = this.settings.innerRadius * 2;

    ring1.forEach(element => {
      const angle = DIRECTION_ANGLES[element.direction];
      if (angle === undefined) return;
      const radians = (angle * Math.PI) / 180;
      const x = centerX + Math.cos(radians) * radius;
      const y = centerY + Math.sin(radians) * radius;
      this.drawNumberToken(x, y, element.number!, element.color);
    });
  }

  drawNumberToken(x: number, y: number, number: number, colorName: string): void {
    const color = COLOR_HEX_MAP[colorName] || '#FFFFFF';
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 22.5, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.font = 'bold 13px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.lineWidth = 0.8;
    this.ctx.strokeStyle = '#000000';
    this.ctx.strokeText(number.toString(), x, y);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(number.toString(), x, y);
  }

  drawRing2(ring2: RingElement[]): void {
    const centerX = this.canvas.width / 2 + this.settings.centerX;
    const centerY = this.canvas.height / 2 + this.settings.centerY;
    const radius = this.settings.middleRadius * 2;

    ring2.forEach(element => {
      const angle = DIRECTION_ANGLES[element.direction];
      if (angle === undefined) return;
      const radians = (angle * Math.PI) / 180;
      const x = centerX + Math.cos(radians) * radius;
      const y = centerY + Math.sin(radians) * radius;
      this.drawGlyphToken(x, y, element.glyph!, element.color);
    });
  }

  drawGlyphToken(x: number, y: number, glyphFilename: string, colorName: string): void {
    const color = COLOR_HEX_MAP[colorName] || '#FFFFFF';
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 24, 0, 2 * Math.PI);
    this.ctx.fill();

    const glyphImage = this.glyphImages[glyphFilename];
    if (glyphImage) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(x, y, 20, 0, 2 * Math.PI);
      this.ctx.clip();
      this.ctx.drawImage(glyphImage as any, x - 25, y - 25, 50, 50);
      this.ctx.restore();
    }
  }

  drawRing3(ring3: { text: string; repetitions: number }): void {
    const centerX = this.canvas.width / 2 + this.settings.centerX;
    const centerY = this.canvas.height / 2 + this.settings.centerY;
    const radius = this.settings.outerRadius * 2;

    let displayText = ring3.text?.trim() || '';
    const words = displayText.split(/\s+/);
    let repetitions = ring3.repetitions || 1;
    if (!ring3.repetitions) {
      if (words.length <= 3) repetitions = 3; else if (words.length <= 5) repetitions = 2; else repetitions = 1;
    }
    const repeated: string[] = [];
    for (let i = 0; i < repetitions; i++) repeated.push(displayText);
    const fullText = (repeated.join(' • ') || 'OM NAMAH SHIVAYA').toUpperCase();

    this.ctx.font = 'bold 24px Times, serif';
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const angleStep = (2 * Math.PI) / fullText.length;
    for (let i = 0; i < fullText.length; i++) {
      const char = fullText[i];
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle + Math.PI / 2);
      if (char === '•') {
        this.ctx.fillStyle = '#D4AF37';
        this.ctx.font = 'bold 26px Times, serif';
      } else {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 24px Times, serif';
      }
      this.ctx.fillText(char, 0, 0);
      this.ctx.restore();
    }
  }

  async renderSeal(sealData: SealDataCanvas): Promise<void> {
    const glyphFilenames = sealData.Ring2.map(e => e.glyph!).filter(Boolean);
    await this.preloadGlyphImages(glyphFilenames);
    await this.preloadTemplateImages([sealData.CentralCircle.template]);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    this.drawRingBoundaries();
    this.drawCentralCircle(sealData.CentralCircle.template);
    this.drawRing1(sealData.Ring1);
    this.drawRing2(sealData.Ring2);
    this.drawRing3(sealData.Ring3);
  }
}

export async function renderSealPNGBuffer(
  seal: {
    centralDesign: string;
    ring1Tokens: { position: string; angle: number; color: string; content: number }[];
    ring2Tokens: { position: string; angle: number; color: string; content: string }[];
    ring3Affirmation: string;
  },
  settings: GeneratorSettings,
  size = 1200
): Promise<Buffer> {
  // For 1:1 fidelity with the client renderer, keep 1200×1200 canvas
  // and pass the same 600‑based settings; internal drawing multiplies radii by 2.
  const canvas = createCanvas(1200, 1200);
  const s: GeneratorSettings = { ...settings, canvasSize: 600 } as any;

  const server = new SealRendererServer(canvas, { ...s, whiteInsideGoldOnly: true, showGrid: false, showWatermark: false });
  const mapped = {
    CentralCircle: { template: seal.centralDesign },
    Ring1: (seal.ring1Tokens || []).map(t => ({ direction: t.position, number: Number(t.content), color: t.color })),
    Ring2: (seal.ring2Tokens || []).map(t => ({ direction: t.position, glyph: String(t.content), color: t.color })),
    Ring3: { text: String(seal.ring3Affirmation || ''), repetitions: 1 },
  };
  await server.renderSeal(mapped);
  return canvas.toBuffer('image/png');
}
