
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  Palette, 
  Target,
  ChevronDown,
  ChevronRight,
  Wand2,
  Download,
  Eye,
  CreditCard,
  X,
  CheckCircle,
  ImageIcon,
  Grid3x3
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import Image from 'next/image';

// Color mapping for seal tokens
const COLOR_MAP: { [key: string]: string } = {
  'WHITE': '#FFFFFF',
  'RED': '#DC2626',
  'ORANGE': '#EA580C',
  'YELLOW': '#EAB308',
  'GREEN': '#16A34A',
  'AQUA': '#06B6D4',
  'BLUE': '#2563EB',
  'INDIGO': '#4F46E5',
  'PURPLE': '#9333EA',
  'VIOLET': '#7C3AED',
  'GOLD': '#F59E0B',
  'SILVER': '#9CA3AF',
  'GRAY': '#6B7280'
};

interface SealToken {
  position: string;
  angle: number;
  color: string;
  content: string | number;
  type: 'number' | 'glyph';
}

interface SealData {
  centralDesign: string;
  ring1Tokens: SealToken[];
  ring2Tokens: SealToken[];
  ring3Affirmation: string;
  userConfig: {
    name: string;
    category: string;
    subCategory: string;
  };
}

// Seal Array Preview Component
function SealArrayPreview({ 
  sealDataUrl, 
  centralDesign, 
  category, 
  subCategory,
}: { 
  sealDataUrl: string;
  centralDesign: string;
  category: string;
  subCategory: string;
}) {
  const [sealData, setSealData] = useState<SealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [radii, setRadii] = useState<{ r1: number; r2: number; r3: number; c: number; tokenR: number; glyph: number }>({ r1: 90, r2: 128, r3: 166, c: 52, tokenR: 14, glyph: 24 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showTicks, setShowTicks] = useState<boolean>(true);

  // Helper: derive adaptive text color (white on dark, black on light)
  const getAdaptiveTextColor = (hex: string): string => {
    try {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      // YIQ perceived brightness
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 160 ? '#000000' : '#FFFFFF';
    } catch {
      // Fallback to white
      return '#FFFFFF';
    }
  };

  useEffect(() => {
    const fetchSealData = async () => {
      try {
        if (sealDataUrl.includes('/generated-seals/')) {
          const filename = sealDataUrl.split('/').pop();
          const response = await fetch(`/api/files/generated-seals/${filename}`);
          if (response.ok) {
            const data = await response.json();
            setSealData(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch seal data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSealData();
  }, [sealDataUrl]);

  // Load Admin calibration (public sanitized) and scale to 384px preview
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/generator/settings');
        if (!res.ok) return;
        const s = await res.json();
        const previewSize = 384;
        const scale = (s?.canvasSize ? (previewSize / s.canvasSize) : (previewSize / 600));
        setRadii({
          r1: Math.round((s?.innerRadius ?? 140) * scale),
          r2: Math.round((s?.middleRadius ?? 200) * scale),
          r3: Math.round((s?.outerRadius ?? 260) * scale),
          c: Math.round(((s?.centralRadius ?? 80) * 1.1) * scale),
          tokenR: Math.max(10, Math.round(22.5 * scale)),
          glyph: Math.max(18, Math.round(32 * scale)),
        });
        const g = !!s?.showGrid ?? true;
        setShowGrid(g);
        setShowTicks(g);
      } catch (e) {
        // Keep defaults
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="w-96 h-96 bg-gradient-to-br from-purple-900/50 to-teal-900/50 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!sealData) {
    return (
      <div className="w-96 h-96 bg-gradient-to-br from-purple-900/50 to-teal-900/50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-lg font-medium">Seal Array Preview</div>
          <div className="text-sm">{category}</div>
          <div className="text-xs">{subCategory}</div>
        </div>
      </div>
    );
  }

  const centerX = 192; // Half of 384px container
  const centerY = 192;
  // Match Admin calibration (scaled from 600px canvas):
  // inner (Ring1 Numbers) ≈ 90, middle (Ring2 Glyphs) ≈ 128, outer (Ring3 Text) ≈ 166
  const ring1Radius = radii.r1;   // Numbers
  const ring2Radius = radii.r2;   // Glyphs
  let ring3Radius = radii.r3;     // Affirmation/Text
  // Derived outer presentation: gold border must stay fully inside canvas
  const canvasRadius = 192;
  const goldBorderWidth = 12; // visual
  const goldOffset = 22; // distance from ring3 to gold ring center
  const maxAllowed = canvasRadius - 2; // small safety margin
  if (ring3Radius + goldOffset + goldBorderWidth / 2 > maxAllowed) {
    ring3Radius = Math.max(60, maxAllowed - (goldOffset + goldBorderWidth / 2));
  }
  // Pull affirmation inward a little for legibility near gold ring
  const textPathRadius = ring3Radius - 4; // ~12px at 1200 -> ~4px at 384 preview
  const goldBorderRadius = ring3Radius + goldOffset; // final gold ring radius
  
  const getTokenPosition = (angle: number, radius: number) => {
    const radian = (angle - 90) * Math.PI / 180; // Subtract 90 to start at top
    return {
      x: centerX + Math.cos(radian) * radius,
      y: centerY + Math.sin(radian) * radius
    };
  };

  // 24-direction ticks (every 15 degrees)
  const directions = Array.from({ length: 24 }, (_, i) => ({
    idx: i,
    angle: i * 15,
    label: i === 0 ? '12:00' : (i === 1 ? '12:30' : `${Math.floor(i/2)}:${i % 2 === 0 ? '00' : '30'}`)
  }));

  const getCircularTextPath = (radius: number) => {
    return `M ${centerX},${centerY} m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`;
  };

  return (
    <div className="relative w-96 h-96">
      <svg width="384" height="384" viewBox="0 0 384 384" className="w-full h-full">
        {/* Solid white background for the seal */}
        <rect x="0" y="0" width="384" height="384" fill="#ffffff" />
        {/* Clean ring boundaries */}
        <circle cx={centerX} cy={centerY} r={ring1Radius} fill="none" stroke="#000" strokeWidth="1.5" />
        <circle cx={centerX} cy={centerY} r={ring2Radius} fill="none" stroke="#000" strokeWidth="1.5" />
        {/* Ring 3 line intentionally omitted; text only */}
        {/* Gold outer border */}
        <circle cx={centerX} cy={centerY} r={goldBorderRadius} fill="none" stroke="#D4AF37" strokeWidth={goldBorderWidth} />

        {/* 24-direction tick overlay (for verification) */}
        {showTicks && (
          <g opacity={0.75}>
            {directions.map((d) => {
              const a = (d.angle - 90) * Math.PI/180;
              const lineInner = ring1Radius - Math.max(4, Math.round(radii.tokenR * 0.5));
              const lineOuter = ring3Radius + 10;
              const x1 = centerX + Math.cos(a) * lineInner;
              const y1 = centerY + Math.sin(a) * lineInner;
              const x2 = centerX + Math.cos(a) * lineOuter;
              const y2 = centerY + Math.sin(a) * lineOuter;
              const p1x = centerX + Math.cos(a) * ring1Radius;
              const p1y = centerY + Math.sin(a) * ring1Radius;
              const p2x = centerX + Math.cos(a) * ring2Radius;
              const p2y = centerY + Math.sin(a) * ring2Radius;
              const p3x = centerX + Math.cos(a) * ring3Radius;
              const p3y = centerY + Math.sin(a) * ring3Radius;
              const lx = centerX + Math.cos(a) * (ring3Radius + 16);
              const ly = centerY + Math.sin(a) * (ring3Radius + 16);
              return (
                <g key={`tick-${d.idx}`}> 
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7c3aed" strokeWidth={1} />
                  <circle cx={p1x} cy={p1y} r={2} fill="#22d3ee" />
                  <circle cx={p2x} cy={p2y} r={2} fill="#ef4444" />
                  <circle cx={p3x} cy={p3y} r={2} fill="#f59e0b" />
                  {/* Label */}
                  <text x={lx} y={ly} fontSize={8} fill="#111827" textAnchor="middle" alignmentBaseline="middle" style={{ userSelect: 'none' } as any}>
                    {d.label}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        
        {/* Central Design */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radii.c}
          fill="url(#centralGradient)"
          stroke="rgba(0, 0, 0, 0.3)"
          strokeWidth="2"
        />
        
        {/* Central Design Image */}
        <defs>
          <clipPath id="centralClip">
            <circle cx={centerX} cy={centerY} r={radii.c} />
          </clipPath>
        </defs>
        {(() => {
          const base = `/api/files/templates/${centralDesign}.png`;
                    return (
            <image
              href={base}
              x={centerX - radii.c}
              y={centerY - radii.c}
              width={radii.c * 2}
              height={radii.c * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#centralClip)"
            />
          );
        })()}

        {/* Name ring removed by request */}

        {/* Ring 1 Tokens (Sacred Numbers) */}
        {sealData.ring1Tokens.map((token, index) => {
          const pos = getTokenPosition(token.angle, ring1Radius);
          const color = COLOR_MAP[token.color] || '#FFFFFF';
          const numberFill = getAdaptiveTextColor(color);
          const deltaR = Math.max(1, Math.round((radii.tokenR / 22.5) * 3)); // +3px at 1200 => ~+2px here
          const rCircle = radii.tokenR + deltaR;
          
          return (
            <g key={`ring1-${index}`}>
              {/* Token Circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={rCircle}
                fill={color}
                stroke="#000"
                strokeWidth="1.5"
                filter="url(#tokenShadow)"
              />
              {/* Token Number */}
              <text
                x={pos.x}
                y={pos.y + Math.round(rCircle * 0.35)}
                textAnchor="middle"
                fontSize={Math.max(12, Math.round(12 * 2.5 * (rCircle / 22.5)) - 2)}
                fontWeight={900 as any}
                fill={numberFill}
                stroke="#000"
                strokeWidth="0.7"
                style={{ paintOrder: 'stroke fill' } as any}
              >
                {token.content}
              </text>
            </g>
          );
        })}

        {/* Ring 2 Tokens (Mystical Glyphs) */}
        {sealData.ring2Tokens.map((token, index) => {
          const pos = getTokenPosition(token.angle, ring2Radius);
          const color = COLOR_MAP[token.color] || '#FFFFFF';
          
          return (
            <g key={`ring2-${index}`}>
              {/* Token Circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={16.5}
                fill={color}
                stroke="#000"
                strokeWidth="1.5"
                filter="url(#tokenShadow)"
              />
              {/* Glyph Image Placeholder */}
              <foreignObject
                x={pos.x - (radii.glyph/2)}
                y={pos.y - (radii.glyph/2)}
                width={radii.glyph}
                height={radii.glyph}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={`/api/files/glyphs/${token.content}`}
                    alt={`Glyph ${token.content}`}
                    className="w-full h-full"
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                  />
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Ring 3 Circular Affirmation Text with auto repetition */}
        <defs>
          <path id="textPath" d={getCircularTextPath(textPathRadius)} />
        </defs>
        {(() => {
          const raw = (sealData.ring3Affirmation || '').trim();
          const limited = (raw || 'OM NAMAH SHIVAYA').split(/\s+/).slice(0, 10).join(' ');
          // Remove any leading 'Gayatri:' label if present
          const sanitized = limited.replace(/^\s*(?:gayatri:?)\s*/i, '');
          const phrase = sanitized.toUpperCase();
          // Add spacing: leading space and trailing bullet to separate wrap
          const display = ` ${phrase} •`;
          const circumference = 2 * Math.PI * textPathRadius;
          // Auto-fit font between 14–30px and make it slightly larger/bolder
          const width = (fs:number)=> display.length * 0.58 * fs;
          let fs = 22;
          while (width(fs) > circumference * 0.995 && fs > 14) fs -= 1;
          while (width(fs+1) < circumference * 0.985 && fs < 30) fs += 1;
          return (
            <text fontSize={fs} fill="#000000" fontFamily="'Times New Roman', Georgia, serif" fontWeight={900} textAnchor="middle">
              <textPath href="#textPath" startOffset="50%" lengthAdjust="spacing" textLength={Math.round(circumference * 0.995)}>{display}</textPath>
            </text>
          );
        })()}

        {/* Gradients */}
        <defs>
          <radialGradient id="centralGradient">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
            <stop offset="50%" stopColor="rgba(147, 51, 234, 0.6)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0.4)" />
          </radialGradient>
        </defs>
      </svg>

      {/* Grid Overlay (black, 50% opacity) controlled by Admin setting */}
      {showGrid && (
        <div className="absolute inset-0 opacity-40 pointer-events-none z-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px'
            }}
          />
        </div>
      )}
      
      {/* Configuration Info */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-400">
        <div>{sealData.userConfig.category}</div>
        <div>{sealData.userConfig.subCategory}</div>
      </div>
    </div>
  );
}

// Categories and subcategories as specified
const SEAL_CATEGORIES = {
  'Healing & Detoxification': [
    'Full Body Detoxification',
    'Toxin & Heavy Metal Detoxifier',
    'Organ Healing & Regeneration',
    'Acupoint & Meridian Detoxification'
  ],
  'Mind & Memory': [
    'Memory Enhancement',
    'Concentration & Focus Support',
    'Anxiety & Stress Relief',
    'Expanding Consciousness'
  ],
  'Dreams & Subconscious': [
    'Dream Recall Enhancement',
    'Lucid Dream Induction',
    'Subconscious Healing'
  ],
  'Energy & Protection': [
    'Insect Shielding',
    'Electromagnetic/EMF Clearing',
    'Psychic Shielding',
    'Protection from Negative Energies'
  ],
  'Chakra & Spiritual Growth': [
    'Chakra Balancing',
    'Kundalini Support',
    'Higher Consciousness Expansion',
    'Spiritual Awakening'
  ],
  'Environmental Enhancement': [
    'Clearing Stagnant Energies in Space',
    'Harmonizing Household or Workspace',
    'Nature Resonance Array',
    'Plant Growth Support'
  ],
  'Body Systems & Organs': [
    'Spinal Healing Array',
    'Cardiovascular Support',
    'Immune Enhancement',
    'Nervous System Strengthening',
    'Liver/Kidney Cleansing'
  ],
  'Other Specialized Arrays': [
    'Fertility & Reproductive Healing',
    'Athletic Performance Support',
    'Emotional Healing Array',
    'Intuition Enhancement'
  ]
};

const CENTRAL_DESIGNS = [
  { id: 'flower-of-life', name: 'Flower of Life', description: 'Sacred geometric pattern representing creation' },
  { id: 'sri-yantra', name: 'Sri Yantra', description: 'Hindu yantra symbolizing cosmic order' },
  { id: 'torus-field', name: 'Torus Field', description: 'Energy field pattern of manifestation' }
];

interface UserDetails {
  fullName: string;
  birthDate: {
    day: number;
    month: number;
    year: number;
  };
  birthTime: {
    hour: number;
    minute: number;
  };
  placeOfBirth: string;
}

interface SealConfiguration {
  centralDesign: string;
  category: string;
  subCategory: string;
}

export default function SealGeneratorPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  
  const [activeAccordion, setActiveAccordion] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSeal, setGeneratedSeal] = useState<string | null>(null);
  const [sealSummary, setSealSummary] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed'>('pending');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'paypal' | 'nowpayments' | null>(null);
  const paymentSuccessRef = useRef<HTMLDivElement | null>(null);
  const [pricingInfo, setPricingInfo] = useState<{ price: number; currency: string }>({ price: 14.99, currency: 'USD' });
  const [generationProgress, setGenerationProgress] = useState(0);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [lastAutoKey, setLastAutoKey] = useState<string>('');
  
  const [userDetails, setUserDetails] = useState<UserDetails>({
    fullName: '',
    birthDate: { day: 1, month: 1, year: 2000 },
    birthTime: { hour: 12, minute: 0 },
    placeOfBirth: ''
  });
  
  const [sealConfig, setSealConfig] = useState<SealConfiguration>({
    centralDesign: '',
    category: '',
    subCategory: ''
  });

  const [placeSearchResults, setPlaceSearchResults] = useState<string[]>([]);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);

  const loadPricingInfo = async () => {
    try {
      const response = await fetch('/api/admin/generator-config/payments');
      if (response.ok) {
        const data = await response.json();
        setPricingInfo({ 
          price: data.pricing?.sealArrayPrice || 14.99, 
          currency: data.pricing?.currency || 'USD' 
        });
      }
    } catch (error) {
      console.error('Failed to load pricing info:', error);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    loadPricingInfo();
    // Handle return from external checkout
    try {
      const sp = new URLSearchParams(window.location.search || '');
      const p = sp.get('payment');
      if (p === 'success') {
        setPaymentStatus('completed');
        setActiveAccordion(3);
        setShowPaymentModal(false);
        // Restore last generated seal if needed
        if (!generatedSeal) {
          const cached = localStorage.getItem('anoint:lastGeneratedSeal');
          if (cached) {
            try {
              const obj = JSON.parse(cached);
              if (obj?.url) setGeneratedSeal(obj.url);
              if (obj?.summary) setSealSummary(obj.summary);
            } catch {}
          }
        }
        // Scroll to the Payment Successful section and clean URL
        setTimeout(() => {
          const el = document.getElementById('payment-success') || paymentSuccessRef.current;
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('payment');
            url.searchParams.delete('order_id');
            url.hash = 'payment-success';
            window.history.replaceState({}, '', url.toString());
          } catch {}
        }, 350);
      }
    } catch {}
  }, [session, status, router]);

  // Generate arrays for dropdowns
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Place search using OpenStreetMap Nominatim API
  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setPlaceSearchResults([]);
      return;
    }

    setIsSearchingPlace(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      
      const places = data.map((place: any) => place.display_name);
      setPlaceSearchResults(places);
    } catch (error) {
      console.error('Place search error:', error);
      setPlaceSearchResults([]);
    }
    setIsSearchingPlace(false);
  };

  const handleUserDetailsChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setUserDetails(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof UserDetails] as any),
          [child]: value
        }
      }));
    } else {
      setUserDetails(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSealConfigChange = (field: keyof SealConfiguration, value: string) => {
    setSealConfig(prev => ({ ...prev, [field]: value }));
    
    // Reset subcategory when category changes
    if (field === 'category') {
      setSealConfig(prev => ({ ...prev, subCategory: '' }));
    }
  };

  // Auto-generate when required fields are filled and auto is enabled
  useEffect(() => {
    if (!autoGenerate || isGenerating) return;
    const key = JSON.stringify({
      name: userDetails.fullName?.trim(),
      design: sealConfig.centralDesign,
      cat: sealConfig.category,
      sub: sealConfig.subCategory,
    });
    const ready = !!userDetails.fullName && !!sealConfig.centralDesign && !!sealConfig.category && !!sealConfig.subCategory;
    if (ready && key !== lastAutoKey) {
      setLastAutoKey(key);
      generateSealArray();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, userDetails.fullName, sealConfig.centralDesign, sealConfig.category, sealConfig.subCategory]);

  const generateSealArray = async () => {
    // Validate required fields
    if (!userDetails.fullName) {
      toast.error('Please fill in all required user details');
      return;
    }
    
    if (!sealConfig.centralDesign || !sealConfig.category || !sealConfig.subCategory) {
      toast.error('Please complete your seal configuration');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Progress simulation for better UX
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return 90;
        return Math.min(90, prev + Math.random() * 12);
      });
    }, 300);
    
    try {
      setGenerationProgress(25);
      toast('Analyzing your birth details and numerology...', { duration: 2000 });
      
      const response = await fetch('/api/oracle/generate-seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDetails,
          sealConfig,
          userId: session?.user?.id
        })
      });

      if (response.ok) {
        setGenerationProgress(80);
        toast('Creating your personalized seal array...', { duration: 2000 });
        
        const data = await response.json();
        
        // Simulate final processing
        setTimeout(() => {
          setGenerationProgress(100);
          setGeneratedSeal(data.sealImageUrl);
          setSealSummary(data.summary || '');
          try {
            localStorage.setItem('anoint:lastGeneratedSeal', JSON.stringify({ url: data.sealImageUrl, summary: data.summary, t: Date.now() }));
          } catch {}
          setActiveAccordion(3); // Move to preview accordion
          toast.success('ANOINT Seal Array generated successfully!');
          clearInterval(progressInterval);
          setIsGenerating(false);
          setGenerationProgress(0);
        }, 1000);
      } else {
        throw new Error('Generation failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error('Failed to generate seal array. Please try again.');
      console.error('Generation error:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handlePayment = async (paymentMethod: 'stripe' | 'paypal' | 'nowpayments') => {
    setSelectedPaymentMethod(paymentMethod);
    setShowPaymentModal(true);
    setPaymentStatus('processing');

    try {
      const response = await fetch('/api/payment/create-seal-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          userId: session?.user?.id,
          sealConfig,
          userDetails,
          // Amount will be loaded from payment configuration
          testMode: true // Set to sandbox/test mode
        })
      });

      if (response.ok) {
        const data = await response.json();
        try {
          localStorage.setItem('anoint:lastCheckout', JSON.stringify({ number: data.orderId || `seal_${Date.now()}`, total: pricingInfo.price }));
        } catch {}
        
        // Handle different payment methods
        if (paymentMethod === 'stripe') {
          // Redirect to Stripe checkout
          window.open(data.checkoutUrl, '_blank');
        } else if (paymentMethod === 'paypal') {
          // Redirect to PayPal
          window.open(data.paypalUrl, '_blank');
        } else if (paymentMethod === 'nowpayments') {
          // Show crypto payment details
          window.open(data.cryptoUrl, '_blank');
        }

        // Simulate successful payment for testing
        setTimeout(() => {
          setPaymentStatus('completed');
          toast.success('Payment completed successfully!');
        }, 3000);
      } else {
        throw new Error('Payment initialization failed');
      }
    } catch (error) {
      toast.error('Payment failed. Please try again.');
      console.error('Payment error:', error);
      setPaymentStatus('pending');
      setShowPaymentModal(false);
    }
  };

  const downloadSealArray = async () => {
    if (!generatedSeal) return;

    try {
      if (generatedSeal.includes('/api/files/generated-seals/') && generatedSeal.endsWith('.json')) {
        // Prefer server-side PNG export for fidelity/automation
        const filename = generatedSeal.split('/').pop();
        // Prefer browser-based SVG->PNG to ensure 1:1 with preview
        const resp = await fetch('/api/seal/export-browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, size: 1200, showTicks: false })
        });
        if (!resp.ok) throw new Error('Server PNG export failed');
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ANOINT-Seal-Array-${userDetails.fullName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const response = await fetch(generatedSeal);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ANOINT-Seal-Array-${userDetails.fullName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast.success('Seal Array downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download seal array');
      console.error('Download error:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="aurora-text text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-6 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">ANOINT Seal Array Generator</h1>
              <p className="text-gray-300">Create personalized healing arrays based on your unique energetic signature</p>
            </div>
          </div>
        </motion.div>

        {/* Multi-Accordion Interface */}
        <div className="mystical-card rounded-lg overflow-hidden">
          {/* Accordion 1: User Details */}
          <div className="border-b border-gray-700">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 1 ? 0 : 1)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-purple-400" />
                <span className="text-lg font-semibold text-white">Personal Details & Numerology</span>
              </div>
              {activeAccordion === 1 ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            <AnimatePresence>
              {activeAccordion === 1 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-6 space-y-6"
                >
                  <div className="text-sm text-gray-300 mb-4">
                    Your personal information will be used to calculate Pythagorean Numerology and Chinese Bazi (Solar calendar) 
                    for precise array element selection.
                  </div>
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={userDetails.fullName}
                      onChange={(e) => handleUserDetailsChange('fullName', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter your complete full name"
                    />
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Birth Date *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={userDetails.birthDate.day}
                        onChange={(e) => handleUserDetailsChange('birthDate.day', Number(e.target.value))}
                        className="px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      
                      <select
                        value={userDetails.birthDate.month}
                        onChange={(e) => handleUserDetailsChange('birthDate.month', Number(e.target.value))}
                        className="px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {months.map(month => (
                          <option key={month} value={month}>{monthNames[month - 1]}</option>
                        ))}
                      </select>
                      
                      <select
                        value={userDetails.birthDate.year}
                        onChange={(e) => handleUserDetailsChange('birthDate.year', Number(e.target.value))}
                        className="px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Birth Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Birth Time *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <select
                          value={userDetails.birthTime.hour}
                          onChange={(e) => handleUserDetailsChange('birthTime.hour', Number(e.target.value))}
                          className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {hours.map(hour => (
                            <option key={hour} value={hour}>
                              {hour.toString().padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-gray-400 mt-1">Hour</div>
                      </div>
                      
                      <div>
                        <select
                          value={userDetails.birthTime.minute}
                          onChange={(e) => handleUserDetailsChange('birthTime.minute', Number(e.target.value))}
                          className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {minutes.map(minute => (
                            <option key={minute} value={minute}>
                              :{minute.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-gray-400 mt-1">Minute</div>
                      </div>
                    </div>
                  </div>

                  {/* Place of Birth (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Place of Birth (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userDetails.placeOfBirth}
                        onChange={(e) => {
                          handleUserDetailsChange('placeOfBirth', e.target.value);
                          searchPlaces(e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                        placeholder="Start typing your birth city..."
                      />
                      <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      
                      {/* Search Results */}
                      {placeSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {placeSearchResults.map((place, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                handleUserDetailsChange('placeOfBirth', place);
                                setPlaceSearchResults([]);
                              }}
                              className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                            >
                              {place}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Background options removed – always white */}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Accordion 2: Seal Configuration */}
          <div className="border-b border-gray-700">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 2 ? 0 : 2)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-purple-400" />
                <span className="text-lg font-semibold text-white">Seal Array Configuration</span>
              </div>
              {activeAccordion === 2 ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            <AnimatePresence>
              {activeAccordion === 2 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-6 space-y-6"
                >
                  <div className="text-sm text-gray-300 mb-4">
                    Choose the sacred geometry template and intended purpose for your personalized seal array.
                  </div>
                  
                  {/* Central Design Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Central Circle Sacred Geometry *
                    </label>
                    <div className="grid md:grid-cols-3 gap-4">
                      {CENTRAL_DESIGNS.map(design => (
                        <div
                          key={design.id}
                          onClick={() => handleSealConfigChange('centralDesign', design.id)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            sealConfig.centralDesign === design.id
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <div className="text-center">
                            <Palette className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                            <h4 className="font-semibold text-white mb-1">{design.name}</h4>
                            <p className="text-xs text-gray-400">{design.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Array Category *
                      </label>
                      <select
                        value={sealConfig.category}
                        onChange={(e) => handleSealConfigChange('category', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select Category</option>
                        {Object.keys(SEAL_CATEGORIES).map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Specific Array Type *
                      </label>
                      <select
                        value={sealConfig.subCategory}
                        onChange={(e) => handleSealConfigChange('subCategory', e.target.value)}
                        disabled={!sealConfig.category}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        <option value="">Select Array Type</option>
                        {sealConfig.category && SEAL_CATEGORIES[sealConfig.category as keyof typeof SEAL_CATEGORIES].map(subCategory => (
                          <option key={subCategory} value={subCategory}>{subCategory}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          className="accent-purple-500"
                          checked={autoGenerate}
                          onChange={(e) => setAutoGenerate(e.target.checked)}
                        />
                        <span>Auto-generate preview</span>
                      </label>
                    </div>
                    {isGenerating && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                          <span>Generating your seal array</span>
                          <span>{Math.round(generationProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${generationProgress}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full aurora-gradient rounded-full"
                          />
                        </div>
                        <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                          Your seal is generating. With your seal, your configurations are enhanced with Scalar based on the frameset of the seal array template. Every color token is also enhanced with Scalar and transcendental frequencies. The square grid in the preview keeps this energy dormant. Once you purchase, all watermarks are released and your seal begins working immediately.
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={generateSealArray}
                      disabled={isGenerating || !userDetails.fullName || !sealConfig.category}
                      className="w-full flex items-center justify-center space-x-3 aurora-gradient text-white px-6 py-4 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all duration-300"
                    >
                      {isGenerating ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Wand2 className="h-6 w-6" />
                          </motion.div>
                          <span>Generating Your ANOINT Seal Array...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-6 w-6" />
                          <span>Generate ANOINT Seal Array</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Accordion 3: Preview & Payment */}
          <div className="border-b border-gray-700">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 3 ? 0 : 3)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
              disabled={!generatedSeal}
            >
              <div className="flex items-center space-x-3">
                <ImageIcon className="h-5 w-5 text-purple-400" />
                <span className={`text-lg font-semibold ${generatedSeal ? 'text-white' : 'text-gray-500'}`}>
                  Preview & Purchase
                </span>
                {generatedSeal && (
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                )}
              </div>
              {activeAccordion === 3 ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            <AnimatePresence>
              {activeAccordion === 3 && generatedSeal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-6 space-y-6"
                >
                  {/* Preview Image */}
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <Sparkles className="h-6 w-6 text-purple-400" />
                      <h3 className="text-xl font-semibold text-white">Your ANOINT Seal Array</h3>
                    </div>
                    
                    <div className="relative bg-gray-800 p-6 rounded-lg inline-block">
                      <div className="relative">
                        {generatedSeal && generatedSeal.startsWith('/api/files') ? (
                          <SealArrayPreview 
                            sealDataUrl={generatedSeal}
                            centralDesign={sealConfig.centralDesign}
                            category={sealConfig.category}
                            subCategory={sealConfig.subCategory}
                          />
                        ) : (
                          // Show actual generated image if available
                          <img 
                            src={generatedSeal} 
                            alt="Generated ANOINT Seal Array" 
                            className="max-w-md mx-auto rounded-lg"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              console.error('Failed to load seal image');
                            }}
                          />
                        )}
                        
                        {/* Grid overlay now rendered inside SealArrayPreview */}
                        
                        {/* Watermark */}
                        <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-2 rounded text-sm text-white/90 backdrop-blur-sm font-semibold z-20">
                          © ANOINT
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-400">
                      <p>Ring 1: Sacred Numbers • Ring 2: Mystical Glyphs • Ring 3: Healing Affirmations</p>
                    </div>
                  </div>

                  {/* Summary Section */}
                  {sealSummary && (
                    <div className="bg-gradient-to-r from-purple-900/20 to-teal-900/20 p-6 rounded-lg border border-purple-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-white flex items-center">
                          <Eye className="h-5 w-5 mr-2 text-purple-400" />
                          Seal Array Summary
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async()=>{ try{ await navigator.clipboard.writeText(sealSummary); toast.success('Summary copied to clipboard'); }catch{ toast.error('Copy failed'); } }}
                            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                            title="Copy summary"
                          >Copy</button>
                          <button
                            onClick={()=>{ const blob = new Blob([sealSummary], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`ANOINT-Seal-Array-Summary.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }}
                            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                            title="Download as .txt"
                          >Download .txt</button>
                        </div>
                      </div>
                      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {sealSummary}
                      </div>
                    </div>
                  )}

                  {/* Payment Section */}
                  {paymentStatus === 'pending' && (
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <CreditCard className="h-5 w-5 mr-2 text-green-400" />
                        Purchase Your Seal Array - {pricingInfo.currency === 'USD' ? '$' : ''}{pricingInfo.price.toFixed(2)} {pricingInfo.currency !== 'USD' ? pricingInfo.currency : ''}
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {/* Stripe */}
                        <button
                          onClick={() => handlePayment('stripe')}
                          className="flex flex-col items-center p-4 border border-gray-600 rounded-lg hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                        >
                          <CreditCard className="h-8 w-8 text-purple-400 mb-2" />
                          <span className="text-white font-medium">Credit Card</span>
                          <span className="text-sm text-gray-400">via Stripe</span>
                        </button>

                        {/* PayPal */}
                        <button
                          onClick={() => handlePayment('paypal')}
                          className="flex flex-col items-center p-4 border border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 transition-all"
                        >
                          <div className="w-8 h-8 bg-blue-500 rounded mb-2 flex items-center justify-center text-white font-bold text-sm">
                            P
                          </div>
                          <span className="text-white font-medium">PayPal</span>
                          <span className="text-sm text-gray-400">Secure payment</span>
                        </button>

                        {/* Crypto */}
                        <button
                          onClick={() => handlePayment('nowpayments')}
                          className="flex flex-col items-center p-4 border border-gray-600 rounded-lg hover:border-orange-500 hover:bg-orange-500/10 transition-all"
                        >
                          <div className="w-8 h-8 bg-orange-500 rounded-full mb-2 flex items-center justify-center text-white font-bold text-sm">
                            ₿
                          </div>
                          <span className="text-white font-medium">Cryptocurrency</span>
                          <span className="text-sm text-gray-400">Bitcoin, ETH & more</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Download Section (after payment) */}
                  {paymentStatus === 'completed' && (
                    <div id="payment-success" ref={paymentSuccessRef} className="bg-green-900/20 border border-green-500/20 p-6 rounded-lg text-center">
                      <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold text-white mb-4">Payment Successful!</h4>
                      <p className="text-gray-300 mb-1">Your ANOINT Seal Array is now ready for download.</p>
                      <p className="text-gray-400 text-sm mb-6">A receipt has been emailed to {session?.user?.email || 'the email used at checkout'}.</p>
                      
                      <button
                        onClick={downloadSealArray}
                        className="flex items-center justify-center space-x-2 aurora-gradient text-white px-6 py-3 rounded-lg font-semibold text-lg mx-auto hover:shadow-xl transition-all duration-300"
                      >
                        <Download className="h-6 w-6" />
                        <span>DOWNLOAD SEAL ARRAY (PNG)</span>
                      </button>
                      
                      <p className="text-sm text-gray-500 mt-4">
                        You can also download your purchased Seal Array from your Member's Dashboard (Downloads). A plain-text (.txt) copy of your Seal Array description will also be available there.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
