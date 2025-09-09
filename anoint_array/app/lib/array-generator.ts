
export interface ArrayConfig {
  geometry: 'flower_of_life' | 'sri_yantra' | 'merkaba' | 'torus' | 'mandala' | 'spiral';
  size: 'small' | 'medium' | 'large' | 'xl';
  colors: string[];
  frequency: number; // Hz
  numerologySequence: number[];
  affirmations: string[];
  elementalFocus: 'earth' | 'water' | 'fire' | 'air' | 'spirit';
  intention: string;
  duration: number; // minutes for meditation
}

export interface GeneratedArray {
  id: string;
  name: string;
  config: ArrayConfig;
  svgContent: string;
  frequencies: number[];
  timestamp: string;
  energyProfile: {
    healing: number;
    protection: number;
    manifestation: number;
    clarity: number;
    love: number;
  };
}

// Sacred geometry patterns
export const SACRED_PATTERNS = {
  flower_of_life: {
    name: 'Flower of Life',
    description: 'Ancient symbol containing the fundamental forms of time and space',
    properties: ['Unity', 'Creation', 'Sacred proportions'],
    energy: 'Universal harmony and connection'
  },
  sri_yantra: {
    name: 'Sri Yantra',
    description: 'Sacred geometric form representing divine feminine energy',
    properties: ['Prosperity', 'Spiritual growth', 'Divine connection'],
    energy: 'Manifestation and abundance'
  },
  merkaba: {
    name: 'Merkaba',
    description: 'Star tetrahedron representing light, spirit, and body',
    properties: ['Ascension', 'Protection', 'Interdimensional travel'],
    energy: 'Spiritual activation and protection'
  },
  torus: {
    name: 'Torus Field',
    description: 'Doughnut-shaped energy field found throughout nature',
    properties: ['Energy circulation', 'Heart coherence', 'Flow state'],
    energy: 'Continuous energy circulation'
  },
  mandala: {
    name: 'Sacred Mandala',
    description: 'Circular sacred design representing wholeness',
    properties: ['Balance', 'Meditation focus', 'Inner harmony'],
    energy: 'Centering and balance'
  },
  spiral: {
    name: 'Golden Spiral',
    description: 'Fibonacci spiral found in nature and cosmos',
    properties: ['Growth', 'Evolution', 'Natural harmony'],
    energy: 'Organic expansion and flow'
  }
};

// Healing frequencies (Hz)
export const HEALING_FREQUENCIES = {
  174: 'Pain relief and healing foundation',
  285: 'Tissue regeneration and cellular repair',
  396: 'Liberation from fear and guilt',
  417: 'Undoing situations and facilitating change',
  528: 'Love frequency and DNA repair',
  639: 'Harmonizing relationships',
  741: 'Awakening intuition and problem solving',
  852: 'Returning to spiritual order',
  963: 'Connection to higher consciousness',
  40: 'Gamma waves - heightened awareness',
  7.83: 'Schumann resonance - Earth frequency',
  432: 'Natural healing frequency'
};

// Color correspondences for chakras and elements
export const SACRED_COLORS = {
  red: { chakra: 'Root', element: 'Fire', energy: 'Grounding, strength, passion' },
  orange: { chakra: 'Sacral', element: 'Fire', energy: 'Creativity, sexuality, joy' },
  yellow: { chakra: 'Solar Plexus', element: 'Fire', energy: 'Personal power, confidence' },
  green: { chakra: 'Heart', element: 'Earth', energy: 'Love, healing, harmony' },
  blue: { chakra: 'Throat', element: 'Water', energy: 'Communication, truth' },
  indigo: { chakra: 'Third Eye', element: 'Air', energy: 'Intuition, wisdom' },
  violet: { chakra: 'Crown', element: 'Spirit', energy: 'Spiritual connection' },
  white: { chakra: 'All', element: 'Spirit', energy: 'Purity, unity, clarity' },
  gold: { chakra: 'Soul Star', element: 'Spirit', energy: 'Divine wisdom, illumination' }
};

export function generateNumerologySequence(intention: string): number[] {
  // Generate sacred numbers based on intention
  const intentionValue = intention.length % 9 || 9;
  const sequences = {
    1: [1, 11, 111], // New beginnings
    2: [2, 22, 222], // Balance and relationships
    3: [3, 33, 333], // Creativity and expression
    4: [4, 44, 444], // Stability and foundation
    5: [5, 55, 555], // Change and freedom
    6: [6, 66, 666], // Nurturing and healing
    7: [7, 77, 777], // Spiritual awakening
    8: [8, 88, 888], // Abundance and success
    9: [9, 99, 999]  // Completion and wisdom
  };
  
  return sequences[intentionValue as keyof typeof sequences] || [7, 77, 777];
}

