
interface RingElement {
  direction: string;
  number?: number;
  glyph?: string;
  color: string;
}

interface SealData {
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
}

const DIRECTION_ANGLES: { [key: string]: number } = {
  // Zero-padded hour labels
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
  // Non-padded hour aliases (to match generated JSON)
  '1:00': -60,  '1:30': -45,
  '2:00': -30,  '2:30': -15,
  '3:00': 0,    '3:30': 15,
  '4:00': 30,   '4:30': 45,
  '5:00': 60,   '5:30': 75,
  '6:00': 90,   '6:30': 105,
  '7:00': 120,  '7:30': 135,
  '8:00': 150,  '8:30': 165,
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

export class SealRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: GeneratorSettings;
  private glyphImages: { [key: string]: HTMLImageElement } = {};
  private templateImages: { [key: string]: HTMLImageElement } = {};
  private showDebugTicks = false;
  private debugRings: number[] = [1,2,3];

  constructor(canvas: HTMLCanvasElement, settings: GeneratorSettings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.settings = settings;
    
    // Set canvas size
    this.canvas.width = 1200;
    this.canvas.height = 1200;
  }

  async preloadGlyphImages(glyphFilenames: string[]): Promise<void> {
    const loadPromises = glyphFilenames.map(filename => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.glyphImages[filename] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load glyph image: ${filename}`);
          resolve(); // Don't fail the entire process
        };
        img.src = `/api/files/glyphs/${filename}`;
      });
    });

    await Promise.all(loadPromises);
  }

  async preloadTemplateImages(templateNames: string[]): Promise<void> {
    const loadPromises = templateNames.map(template => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.templateImages[template] = img;
          resolve();
        };
        img.onerror = () => { console.warn(`Failed to load template image: ${template}`); resolve(); };
        // Load the canonical uploaded templates via API
        img.src = `/api/files/templates/${template}.png`;
      });
    });

    await Promise.all(loadPromises);
  }

  drawBackground(): void {
    // Set a pure white canvas background for printing/clarity
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Optional grid retained for calibration
    if (this.settings.showGrid) this.drawGrid();
  }

  drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(156, 163, 175, 0.1)';
    this.ctx.lineWidth = 1;
    
    const gridSize = 40;
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawCentralCircle(template: string): void {
    const centerX = this.canvas.width / 2 + this.settings.centerX;
    const centerY = this.canvas.height / 2 + this.settings.centerY;
    const radius = (this.settings.centralRadius || 80) * 2; // scale to 1200 canvas

    // Draw template image if available
    const templateImage = this.templateImages[template];
    if (templateImage) {
      this.ctx.save();
      
      // Create circular clipping path
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.clip();

      // Draw template image
      this.ctx.drawImage(templateImage, centerX - radius, centerY - radius, radius * 2, radius * 2);
      
      this.ctx.restore();
    } else {
      // Fallback: draw simple geometric pattern
      this.drawFallbackTemplate(centerX, centerY, template);
    }

    // Draw circle border
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)'; // Gold border
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  drawFallbackTemplate(centerX: number, centerY: number, template: string): void {
    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    this.ctx.lineWidth = 2;

    switch (template) {
      case 'torus':
        this.drawTorusTemplate(centerX, centerY);
        break;
      case 'flower_of_life':
        this.drawFlowerOfLifeTemplate(centerX, centerY);
        break;
      case 'sri_yantra':
        this.drawSriYantraTemplate(centerX, centerY);
        break;
    }
  }

  drawTorusTemplate(centerX: number, centerY: number): void {
    // Draw torus field lines
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      this.ctx.beginPath();
      this.ctx.ellipse(centerX, centerY, 
        Math.abs(Math.cos(angle)) * 200, Math.abs(Math.sin(angle)) * 200, 
        angle, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawFlowerOfLifeTemplate(centerX: number, centerY: number): void {
    const radius = 100;
    const positions = [
      [0, 0], // Center
      [radius, 0], [-radius, 0], // Left and right
      [radius/2, radius * Math.sin(Math.PI/3)], [-radius/2, radius * Math.sin(Math.PI/3)], // Top
      [radius/2, -radius * Math.sin(Math.PI/3)], [-radius/2, -radius * Math.sin(Math.PI/3)] // Bottom
    ];
    
    positions.forEach(([dx, dy]) => {
      this.ctx.beginPath();
      this.ctx.arc(centerX + dx, centerY + dy, radius/2, 0, 2 * Math.PI);
      this.ctx.stroke();
    });
  }

  drawSriYantraTemplate(centerX: number, centerY: number): void {
    const size = 150;
    
    // Upward triangles
    for (let i = 0; i < 5; i++) {
      const triangleSize = size * (1 - i * 0.15);
      const y = centerY + i * 15;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, y - triangleSize/2);
      this.ctx.lineTo(centerX - triangleSize/2, y + triangleSize/4);
      this.ctx.lineTo(centerX + triangleSize/2, y + triangleSize/4);
      this.ctx.closePath();
      this.ctx.stroke();
    }
    
    // Downward triangles
    for (let i = 0; i < 4; i++) {
      const triangleSize = size * (0.9 - i * 0.15);
      const y = centerY - i * 12;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, y + triangleSize/2);
      this.ctx.lineTo(centerX - triangleSize/2, y - triangleSize/4);
      this.ctx.lineTo(centerX + triangleSize/2, y - triangleSize/4);
      this.ctx.closePath();
      this.ctx.stroke();
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

  drawRing1(ring1: RingElement[]): void {
    const centerX = this.canvas.width / 2 + this.settings.centerX;
    const centerY = this.canvas.height / 2 + this.settings.centerY;
    const radius = this.settings.innerRadius * 2; // Scale up for 1200x1200 canvas

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
    
    // Draw circle background
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 20, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw number text with subtle stroke for crispness
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
    const radius = this.settings.middleRadius * 2; // glyph ring

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
    
    // Draw circle background
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 24, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw glyph image if available
    const glyphImage = this.glyphImages[glyphFilename];
    if (glyphImage) {
      this.ctx.save();
      
      // Create circular clipping path
      this.ctx.beginPath();
      this.ctx.arc(x, y, 20, 0, 2 * Math.PI);
      this.ctx.clip();

      // Draw image
      this.ctx.drawImage(glyphImage, x - 25, y - 25, 50, 50);
      
      this.ctx.restore();
    } else {
      // Fallback text if image not available
      this.ctx.fillStyle = this.getContrastColor(color);
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(glyphFilename.split('.')[0], x, y);
    }
  }

  drawRing3(ring3: { text: string; repetitions: number }): void {
    const centerX = this.canvas.width / 2 + this.settings.centerX;
    const centerY = this.canvas.height / 2 + this.settings.centerY;
    const radius = this.settings.outerRadius * 2; // text on ring 3 path

    let displayText = ring3.text;
    
    // Apply repetition based on word count
    const words = ring3.text.trim().split(/\s+/);
    let repetitions = ring3.repetitions || 1;
    
    // Auto-calculate repetitions if not provided
    if (!ring3.repetitions) {
      if (words.length <= 3) {
        repetitions = 3;
      } else if (words.length <= 5) {
        repetitions = 2;
      } else {
        repetitions = 1;
      }
    }
    
    // Create repeated text with separators
    const repeatedTexts: string[] = [];
    for (let i = 0; i < repetitions; i++) {
      repeatedTexts.push(displayText);
    }
    const fullText = repeatedTexts.join(' • '); // Use bullet as separator
    
    // Calculate text properties
    this.ctx.font = 'bold 24px Times, serif';
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Draw text in a circle
    const angleStep = (2 * Math.PI) / fullText.length;
    
    for (let i = 0; i < fullText.length; i++) {
      const char = fullText[i];
      const angle = i * angleStep - Math.PI / 2; // Start at top
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle + Math.PI / 2);
      
      // Make separators more visible
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

  drawWatermark(): void {
    if (!this.settings.showWatermark) return;

    const centerX = this.canvas.width / 2 + this.settings.centerX;
    const centerY = this.canvas.height / 2 + this.settings.centerY;

    this.ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    this.ctx.font = 'bold 48px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('ANOINT', centerX, centerY);
  }

  setDebugTicks(show: boolean, rings?: number[]) {
    this.showDebugTicks = show;
    if (rings && rings.length) this.debugRings = rings;
  }

  private drawTickOverlay(): void {
    if (!this.showDebugTicks) return;
    const cx = this.canvas.width / 2 + this.settings.centerX;
    const cy = this.canvas.height / 2 + this.settings.centerY;
    const radii: { [k: number]: number } = {
      1: this.settings.innerRadius * 2,
      2: this.settings.middleRadius * 2,
      3: this.settings.outerRadius * 2,
    };
    const rings = this.debugRings || [1,2,3];
    this.ctx.save();
    this.ctx.fillStyle = '#ff0070';
    this.ctx.strokeStyle = '#ff0070';
    this.ctx.lineWidth = 1;
    const entries = Object.entries(DIRECTION_ANGLES);
    rings.forEach((r) => {
      const rad = radii[r];
      entries.forEach(([_, ang]) => {
        const radians = (ang * Math.PI) / 180;
        const x = cx + Math.cos(radians) * rad;
        const y = cy + Math.sin(radians) * rad;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.stroke();
      });
    });
    this.ctx.restore();
  }

  async renderSeal(sealData: SealData): Promise<void> {
    // Preload glyph images
    const glyphFilenames = sealData.Ring2.map(element => element.glyph!).filter(Boolean);
    await this.preloadGlyphImages(glyphFilenames);

    // Preload template image
    await this.preloadTemplateImages([sealData.CentralCircle.template]);

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw layers in order (from back to front)
    this.drawBackground();
    // structural rings
    this.drawRingBoundaries();
    this.drawCentralCircle(sealData.CentralCircle.template);
    this.drawRing1(sealData.Ring1);
    this.drawRing2(sealData.Ring2);
    this.drawRing3(sealData.Ring3);
    this.drawTickOverlay();
    this.drawWatermark();
  }

  exportAsDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }

  exportAsBlob(): Promise<Blob | null> {
    return new Promise(resolve => {
      this.canvas.toBlob(resolve, 'image/png');
    });
  }

  private getContrastColor(hexColor: string): string {
    // Convert hex to RGB
    const rgb = hexColor.substring(1);
    const r = parseInt(rgb.substring(0, 2), 16);
    const g = parseInt(rgb.substring(2, 4), 16);
    const b = parseInt(rgb.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }
}

export default SealRenderer;