export function calculateEnergyProfile(config: ArrayConfig): GeneratedArray['energyProfile'] {
  const base = 50;
  const geometryBonus = {
    flower_of_life: { healing: 20, protection: 15, manifestation: 10, clarity: 15, love: 20 },
    sri_yantra: { healing: 10, protection: 10, manifestation: 25, clarity: 15, love: 15 },
    merkaba: { healing: 15, protection: 25, manifestation: 15, clarity: 20, love: 10 },
    torus: { healing: 25, protection: 10, manifestation: 15, clarity: 10, love: 25 },
    mandala: { healing: 20, protection: 15, manifestation: 10, clarity: 25, love: 15 },
    spiral: { healing: 15, protection: 10, manifestation: 20, clarity: 20, love: 20 }
  };
  
  const bonus = geometryBonus[config.geometry];
  
  return {
    healing: Math.min(100, base + bonus.healing),
    protection: Math.min(100, base + bonus.protection),
    manifestation: Math.min(100, base + bonus.manifestation),
    clarity: Math.min(100, base + bonus.clarity),
    love: Math.min(100, base + bonus.love)
  };
}

export function generateSVG(config: ArrayConfig): string {
  const size = {
    small: 400,
    medium: 600,
    large: 800,
    xl: 1000
  }[config.size];

  const center = size / 2;
  const primaryColor = config.colors[0] || '#8B5CF6';
  const secondaryColor = config.colors[1] || '#06B6D4';

  let geometry = '';
  
  switch (config.geometry) {
    case 'flower_of_life':
      geometry = generateFlowerOfLife(center, center, size / 4, primaryColor);
      break;
    case 'sri_yantra':
      geometry = generateSriYantra(center, center, size / 4, primaryColor, secondaryColor);
      break;
    case 'merkaba':
      geometry = generateMerkaba(center, center, size / 4, primaryColor);
      break;
    case 'torus':
      geometry = generateTorus(center, center, size / 4, primaryColor);
      break;
    case 'mandala':
      geometry = generateMandala(center, center, size / 4, primaryColor, secondaryColor);
      break;
    case 'spiral':
      geometry = generateSpiral(center, center, size / 4, primaryColor);
      break;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%">
          <stop offset="0%" stop-color="#1a1a2e" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#000" stop-opacity="1"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <g filter="url(#glow)">
        ${geometry}
      </g>
      
      <!-- Sacred numerology -->
      <text x="${center}" y="${size - 40}" text-anchor="middle" fill="${primaryColor}" font-size="16" font-family="serif" opacity="0.7">
        ${config.numerologySequence.join(' • ')}
      </text>
      
      <!-- Frequency notation -->
      <text x="${center}" y="30" text-anchor="middle" fill="${secondaryColor}" font-size="12" font-family="monospace" opacity="0.6">
        ${config.frequency} Hz • ${HEALING_FREQUENCIES[config.frequency as keyof typeof HEALING_FREQUENCIES] || 'Sacred frequency'}
      </text>
    </svg>
  `;
}

function generateFlowerOfLife(cx: number, cy: number, r: number, color: string): string {
  const circles: string[] = [];
  const positions = [
    [0, 0], // Center
    [r, 0], [-r, 0], // Left and right
    [r/2, r * Math.sin(Math.PI/3)], [-r/2, r * Math.sin(Math.PI/3)], // Top
    [r/2, -r * Math.sin(Math.PI/3)], [-r/2, -r * Math.sin(Math.PI/3)] // Bottom
  ];
  
  positions.forEach(([dx, dy]) => {
    circles.push(`<circle cx="${cx + dx}" cy="${cy + dy}" r="${r/2}" fill="none" stroke="${color}" stroke-width="2" opacity="0.8"/>`);
  });
  
  return circles.join('\n');
}

function generateSriYantra(cx: number, cy: number, r: number, color1: string, color2: string): string {
  const triangles: string[] = [];
  
  // Upward triangles (masculine)
  for (let i = 0; i < 5; i++) {
    const size = r * (1 - i * 0.15);
    const y = cy + i * 10;
    triangles.push(`
      <polygon points="${cx},${y - size/2} ${cx - size/2},${y + size/4} ${cx + size/2},${y + size/4}" 
               fill="none" stroke="${color1}" stroke-width="2" opacity="${0.9 - i * 0.1}"/>
    `);
  }
  
  // Downward triangles (feminine)
  for (let i = 0; i < 4; i++) {
    const size = r * (0.9 - i * 0.15);
    const y = cy - i * 8;
    triangles.push(`
      <polygon points="${cx},${y + size/2} ${cx - size/2},${y - size/4} ${cx + size/2},${y - size/4}" 
               fill="none" stroke="${color2}" stroke-width="2" opacity="${0.8 - i * 0.1}"/>
    `);
  }
  
  // Outer circle
  triangles.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color1}" stroke-width="3" opacity="0.6"/>`);
  
  return triangles.join('\n');
}

function generateMerkaba(cx: number, cy: number, r: number, color: string): string {
  const triangles: string[] = [];
  const size = r * 0.8;
  
  // Upper tetrahedron
  triangles.push(`
    <polygon points="${cx},${cy - size} ${cx - size},${cy + size/2} ${cx + size},${cy + size/2}" 
             fill="none" stroke="${color}" stroke-width="3" opacity="0.8"/>
  `);
  
  // Lower tetrahedron
  triangles.push(`
    <polygon points="${cx},${cy + size} ${cx - size},${cy - size/2} ${cx + size},${cy - size/2}" 
             fill="none" stroke="${color}" stroke-width="3" opacity="0.6"/>
  `);
  
  // Center connection lines
  triangles.push(`
    <line x1="${cx - size}" y1="${cy + size/2}" x2="${cx + size}" y2="${cy - size/2}" stroke="${color}" stroke-width="1" opacity="0.4"/>
    <line x1="${cx + size}" y1="${cy + size/2}" x2="${cx - size}" y2="${cy - size/2}" stroke="${color}" stroke-width="1" opacity="0.4"/>
  `);
  
  return triangles.join('\n');
}

function generateTorus(cx: number, cy: number, r: number, color: string): string {
  const paths: string[] = [];
  
  // Generate torus field lines
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const innerR = r * 0.3;
    const outerR = r * 0.9;
    
    paths.push(`
      <ellipse cx="${cx}" cy="${cy}" rx="${outerR * Math.cos(angle)}" ry="${outerR * Math.sin(angle)}" 
               fill="none" stroke="${color}" stroke-width="1" opacity="${0.8 - i * 0.08}"/>
    `);
  }
  
  // Center circle
  paths.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.2}" fill="none" stroke="${color}" stroke-width="3" opacity="0.9"/>`);
  
  return paths.join('\n');
}

function generateMandala(cx: number, cy: number, r: number, color1: string, color2: string): string {
  const elements: string[] = [];
  const petals = 12;
  
  // Outer petals
  for (let i = 0; i < petals; i++) {
    const angle = (i * Math.PI * 2) / petals;
    const x = cx + r * 0.7 * Math.cos(angle);
    const y = cy + r * 0.7 * Math.sin(angle);
    
    elements.push(`<circle cx="${x}" cy="${y}" r="${r * 0.15}" fill="none" stroke="${color1}" stroke-width="2" opacity="0.7"/>`);
  }
  
  // Inner ring
  elements.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="none" stroke="${color2}" stroke-width="3" opacity="0.8"/>`);
  
  // Center
  elements.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.1}" fill="${color1}" opacity="0.9"/>`);
  
  return elements.join('\n');
}

function generateSpiral(cx: number, cy: number, r: number, color: string): string {
  const points: string[] = [];
  const turns = 4;
  const totalPoints = turns * 20;
  
  for (let i = 0; i <= totalPoints; i++) {
    const angle = (i / totalPoints) * turns * Math.PI * 2;
    const radius = (i / totalPoints) * r;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  
  return `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="3" opacity="0.8"/>`;
}

export const PRESET_INTENTIONS = [
  'Healing and restoration',
  'Abundance and prosperity', 
  'Love and relationships',
  'Spiritual awakening',
  'Protection and grounding',
  'Clarity and wisdom',
  'Peace and harmony',
  'Manifestation power',
  'Chakra alignment',
  'Energy cleansing'
];

export const HEALING_AFFIRMATIONS = {
  healing: [
    'I am perfectly healthy in mind, body, and spirit',
    'Divine healing energy flows through every cell of my being',
    'I release all that no longer serves my highest good'
  ],
  abundance: [
    'I am a magnet for abundance and prosperity',
    'Money flows to me easily and effortlessly',
    'I deserve all the wealth and success I desire'
  ],
  love: [
    'I am worthy of unconditional love',
    'Love surrounds me and flows through me',
    'My heart is open to giving and receiving love'
  ],
  protection: [
    'I am surrounded by divine light and protection',
    'I am safe, secure, and protected at all times',
    'Only positive energy can affect me'
  ],
  clarity: [
    'My mind is clear and focused',
    'I trust my inner wisdom and intuition',
    'I see solutions easily and clearly'
  ]
};
