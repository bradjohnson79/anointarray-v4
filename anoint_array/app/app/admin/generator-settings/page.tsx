
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Zap,
  Grid3X3,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Target,
  Crosshair,
  Download,
  Upload,
  FileText,
  Trash2,
  Plus,
  CreditCard,
  DollarSign,
  Shield,
  ToggleLeft,
  ToggleRight,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/admin-layout';

// Available colors for token circles
const AVAILABLE_COLORS = [
  'WHITE', 'RED', 'ORANGE', 'YELLOW', 'GREEN', 'AQUA', 
  'BLUE', 'INDIGO', 'PURPLE', 'VIOLET', 'GOLD', 'SILVER', 'GRAY'
];

// 24-point directional coordinate system
const DIRECTIONAL_POSITIONS = [
  { position: '12:00', angle: 0 }, { position: '12:30', angle: 15 },
  { position: '1:00', angle: 30 }, { position: '1:30', angle: 45 },
  { position: '2:00', angle: 60 }, { position: '2:30', angle: 75 },
  { position: '3:00', angle: 90 }, { position: '3:30', angle: 105 },
  { position: '4:00', angle: 120 }, { position: '4:30', angle: 135 },
  { position: '5:00', angle: 150 }, { position: '5:30', angle: 165 },
  { position: '6:00', angle: 180 }, { position: '6:30', angle: 195 },
  { position: '7:00', angle: 210 }, { position: '7:30', angle: 225 },
  { position: '8:00', angle: 240 }, { position: '8:30', angle: 255 },
  { position: '9:00', angle: 270 }, { position: '9:30', angle: 285 },
  { position: '10:00', angle: 300 }, { position: '10:30', angle: 315 },
  { position: '11:00', angle: 330 }, { position: '11:30', angle: 345 }
];

// Available glyphs for Ring 2 testing (60 glyphs total)
const AVAILABLE_GLYPHS = [
  '3rd-eye-chakra.png', 'air-element.png', 'ankh.png', 'aquarius.png', 'aries.png',
  'brain.png', 'cancer.png', 'capricorn.png', 'cat.png', 'crown-center.png',
  'dna.png', 'dog.png', 'dragon.png', 'earth.png', 'ether.png',
  'eye-of-horus.png', 'female-reproductive.png', 'fire.png', 'gemini.png', 'goat.png',
  'heart-chakra.png', 'heart.png', 'horse.png', 'intestines.png', 'kaballah-tree-of-life.png',
  'kidneys.png', 'leo.png', 'liver.png', 'lotus.png', 'lungs.png',
  'maat-feather.png', 'male-reproductive.png', 'monkey.png', 'navel-chakra.png', 'om.png',
  'ox.png', 'pancreas.png', 'pentagram.png', 'pig.png', 'pisces.png',
  'rat.png', 'rooster.png', 'root-chakra.png', 'sacral-chakra.png', 'sagittarius.png',
  'scorpio.png', 'seed-of-life.png', 'skeleton.png', 'snake.png', 'spine.png',
  'spleen.png', 'sri-yantra.png', 'stomach.png', 'taurus.png', 'throat-chakra.png',
  'tiger.png', 'triskelion.png', 'virgo.png', 'ward.png', 'water.png'
];

// Available template images for central circle testing
// Uses new filenames; loader will fall back to "-template.png" if needed
const AVAILABLE_TEMPLATES = [
  { filename: 'flower-of-life.png', name: 'Flower of Life' },
  { filename: 'sri-yantra.png', name: 'Sri Yantra' },
  { filename: 'torus-field.png', name: 'Torus Field' }
];

// Gradient background options
const GRADIENT_OPTIONS = [
  { value: 'none', name: 'Transparent (None)', color: 'transparent' },
  { value: 'gold', name: 'Golden Radial', color: '#FFD700' },
  { value: 'silver', name: 'Silver Radial', color: '#C0C0C0' }
];

// Color mapping for display
const COLOR_MAP: { [key: string]: string } = {
  'WHITE': '#FFFFFF', 'RED': '#DC2626', 'ORANGE': '#EA580C', 'YELLOW': '#EAB308',
  'GREEN': '#16A34A', 'AQUA': '#06B6D4', 'BLUE': '#2563EB', 'INDIGO': '#4F46E5',
  'PURPLE': '#9333EA', 'VIOLET': '#7C3AED', 'GOLD': '#F59E0B', 'SILVER': '#9CA3AF', 'GRAY': '#6B7280'
};

interface CoordinatePoint {
  direction: string;
  x: number;
  y: number;
  angle: number;
}

interface GeneratorSettings {
  centerX: number;
  centerY: number;
  centralRadius: number;
  innerRadius: number;
  middleRadius: number;
  outerRadius: number;
  showGrid: boolean;
  showWatermark: boolean;
  autoSettings: boolean;
  canvasSize: number;
}

interface TextCalibrationSettings {
  sampleText: string;
  fontSize: number;
  letterSpacing: number;
  startAngle: number;
  fontFamily: string;
  textColor: string;
  showTextPreview: boolean;
}

interface TestToken {
  number: number;
  color: string;
  position: string;
  angle: number;
  enabled: boolean;
}

interface TestGlyph {
  filename: string;
  color: string;
  position: string;
  angle: number;
  enabled: boolean;
}

interface TemplateSettings {
  selectedTemplate: string;
  enabled: boolean;
  opacity: number;
  size: number;
}

interface BackgroundSettings {
  gradientType: string;
  opacity: number;
  enabled: boolean;
}

interface AIConfiguration {
  chatGptDispatcherPrompt: string;
  claudeAssemblerPrompt: string;
  summaryAiPrompt: string;
  guardRailPrompts: {
    antiHallucination: string;
    taskMaintenance: string;
  };
  openAiApiKey: string;
  anthropicApiKey: string;
  isConfigured: boolean;
  lastUpdated?: string;
}

interface PaymentGatewayConfiguration {
  stripe: {
    enabled: boolean;
    testMode: boolean;
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    testPublishableKey: string;
    testSecretKey: string;
    testWebhookSecret: string;
  };
  paypal: {
    enabled: boolean;
    testMode: boolean;
    clientId: string;
    clientSecret: string;
    testClientId: string;
    testClientSecret: string;
  };
  nowPayments: {
    enabled: boolean;
    testMode: boolean;
    apiKey: string;
    publicKey: string;
    testApiKey: string;
    testPublicKey: string;
  };
  pricing: {
    sealArrayPrice: number;
    currency: string;
  };
  isConfigured: boolean;
  lastUpdated?: string;
}

const DIRECTION_POSITIONS = [
  '12:00', '12:30', '01:00', '01:30', '02:00', '02:30',
  '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'
];

export default function GeneratorSettingsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [settings, setSettings] = useState<GeneratorSettings>({
    centerX: 0,
    centerY: 0,
    centralRadius: 80,
    innerRadius: 140,
    middleRadius: 200,
    outerRadius: 260,
    showGrid: true,
    showWatermark: true,
    autoSettings: true,
    canvasSize: 600
  });
  
  const [coordinates, setCoordinates] = useState<CoordinatePoint[]>([]);
  const [textSettings, setTextSettings] = useState<TextCalibrationSettings>({
    sampleText: 'OM NAMAH SHIVAYA',
    fontSize: 16,
    letterSpacing: 2,
    startAngle: 0,
    fontFamily: 'serif',
    textColor: '#ffffff',
    showTextPreview: true
  });
  const [testToken, setTestToken] = useState<TestToken>({
    number: 7,
    color: 'BLUE',
    position: '12:00',
    angle: 0,
    enabled: false
  });
  const [testGlyph, setTestGlyph] = useState<TestGlyph>({
    filename: 'om.png',
    color: 'RED',
    position: '3:00',
    angle: 90,
    enabled: false
  });
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
    selectedTemplate: 'flower-of-life.png',
    enabled: false,
    opacity: 70,
    size: 100
  });
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    gradientType: 'none',
    opacity: 30,
    enabled: false
  });
  const [selectedTab, setSelectedTab] = useState<'calibration' | 'config' | 'payments'>('calibration');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfiguration>({
    chatGptDispatcherPrompt: '',
    claudeAssemblerPrompt: '',
    summaryAiPrompt: '',
    guardRailPrompts: {
      antiHallucination: '',
      taskMaintenance: ''
    },
    openAiApiKey: '',
    anthropicApiKey: '',
    isConfigured: false
  });
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentGatewayConfiguration>({
    stripe: {
      enabled: false,
      testMode: true,
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      testPublishableKey: '',
      testSecretKey: '',
      testWebhookSecret: ''
    },
    paypal: {
      enabled: false,
      testMode: true,
      clientId: '',
      clientSecret: '',
      testClientId: '',
      testClientSecret: ''
    },
    nowPayments: {
      enabled: false,
      testMode: true,
      apiKey: '',
      publicKey: '',
      testApiKey: '',
      testPublicKey: ''
    },
    pricing: {
      sealArrayPrice: 49.99,
      currency: 'USD'
    },
    isConfigured: false
  });
  const [showPaymentKeys, setShowPaymentKeys] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    csvFiles: string[];
    templateFiles: string[];
  }>({
    csvFiles: [],
    templateFiles: []
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    if (session.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    // Load existing uploaded files, AI configuration, and payment configuration
    loadUploadedFiles();
    loadAIConfiguration();
    loadPaymentConfiguration();
  }, [session, status, router]);

  useEffect(() => {
    calculateCoordinates();
  }, [settings]);

  useEffect(() => {
    // Force canvas redraw when any settings change
    if (canvasRef.current) {
      setTimeout(() => drawCanvas(), 100); // Small delay to ensure image is loaded
    }
  }, [testGlyph, testToken, textSettings, templateSettings, backgroundSettings]);

  const calculateCoordinates = () => {
    const centerX = settings.canvasSize / 2 + settings.centerX;
    const centerY = settings.canvasSize / 2 + settings.centerY;
    const newCoordinates: CoordinatePoint[] = [];

    DIRECTION_POSITIONS.forEach((direction, index) => {
      const angle = (index * 15 - 90) * (Math.PI / 180); // Start at 12:00 (top)
      
      // Inner ring (Ring 1 - Numbers)
      const innerX = centerX + Math.cos(angle) * settings.innerRadius;
      const innerY = centerY + Math.sin(angle) * settings.innerRadius;
      
      // Outer ring (Ring 2 - Glyphs)
      const outerX = centerX + Math.cos(angle) * settings.outerRadius;
      const outerY = centerY + Math.sin(angle) * settings.outerRadius;
      
      newCoordinates.push({
        direction,
        x: innerX,
        y: innerY,
        angle: angle * (180 / Math.PI)
      });
    });

    setCoordinates(newCoordinates);
    drawCanvas();
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = settings.canvasSize / 2 + settings.centerX;
    const centerY = settings.canvasSize / 2 + settings.centerY;

    // Draw radial gradient background if enabled
    if (backgroundSettings.enabled && backgroundSettings.gradientType !== 'none') {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, settings.outerRadius + 50);
      
      if (backgroundSettings.gradientType === 'gold') {
        gradient.addColorStop(0, `rgba(255, 215, 0, ${backgroundSettings.opacity / 100})`);
        gradient.addColorStop(0.5, `rgba(255, 193, 7, ${backgroundSettings.opacity / 200})`);
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      } else if (backgroundSettings.gradientType === 'silver') {
        gradient.addColorStop(0, `rgba(192, 192, 192, ${backgroundSettings.opacity / 100})`);
        gradient.addColorStop(0.5, `rgba(169, 169, 169, ${backgroundSettings.opacity / 200})`);
        gradient.addColorStop(1, 'rgba(192, 192, 192, 0)');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw grid if enabled
    if (settings.showGrid) {
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)';
      ctx.lineWidth = 1;
      
      // Grid lines
      const gridSize = 20;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw 4-element structure: Central Circle + 3 Rings
    ctx.lineWidth = 2;

    // Central Circle (Sacred Geometry Template)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)'; // Gold
    ctx.beginPath();
    ctx.arc(centerX, centerY, settings.centralRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Ring 1 (Numbers) - Blue
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, settings.innerRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Ring 2 (Glyphs) - Purple
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, settings.middleRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Ring 3 (Text) - White
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, settings.outerRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw coordinate points for all 3 rings
    coordinates.forEach((coord, index) => {
      const direction = DIRECTION_POSITIONS[index];
      
      const angle = (index * 15 - 90) * (Math.PI / 180);
      
      // Ring 1 points (Numbers) - Blue
      const ring1X = centerX + Math.cos(angle) * settings.innerRadius;
      const ring1Y = centerY + Math.sin(angle) * settings.innerRadius;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.beginPath();
      ctx.arc(ring1X, ring1Y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Ring 2 points (Glyphs) - Purple
      const ring2X = centerX + Math.cos(angle) * settings.middleRadius;
      const ring2Y = centerY + Math.sin(angle) * settings.middleRadius;
      ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
      ctx.beginPath();
      ctx.arc(ring2X, ring2Y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Ring 3 points (Text positions) - White
      const ring3X = centerX + Math.cos(angle) * settings.outerRadius;
      const ring3Y = centerY + Math.sin(angle) * settings.outerRadius;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(ring3X, ring3Y, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Draw direction labels at Ring 3 positions
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(direction, ring3X, ring3Y - 15);
    });

    // Draw center point
    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Draw template image in central circle if enabled
    if (templateSettings.enabled && templateSettings.selectedTemplate) {
      const primaryId = `template-${templateSettings.selectedTemplate}`;
      let templateImg = document.getElementById(primaryId) as HTMLImageElement | null;

      if (templateImg && templateImg.complete && templateImg.naturalWidth > 0) {
        // Calculate template size based on central radius
        const templateSize = (settings.centralRadius * 2 * templateSettings.size) / 100;
        
        ctx.save();
        ctx.globalAlpha = templateSettings.opacity / 100;
        ctx.drawImage(
          templateImg,
          centerX - templateSize / 2,
          centerY - templateSize / 2,
          templateSize,
          templateSize
        );
        ctx.restore();
      }
    }

    // Draw watermark if enabled (and template is not enabled, or both can coexist)
    if (settings.showWatermark && !templateSettings.enabled) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.font = 'bold 24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('ANOINT', centerX, centerY + 8);
    }

    // Draw circular text in Ring 3 for calibration
    if (textSettings.showTextPreview && textSettings.sampleText) {
      drawCircularText(
        ctx,
        textSettings.sampleText,
        centerX,
        centerY,
        settings.outerRadius,
        textSettings.fontSize,
        textSettings.letterSpacing,
        textSettings.startAngle,
        textSettings.fontFamily,
        textSettings.textColor
      );
    }

    // Draw test token in Ring 1 (Numbers)
    if (testToken.enabled) {
      const angle = (testToken.angle - 90) * Math.PI / 180; // Adjust for 12 o'clock starting position
      const tokenX = centerX + Math.cos(angle) * settings.innerRadius;
      const tokenY = centerY + Math.sin(angle) * settings.innerRadius;
      const tokenColor = COLOR_MAP[testToken.color] || '#FFFFFF';
      
      // Draw token circle (45px radius as per specification)
      ctx.fillStyle = tokenColor;
      ctx.beginPath();
      ctx.arc(tokenX, tokenY, 22.5, 0, 2 * Math.PI); // 22.5px radius = 45px diameter
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw number inside circle (12pt text)
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12pt sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(testToken.number.toString(), tokenX, tokenY);
      
      // Draw position label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '10px monospace';
      ctx.fillText(testToken.position, tokenX, tokenY - 35);
    }

    // Draw test glyph in Ring 2 (Glyphs)
    if (testGlyph.enabled) {
      const angle = (testGlyph.angle - 90) * Math.PI / 180; // Adjust for 12 o'clock starting position
      const glyphX = centerX + Math.cos(angle) * settings.middleRadius;
      const glyphY = centerY + Math.sin(angle) * settings.middleRadius;
      const glyphColor = COLOR_MAP[testGlyph.color] || '#FFFFFF';
      
      // Draw glyph circle (45px radius as per specification)
      ctx.fillStyle = glyphColor;
      ctx.beginPath();
      ctx.arc(glyphX, glyphY, 22.5, 0, 2 * Math.PI); // 22.5px radius = 45px diameter
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw actual glyph image on top of circle
      const glyphImageId = `glyph-${testGlyph.filename}`;
      let glyphImg = document.getElementById(glyphImageId) as HTMLImageElement;
      
      if (glyphImg && glyphImg.complete) {
        // Image is loaded, draw it
        const imgSize = 32; // 32px glyph image size
        ctx.drawImage(
          glyphImg,
          glyphX - imgSize/2,
          glyphY - imgSize/2,
          imgSize,
          imgSize
        );
      } else {
        // Image not loaded yet, show loading or fallback
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('...', glyphX, glyphY);
      }
      
      // Draw position label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '10px monospace';
      ctx.fillText(testGlyph.position, glyphX, glyphY - 35);
    }
  };

  const handleSettingsChange = (key: keyof GeneratorSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTextSettingsChange = (key: keyof TextCalibrationSettings, value: string | number | boolean) => {
    setTextSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTestTokenChange = (key: keyof TestToken, value: string | number | boolean) => {
    setTestToken(prev => {
      const newToken = { ...prev, [key]: value };
      
      // Update angle when position changes
      if (key === 'position') {
        const positionData = DIRECTIONAL_POSITIONS.find(p => p.position === value);
        if (positionData) {
          newToken.angle = positionData.angle;
        }
      }
      
      return newToken;
    });
  };

  const handleTestGlyphChange = (key: keyof TestGlyph, value: string | number | boolean) => {
    setTestGlyph(prev => {
      const newGlyph = { ...prev, [key]: value };
      
      // Update angle when position changes
      if (key === 'position') {
        const positionData = DIRECTIONAL_POSITIONS.find(p => p.position === value);
        if (positionData) {
          newGlyph.angle = positionData.angle;
        }
      }
      
      return newGlyph;
    });
  };

  const handleTemplateSettingsChange = (key: keyof TemplateSettings, value: string | number | boolean) => {
    setTemplateSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleBackgroundSettingsChange = (key: keyof BackgroundSettings, value: string | number | boolean) => {
    setBackgroundSettings(prev => ({ ...prev, [key]: value }));
  };

  const drawCircularText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    centerY: number,
    radius: number,
    fontSize: number,
    letterSpacing: number,
    startAngle: number,
    fontFamily: string,
    color: string
  ) => {
    if (!text || !textSettings.showTextPreview) return;

    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const characters = text.split('');
    const totalAngle = (characters.length - 1) * letterSpacing;
    const adjustedStartAngle = (startAngle - totalAngle / 2) * Math.PI / 180;

    characters.forEach((char, index) => {
      const angle = adjustedStartAngle + (index * letterSpacing * Math.PI / 180);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });

    ctx.restore();
  };

  const resetCoordinates = () => {
    setSettings({
      centerX: 0,
      centerY: 0,
      centralRadius: 80,
      innerRadius: 140,
      middleRadius: 200,
      outerRadius: 260,
      showGrid: true,
      showWatermark: true,
      autoSettings: true,
      canvasSize: 600
    });
    setTextSettings({
      sampleText: 'OM NAMAH SHIVAYA',
      fontSize: 16,
      letterSpacing: 2,
      startAngle: 0,
      fontFamily: 'serif',
      textColor: '#ffffff',
      showTextPreview: true
    });
    setTestToken({
      number: 7,
      color: 'BLUE',
      position: '12:00',
      angle: 0,
      enabled: false
    });
    setTestGlyph({
      filename: 'om.png',
      color: 'RED',
      position: '3:00',
      angle: 90,
      enabled: false
    });
    setTemplateSettings({
      selectedTemplate: 'flower-of-life.png',
      enabled: false,
      opacity: 70,
      size: 100
    });
    setBackgroundSettings({
      gradientType: 'none',
      opacity: 30,
      enabled: false
    });
    setSettings(prev => ({ ...prev, autoSettings: true }));
    toast.success('All calibration settings reset to default');
  };

  const saveConfiguration = async () => {
    try {
      // Save configuration to API
      const response = await fetch('/api/admin/generator-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          settings, 
          coordinates, 
          textSettings, 
          testToken, 
          testGlyph, 
          templateSettings, 
          backgroundSettings 
        })
      });

      if (response.ok) {
        toast.success('All calibration settings saved successfully');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error('Save error:', error);
    }
  };

  const saveAIConfiguration = async () => {
    try {
      // Save AI configuration to API
      const response = await fetch('/api/admin/generator-config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig)
      });

      if (response.ok) {
        setAiConfig(prev => ({ ...prev, isConfigured: true }));
        toast.success('AI Configuration saved successfully');
      } else {
        throw new Error('Failed to save AI configuration');
      }
    } catch (error) {
      toast.error('Failed to save AI configuration');
      console.error('AI Save error:', error);
    }
  };

  const handleAIConfigChange = (
    key: keyof AIConfiguration | 'antiHallucination' | 'taskMaintenance',
    value: string
  ) => {
    if (key === 'antiHallucination' || key === 'taskMaintenance') {
      setAiConfig(prev => ({
        ...prev,
        guardRailPrompts: {
          ...prev.guardRailPrompts,
          [key]: value
        }
      }));
    } else {
      setAiConfig(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const savePaymentConfiguration = async () => {
    try {
      const response = await fetch('/api/admin/generator-config/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentConfig)
      });

      if (response.ok) {
        setPaymentConfig(prev => ({ ...prev, isConfigured: true }));
        toast.success('Payment gateway configuration saved successfully');
      } else {
        throw new Error('Failed to save payment configuration');
      }
    } catch (error) {
      toast.error('Failed to save payment configuration');
      console.error('Payment Save error:', error);
    }
  };

  const handlePaymentConfigChange = (
    gateway: 'stripe' | 'paypal' | 'nowPayments' | 'pricing',
    key: string,
    value: string | number | boolean
  ) => {
    if (gateway === 'pricing') {
      setPaymentConfig(prev => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          [key]: value
        }
      }));
    } else {
      setPaymentConfig(prev => ({
        ...prev,
        [gateway]: {
          ...prev[gateway],
          [key]: value
        }
      }));
    }
  };

  const loadPaymentConfiguration = async () => {
    try {
      const response = await fetch('/api/admin/generator-config/payments');
      if (response.ok) {
        const data = await response.json();
        setPaymentConfig(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (error) {
      console.error('Failed to load payment configuration:', error);
    }
  };

  const loadUploadedFiles = async () => {
    try {
      const response = await fetch('/api/admin/generator-config/files');
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data);
      }
    } catch (error) {
      console.error('Failed to load uploaded files:', error);
    }
  };

  const loadAIConfiguration = async () => {
    try {
      const response = await fetch('/api/admin/generator-config/ai');
      if (response.ok) {
        const data = await response.json();
        setAiConfig(prev => ({
          ...prev,
          ...data,
          // Set masked values for display but keep track of actual keys
          openAiApiKey: data.hasOpenAiKey ? '***' : '',
          anthropicApiKey: data.hasAnthropicKey ? '***' : '',
        }));
      }
    } catch (error) {
      console.error('Failed to load AI configuration:', error);
    }
  };

  const handleFileUpload = async (files: FileList, fileType: 'csv' | 'template') => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('fileType', fileType);

      const response = await fetch('/api/admin/generator-config/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.uploadedCount} file(s) uploaded successfully`);
        await loadUploadedFiles(); // Refresh file list
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast.error('Failed to upload files');
      console.error('Upload error:', error);
    }
    
    setIsUploading(false);
  };

  const handleDeleteFile = async (fileName: string, fileType: 'csv' | 'template') => {
    try {
      const response = await fetch('/api/admin/generator-config/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileType })
      });

      if (response.ok) {
        toast.success('File deleted successfully');
        await loadUploadedFiles(); // Refresh file list
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast.error('Failed to delete file');
      console.error('Delete error:', error);
    }
  };

  const exportCoordinates = () => {
    const dataStr = JSON.stringify({ settings, coordinates }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anoint-generator-config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Configuration exported');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="aurora-text text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hidden glyph images for canvas rendering */}
        <div className="hidden">
          {AVAILABLE_GLYPHS.map(glyph => (
            <img
              key={glyph}
              id={`glyph-${glyph}`}
              src={`/api/files/glyphs/${glyph}`}
              alt={glyph.replace('.png', '')}
              onLoad={() => {
                // Redraw canvas when image loads
                if (canvasRef.current) {
                  drawCanvas();
                }
              }}
              onError={(e) => {
                console.warn(`Failed to load glyph: ${glyph}`);
              }}
            />
          ))}
          
          {/* Hidden template images for canvas rendering */}
          {AVAILABLE_TEMPLATES.map(template => (
            <img
              key={template.filename}
              id={`template-${template.filename}`}
              src={`/api/files/templates/${template.filename}`}
              alt={template.name}
              onLoad={() => {
                // Redraw canvas when template loads
                if (canvasRef.current) {
                  drawCanvas();
                }
              }}
              onError={(e) => {
                console.warn(`Failed to load template: ${template.filename}`)
              }}
            />
          ))}
        </div>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-6 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">ANOINT 4-Element Seal Array Generator</h1>
                <p className="text-gray-300">Configure Central Circle + 3 Rings coordinate system and ORACLE AI integration</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={exportCoordinates}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={saveConfiguration}
                className="flex items-center space-x-2 aurora-gradient text-white px-4 py-2 rounded-lg font-semibold"
              >
                <Save className="h-4 w-4" />
                <span>Save Config</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mystical-card rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-700">
            {[
              { id: 'calibration', label: 'Coordinate Calibration', icon: Target },
              { id: 'config', label: 'AI Configuration', icon: Settings },
              { id: 'payments', label: 'Payment Gateways', icon: CreditCard }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all ${
                  selectedTab === tab.id
                    ? 'bg-purple-600/30 text-purple-300 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {selectedTab === 'calibration' && (
                <motion.div
                  key="calibration"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-6">
                      {/* Canvas Controls */}
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <Settings className="h-5 w-5 mr-2 text-cyan-400" />
                          Canvas Controls
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleSettingsChange('showGrid', !settings.showGrid)}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                                settings.showGrid
                                  ? 'bg-purple-600/30 text-purple-300'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              <Grid3X3 className="h-4 w-4" />
                              <span>Grid Overlay</span>
                            </button>
                            
                            <button
                              onClick={() => handleSettingsChange('showWatermark', !settings.showWatermark)}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                                settings.showWatermark
                                  ? 'bg-purple-600/30 text-purple-300'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              <ImageIcon className="h-4 w-4" />
                              <span>Watermark</span>
                            </button>

                            <button
                              onClick={() => handleSettingsChange('autoSettings', !settings.autoSettings)}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                                settings.autoSettings
                                  ? 'bg-yellow-600/30 text-yellow-300'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {settings.autoSettings ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                              <span>Auto Settings</span>
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Center X: {settings.centerX}
                            </label>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={settings.centerX}
                              onChange={(e) => handleSettingsChange('centerX', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Center Y: {settings.centerY}
                            </label>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={settings.centerY}
                              onChange={(e) => handleSettingsChange('centerY', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Central Circle: {settings.centralRadius}px
                            </label>
                            <input
                              type="range"
                              min="40"
                              max="120"
                              value={settings.centralRadius}
                              onChange={(e) => handleSettingsChange('centralRadius', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Ring 1 (Numbers): {settings.innerRadius}px
                            </label>
                            <input
                              type="range"
                              min="100"
                              max="180"
                              value={settings.innerRadius}
                              onChange={(e) => handleSettingsChange('innerRadius', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Ring 2 (Glyphs): {settings.middleRadius}px
                            </label>
                            <input
                              type="range"
                              min="160"
                              max="240"
                              value={settings.middleRadius}
                              onChange={(e) => handleSettingsChange('middleRadius', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Ring 3 (Text): {settings.outerRadius}px
                            </label>
                            <input
                              type="range"
                              min="220"
                              max="300"
                              value={settings.outerRadius}
                              onChange={(e) => handleSettingsChange('outerRadius', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          
                          <button
                            onClick={resetCoordinates}
                            className="w-full flex items-center justify-center space-x-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg transition-colors"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Reset to Default</span>
                          </button>
                        </div>
                      </div>

                      {/* Token Testing Controls */}
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <Target className="h-5 w-5 mr-2 text-blue-400" />
                          Token Testing
                        </h3>
                        
                        <div className="space-y-6">
                          {/* Ring 1 Token Testing */}
                          <div className="border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-blue-300">Ring 1 - Number Token</h4>
                              <button
                                onClick={() => handleTestTokenChange('enabled', !testToken.enabled)}
                                className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all ${
                                  testToken.enabled
                                    ? 'bg-blue-600/30 text-blue-300'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                {testToken.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                <span>{testToken.enabled ? 'Enabled' : 'Disabled'}</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs text-gray-300 mb-1">Number (1-999)</label>
                                <select
                                  value={testToken.number}
                                  onChange={(e) => handleTestTokenChange('number', Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {Array.from({length: 20}, (_, i) => {
                                    const numbers = [1, 3, 7, 8, 13, 18, 22, 26, 33, 44, 77, 111, 222, 333, 444, 555, 666, 777, 888, 999];
                                    return <option key={numbers[i]} value={numbers[i]}>{numbers[i]}</option>;
                                  })}
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-300 mb-1">Circle Color</label>
                                <select
                                  value={testToken.color}
                                  onChange={(e) => handleTestTokenChange('color', e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {AVAILABLE_COLORS.map(color => (
                                    <option key={color} value={color}>{color}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs text-gray-300 mb-1">Position</label>
                                <select
                                  value={testToken.position}
                                  onChange={(e) => handleTestTokenChange('position', e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {DIRECTIONAL_POSITIONS.map(pos => (
                                    <option key={pos.position} value={pos.position}>{pos.position}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-2">
                              Current: {testToken.number} in {testToken.color} circle at {testToken.position} ({testToken.angle}°)
                            </div>
                          </div>

                          {/* Ring 2 Glyph Testing */}
                          <div className="border border-purple-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-purple-300">Ring 2 - Glyph Token</h4>
                              <button
                                onClick={() => handleTestGlyphChange('enabled', !testGlyph.enabled)}
                                className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all ${
                                  testGlyph.enabled
                                    ? 'bg-purple-600/30 text-purple-300'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                {testGlyph.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                <span>{testGlyph.enabled ? 'Enabled' : 'Disabled'}</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs text-gray-300 mb-1">Glyph</label>
                                <select
                                  value={testGlyph.filename}
                                  onChange={(e) => handleTestGlyphChange('filename', e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  {AVAILABLE_GLYPHS.map(glyph => (
                                    <option key={glyph} value={glyph}>
                                      {glyph.replace('.png', '').replace(/-/g, ' ')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-300 mb-1">Circle Color</label>
                                <select
                                  value={testGlyph.color}
                                  onChange={(e) => handleTestGlyphChange('color', e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  {AVAILABLE_COLORS.map(color => (
                                    <option key={color} value={color}>{color}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs text-gray-300 mb-1">Position</label>
                                <select
                                  value={testGlyph.position}
                                  onChange={(e) => handleTestGlyphChange('position', e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  {DIRECTIONAL_POSITIONS.map(pos => (
                                    <option key={pos.position} value={pos.position}>{pos.position}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-2">
                              Current: {testGlyph.filename.replace('.png', '')} in {testGlyph.color} circle at {testGlyph.position} ({testGlyph.angle}°)
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-700">
                            <div className="text-xs text-gray-500 space-y-1">
                              <div><strong>Token Testing:</strong> Test individual tokens in rings 1 & 2</div>
                              <div><strong>Position:</strong> 24-point directional coordinate system</div>
                              <div><strong>Colors:</strong> Same color mapping as final seal arrays</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Central Circle Template Testing */}
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <ImageIcon className="h-5 w-5 mr-2 text-yellow-400" />
                          Central Circle Template Testing
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-yellow-300">Template Preview</h4>
                            <button
                              onClick={() => handleTemplateSettingsChange('enabled', !templateSettings.enabled)}
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all ${
                                templateSettings.enabled
                                  ? 'bg-yellow-600/30 text-yellow-300'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {templateSettings.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              <span>{templateSettings.enabled ? 'Enabled' : 'Disabled'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-300 mb-2">Template</label>
                              <select
                                value={templateSettings.selectedTemplate}
                                onChange={(e) => handleTemplateSettingsChange('selectedTemplate', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              >
                                {AVAILABLE_TEMPLATES.map(template => (
                                  <option key={template.filename} value={template.filename}>
                                    {template.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-300 mb-2">
                                Opacity ({templateSettings.opacity}%)
                              </label>
                              <input
                                type="range"
                                min="10"
                                max="100"
                                value={templateSettings.opacity}
                                onChange={(e) => handleTemplateSettingsChange('opacity', Number(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-gray-300 mb-2">
                                Size ({templateSettings.size}%)
                              </label>
                              <input
                                type="range"
                                min="50"
                                max="200"
                                value={templateSettings.size}
                                onChange={(e) => handleTemplateSettingsChange('size', Number(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                            <div><strong>Template Testing:</strong> Preview sacred geometry templates in central circle</div>
                            <div><strong>Available:</strong> Flower of Life, Sri Yantra, Torus Field</div>
                          </div>
                        </div>
                      </div>

                      {/* Background gradients removed: Production seals use a clean white backdrop */}

                      {/* Ring 3 Text Calibration */}
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-white" />
                          Ring 3 Text Calibration
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleTextSettingsChange('showTextPreview', !textSettings.showTextPreview)}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                                textSettings.showTextPreview
                                  ? 'bg-white/20 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {textSettings.showTextPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              <span>Text Preview</span>
                            </button>
                          </div>

                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Sample Affirmation Text
                            </label>
                            <textarea
                              placeholder="Enter affirmation text to preview..."
                              value={textSettings.sampleText}
                              onChange={(e) => handleTextSettingsChange('sampleText', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                              rows={2}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Current: "{textSettings.sampleText}" ({textSettings.sampleText.length} characters)
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Font Size: {textSettings.fontSize}px
                            </label>
                            <input
                              type="range"
                              min="10"
                              max="32"
                              value={textSettings.fontSize}
                              onChange={(e) => handleTextSettingsChange('fontSize', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Letter Spacing: {textSettings.letterSpacing}°
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="8"
                              step="0.1"
                              value={textSettings.letterSpacing}
                              onChange={(e) => handleTextSettingsChange('letterSpacing', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Start Angle: {textSettings.startAngle}°
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              value={textSettings.startAngle}
                              onChange={(e) => handleTextSettingsChange('startAngle', Number(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Font Family
                            </label>
                            <select
                              value={textSettings.fontFamily}
                              onChange={(e) => handleTextSettingsChange('fontFamily', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="serif">Serif</option>
                              <option value="sans-serif">Sans Serif</option>
                              <option value="monospace">Monospace</option>
                              <option value="cursive">Cursive</option>
                              <option value="fantasy">Fantasy</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Text Color
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={textSettings.textColor}
                                onChange={(e) => handleTextSettingsChange('textColor', e.target.value)}
                                className="w-12 h-8 rounded border border-gray-600"
                              />
                              <input
                                type="text"
                                value={textSettings.textColor}
                                onChange={(e) => handleTextSettingsChange('textColor', e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="#ffffff"
                              />
                            </div>
                          </div>

                          <button
                            onClick={saveConfiguration}
                            className="w-full flex items-center justify-center space-x-2 aurora-gradient text-white px-4 py-2 rounded-lg font-semibold"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save Text Config</span>
                          </button>

                          <div className="pt-2 border-t border-gray-700">
                            <div className="text-xs text-gray-500 space-y-1">
                              <div><strong>Preview Mode:</strong> Live text positioning</div>
                              <div><strong>Letter Spacing:</strong> Degrees between characters</div>
                              <div><strong>Start Angle:</strong> Rotation of first character</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Coordinate Info */}
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">4-Element Structure</h3>
                        <div className="text-sm text-gray-300 space-y-2">
                          <div>• <span className="text-yellow-400">Gold circle</span>: Central (Sacred Geometry)</div>
                          <div>• <span className="text-blue-400">Blue points</span>: Ring 1 (Numbers)</div>
                          <div>• <span className="text-purple-400">Purple points</span>: Ring 2 (Glyphs)</div>
                          <div>• <span className="text-white">White points</span>: Ring 3 (Text)</div>
                          <div>• <span className="text-red-400">Red center</span>: Origin point</div>
                          <div className="pt-2 text-xs border-t border-gray-700 mt-3">
                            <strong>24-point directional system</strong><br/>
                            Clock positions: 12:00 through 11:30<br/>
                            Each ring evenly spaced for proper seal geometry
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Canvas Display */}
                    <div className="lg:col-span-2">
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">
                            ANOINT 4-Element Seal Array Calibration Canvas
                          </h3>
                          <div className="text-sm text-gray-400">
                            Central Circle + 3 Rings with 24-point coordinate positioning
                          </div>
                        </div>
                        
                        <div className="flex justify-center">
                          <div className="border border-gray-600 rounded-lg overflow-hidden">
                            <canvas
                              ref={canvasRef}
                              width={settings.canvasSize}
                              height={settings.canvasSize}
                              className="bg-gray-900"
                              onClick={(e) => {
                                const rect = canvasRef.current?.getBoundingClientRect();
                                if (rect) {
                                  const x = e.clientX - rect.left;
                                  const y = e.clientY - rect.top;
                                  console.log('Clicked at:', x, y);
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4 text-xs text-gray-500 text-center">
                          4-Element Structure: Central (Gold) + Ring 1 (Blue) + Ring 2 (Purple) + Ring 3 (White)<br/>
                          Click on any node to view coordinates. Adjust controls to calibrate ring spacing.
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedTab === 'config' && (
                <motion.div
                  key="config"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Settings className="h-6 w-6 text-purple-400" />
                        <div>
                          <h3 className="text-xl font-semibold text-white">Dual-AI Configuration System</h3>
                          <p className="text-sm text-gray-300">Configure ChatGPT-5 Dispatcher and Claude Assembler for Seal Array Generation</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowApiKeys(!showApiKeys)}
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                        >
                          {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span>{showApiKeys ? 'Hide' : 'Show'} API Keys</span>
                        </button>
                        <button
                          onClick={saveAIConfiguration}
                          className="flex items-center space-x-2 aurora-gradient text-white px-4 py-2 rounded-lg font-semibold"
                        >
                          <Save className="h-4 w-4" />
                          <span>Save AI Config</span>
                        </button>
                      </div>
                    </div>

                    {/* API Keys Section */}
                    {showApiKeys && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">
                              OpenAI API Key (ChatGPT-5 Dispatcher)
                            </label>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${aiConfig.openAiApiKey ? 'bg-green-400' : 'bg-red-400'}`}></div>
                              <span className="text-xs text-gray-400">
                                {aiConfig.openAiApiKey ? 'Configured' : 'Missing'}
                              </span>
                            </div>
                          </div>
                          <div className="relative">
                            <input
                              type={showApiKeys ? 'text' : 'password'}
                              placeholder="sk-proj-..."
                              value={aiConfig.openAiApiKey}
                              onChange={(e) => handleAIConfigChange('openAiApiKey', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            {aiConfig.openAiApiKey && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Loaded from environment variables (.env.local)
                          </p>
                        </div>
                        
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">
                              Anthropic API Key (Claude Assembler)
                            </label>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${aiConfig.anthropicApiKey ? 'bg-green-400' : 'bg-red-400'}`}></div>
                              <span className="text-xs text-gray-400">
                                {aiConfig.anthropicApiKey ? 'Configured' : 'Missing'}
                              </span>
                            </div>
                          </div>
                          <div className="relative">
                            <input
                              type={showApiKeys ? 'text' : 'password'}
                              placeholder="sk-ant-api03-..."
                              value={aiConfig.anthropicApiKey}
                              onChange={(e) => handleAIConfigChange('anthropicApiKey', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            {aiConfig.anthropicApiKey && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Loaded from environment variables (.env.local)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* API Keys Status Summary */}
                    <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 p-4 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${(aiConfig.openAiApiKey && aiConfig.anthropicApiKey) ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                          <span className="text-white font-medium">
                            API Keys Status: {(aiConfig.openAiApiKey && aiConfig.anthropicApiKey) ? 'Ready' : 'Partial Setup'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          OpenAI: {aiConfig.openAiApiKey ? '✓' : '✗'} | Anthropic: {aiConfig.anthropicApiKey ? '✓' : '✗'}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mt-2">
                        {(aiConfig.openAiApiKey && aiConfig.anthropicApiKey) 
                          ? 'Both AI systems are configured and ready for seal array generation.'
                          : 'Configure both API keys to enable the dual-AI system.'
                        }
                      </p>
                    </div>

                    {/* AI System Overview */}
                    <div className="bg-gradient-to-r from-purple-900/20 to-teal-900/20 p-6 rounded-lg border border-purple-500/20">
                      <h4 className="text-lg font-semibold text-white mb-4">Two-AI System Architecture</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                            <span className="font-medium text-blue-300">ChatGPT-5 Dispatcher</span>
                          </div>
                          <ul className="text-sm text-gray-300 space-y-1 ml-5">
                            <li>• Analyzes user birth details and intentions</li>
                            <li>• Calculates Pythagorean Numerology</li>
                            <li>• Determines Chinese Bazi elements</li>
                            <li>• Selects appropriate numbers, colors, glyphs</li>
                            <li>• Provides positioning coordinates</li>
                          </ul>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                            <span className="font-medium text-purple-300">Claude Assembler</span>
                          </div>
                          <ul className="text-sm text-gray-300 space-y-1 ml-5">
                            <li>• Receives structured data from ChatGPT</li>
                            <li>• Renders elements on canvas</li>
                            <li>• Positions rings with proper spacing</li>
                            <li>• Applies sacred geometry templates</li>
                            <li>• Generates final seal array image</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* AI Resource File Uploader */}
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                      <div className="flex items-center space-x-3 mb-4">
                        <Upload className="h-6 w-6 text-purple-400" />
                        <h4 className="text-lg font-semibold text-white">AI Resource Files</h4>
                        <div className="text-sm text-gray-400">
                          Upload CSV data files and seal array templates for AI vision access
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* CSV Files Upload */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-white flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-400" />
                              <span>CSV Data Files</span>
                            </h5>
                            <div className="text-sm text-gray-400">
                              {uploadedFiles.csvFiles.length} files
                            </div>
                          </div>
                          
                          <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 transition-colors">
                            <input
                              type="file"
                              multiple
                              accept=".csv"
                              onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'csv')}
                              className="hidden"
                              id="csv-upload"
                              disabled={isUploading}
                            />
                            <label htmlFor="csv-upload" className="cursor-pointer">
                              <div className="space-y-2">
                                <Plus className="h-8 w-8 text-gray-400 mx-auto" />
                                <p className="text-sm text-gray-300">
                                  {isUploading ? 'Uploading...' : 'Upload CSV files (glyphs, numbers, affirmations)'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Supports multiple .csv files
                                </p>
                              </div>
                            </label>
                          </div>

                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {uploadedFiles.csvFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4 text-blue-400" />
                                  <span className="text-sm text-gray-300">{file}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteFile(file, 'csv')}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Template Files Upload */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-white flex items-center space-x-2">
                              <ImageIcon className="h-4 w-4 text-purple-400" />
                              <span>Seal Array Templates</span>
                            </h5>
                            <div className="text-sm text-gray-400">
                              {uploadedFiles.templateFiles.length} files
                            </div>
                          </div>
                          
                          <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 transition-colors">
                            <input
                              type="file"
                              multiple
                              accept=".png,.jpg,.jpeg,.svg"
                              onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'template')}
                              className="hidden"
                              id="template-upload"
                              disabled={isUploading}
                            />
                            <label htmlFor="template-upload" className="cursor-pointer">
                              <div className="space-y-2">
                                <Plus className="h-8 w-8 text-gray-400 mx-auto" />
                                <p className="text-sm text-gray-300">
                                  {isUploading ? 'Uploading...' : 'Upload template images (Flower of Life, Sri Yantra, etc.)'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Supports PNG, JPG, SVG files
                                </p>
                              </div>
                            </label>
                          </div>

                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {uploadedFiles.templateFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded">
                                <div className="flex items-center space-x-2">
                                  <ImageIcon className="h-4 w-4 text-purple-400" />
                                  <span className="text-sm text-gray-300">{file}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteFile(file, 'template')}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <Eye className="h-4 w-4 text-blue-400 mt-0.5" />
                          <div className="text-sm text-blue-300">
                            <p className="font-medium mb-1">Vision Capabilities</p>
                            <p className="text-xs text-blue-200">
                              Both ChatGPT-5 and Claude can analyze uploaded images and CSV data to understand available glyphs, 
                              sacred geometry templates, and data structures for accurate seal array generation.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prompt Configuration */}
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* ChatGPT Dispatcher Prompt */}
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                          <h4 className="text-lg font-semibold text-white">ChatGPT-5 Dispatcher Prompt</h4>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-gray-300">
                            System prompt for ChatGPT-5 to analyze user data and determine seal array elements.
                          </p>
                          <textarea
                            placeholder="Enter the system prompt for ChatGPT-5 dispatcher..."
                            value={aiConfig.chatGptDispatcherPrompt}
                            onChange={(e) => handleAIConfigChange('chatGptDispatcherPrompt', e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                      </div>

                      {/* Claude Assembler Prompt */}
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                          <h4 className="text-lg font-semibold text-white">Claude Assembler Prompt</h4>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-gray-300">
                            System prompt for Claude to assemble the seal array based on ChatGPT's instructions.
                          </p>
                          <textarea
                            placeholder="Enter the system prompt for Claude assembler..."
                            value={aiConfig.claudeAssemblerPrompt}
                            onChange={(e) => handleAIConfigChange('claudeAssemblerPrompt', e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary AI Prompt */}
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
                        <h4 className="text-lg font-semibold text-white">Summary AI Prompt (ChatGPT-5)</h4>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm text-gray-300">
                          System prompt for ChatGPT-5 to generate a summary of the created seal array, describing the healing effects and elements in each ring.
                        </p>
                        <textarea
                          placeholder="Enter the system prompt for ChatGPT-5 to summarize the seal array..."
                          value={aiConfig.summaryAiPrompt}
                          onChange={(e) => handleAIConfigChange('summaryAiPrompt', e.target.value)}
                          rows={6}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                        />
                      </div>
                    </div>

                    {/* GuardRail Prompts */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <h5 className="font-medium text-white">Anti-Hallucination Prompt</h5>
                        </div>
                        <textarea
                          placeholder="Enter guardrails to prevent AI hallucination..."
                          value={aiConfig.guardRailPrompts.antiHallucination}
                          onChange={(e) => handleAIConfigChange('antiHallucination', e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        />
                      </div>

                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <h5 className="font-medium text-white">Task Maintenance Prompt</h5>
                        </div>
                        <textarea
                          placeholder="Enter prompts to maintain task focus..."
                          value={aiConfig.guardRailPrompts.taskMaintenance}
                          onChange={(e) => handleAIConfigChange('taskMaintenance', e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        />
                      </div>
                    </div>

                    {/* Configuration Status */}
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${aiConfig.isConfigured ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                          <span className="text-white font-medium">
                            System Status: {aiConfig.isConfigured ? 'Ready for Production' : 'Pending Configuration'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {aiConfig.isConfigured 
                            ? `Last updated: ${aiConfig.lastUpdated ? new Date(aiConfig.lastUpdated).toLocaleDateString() : 'Never'}`
                            : 'Complete prompts and API keys to enable AI generation'
                          }
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${aiConfig.chatGptDispatcherPrompt ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-gray-300">Dispatch Prompt</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${aiConfig.claudeAssemblerPrompt ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-gray-300">Assembler Prompt</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${aiConfig.summaryAiPrompt ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-gray-300">Summary Prompt</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${aiConfig.openAiApiKey ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-gray-300">OpenAI Key</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${aiConfig.anthropicApiKey ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-gray-300">Anthropic Key</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedTab === 'payments' && (
                <motion.div
                  key="payments"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-6 w-6 text-purple-400" />
                      <h3 className="text-xl font-semibold text-white">Payment Gateway Configuration</h3>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setShowPaymentKeys(!showPaymentKeys)}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPaymentKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="text-sm">{showPaymentKeys ? 'Hide' : 'Show'} API Keys</span>
                      </button>
                      <button
                        onClick={savePaymentConfiguration}
                        className="flex items-center space-x-2 aurora-gradient text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save Payment Config</span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing Configuration */}
                  <div className="bg-gradient-to-r from-green-900/20 to-teal-900/20 p-6 rounded-lg border border-green-500/20">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-green-400" />
                      Pricing Configuration
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Seal Array Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentConfig.pricing.sealArrayPrice}
                          onChange={(e) => handlePaymentConfigChange('pricing', 'sealArrayPrice', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Currency
                        </label>
                        <select
                          value={paymentConfig.pricing.currency}
                          onChange={(e) => handlePaymentConfigChange('pricing', 'currency', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stripe Configuration */}
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                        <h4 className="text-lg font-semibold text-white">Stripe Payment Gateway</h4>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Test Mode</span>
                          <button
                            onClick={() => handlePaymentConfigChange('stripe', 'testMode', !paymentConfig.stripe.testMode)}
                            className="relative"
                          >
                            {paymentConfig.stripe.testMode ? (
                              <ToggleRight className="h-6 w-6 text-orange-400" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Enabled</span>
                          <button
                            onClick={() => handlePaymentConfigChange('stripe', 'enabled', !paymentConfig.stripe.enabled)}
                            className="relative"
                          >
                            {paymentConfig.stripe.enabled ? (
                              <ToggleRight className="h-6 w-6 text-green-400" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Live Keys */}
                      <div className="space-y-4">
                        <h5 className="text-md font-medium text-purple-300">Live Keys</h5>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Publishable Key
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="pk_live_..."
                            value={paymentConfig.stripe.publishableKey}
                            onChange={(e) => handlePaymentConfigChange('stripe', 'publishableKey', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Secret Key
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="sk_live_..."
                            value={paymentConfig.stripe.secretKey}
                            onChange={(e) => handlePaymentConfigChange('stripe', 'secretKey', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Webhook Secret
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="whsec_..."
                            value={paymentConfig.stripe.webhookSecret}
                            onChange={(e) => handlePaymentConfigChange('stripe', 'webhookSecret', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      {/* Test Keys */}
                      <div className="space-y-4">
                        <h5 className="text-md font-medium text-orange-300">Test Keys</h5>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Test Publishable Key
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="pk_test_..."
                            value={paymentConfig.stripe.testPublishableKey}
                            onChange={(e) => handlePaymentConfigChange('stripe', 'testPublishableKey', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Test Secret Key
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="sk_test_..."
                            value={paymentConfig.stripe.testSecretKey}
                            onChange={(e) => handlePaymentConfigChange('stripe', 'testSecretKey', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Test Webhook Secret
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="whsec_..."
                            value={paymentConfig.stripe.testWebhookSecret}
                            onChange={(e) => handlePaymentConfigChange('stripe', 'testWebhookSecret', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PayPal Configuration */}
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        <h4 className="text-lg font-semibold text-white">PayPal Payment Gateway</h4>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Test Mode</span>
                          <button
                            onClick={() => handlePaymentConfigChange('paypal', 'testMode', !paymentConfig.paypal.testMode)}
                            className="relative"
                          >
                            {paymentConfig.paypal.testMode ? (
                              <ToggleRight className="h-6 w-6 text-orange-400" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Enabled</span>
                          <button
                            onClick={() => handlePaymentConfigChange('paypal', 'enabled', !paymentConfig.paypal.enabled)}
                            className="relative"
                          >
                            {paymentConfig.paypal.enabled ? (
                              <ToggleRight className="h-6 w-6 text-green-400" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Live Keys */}
                      <div className="space-y-4">
                        <h5 className="text-md font-medium text-blue-300">Live Keys</h5>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Client ID
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="Live PayPal Client ID"
                            value={paymentConfig.paypal.clientId}
                            onChange={(e) => handlePaymentConfigChange('paypal', 'clientId', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Client Secret
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="Live PayPal Client Secret"
                            value={paymentConfig.paypal.clientSecret}
                            onChange={(e) => handlePaymentConfigChange('paypal', 'clientSecret', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Test Keys */}
                      <div className="space-y-4">
                        <h5 className="text-md font-medium text-orange-300">Test Keys</h5>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Test Client ID
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="Test PayPal Client ID"
                            value={paymentConfig.paypal.testClientId}
                            onChange={(e) => handlePaymentConfigChange('paypal', 'testClientId', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Test Client Secret
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="Test PayPal Client Secret"
                            value={paymentConfig.paypal.testClientSecret}
                            onChange={(e) => handlePaymentConfigChange('paypal', 'testClientSecret', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NowPayments Configuration */}
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <h4 className="text-lg font-semibold text-white">NowPayments (Crypto) Gateway</h4>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Test Mode (Live Keys Only)</span>
                          <div className="relative opacity-50 cursor-not-allowed">
                            <ToggleLeft className="h-6 w-6 text-gray-500" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Enabled</span>
                          <button
                            onClick={() => handlePaymentConfigChange('nowPayments', 'enabled', !paymentConfig.nowPayments.enabled)}
                            className="relative"
                          >
                            {paymentConfig.nowPayments.enabled ? (
                              <ToggleRight className="h-6 w-6 text-green-400" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-3">
                        <p className="text-sm text-orange-300">
                          <strong>Note:</strong> NowPayments uses the same live API keys for both testing and production. 
                          Test transactions are handled through their sandbox environment using live credentials.
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-1 gap-4">
                      {/* Live Keys (Used for both test and production) */}
                      <div className="space-y-4">
                        <h5 className="text-md font-medium text-orange-300">API Keys (Used for Both Test & Production)</h5>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            API Key
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="NowPayments API Key"
                            value={paymentConfig.nowPayments.apiKey}
                            onChange={(e) => handlePaymentConfigChange('nowPayments', 'apiKey', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Public Key
                          </label>
                          <input
                            type={showPaymentKeys ? 'text' : 'password'}
                            placeholder="NowPayments Public Key"
                            value={paymentConfig.nowPayments.publicKey}
                            onChange={(e) => handlePaymentConfigChange('nowPayments', 'publicKey', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configuration Status */}
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${paymentConfig.isConfigured ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                        <span className="text-white font-medium">
                          Payment Status: {paymentConfig.isConfigured ? 'Ready for Production' : 'Pending Configuration'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {paymentConfig.isConfigured 
                          ? `Last updated: ${paymentConfig.lastUpdated ? new Date(paymentConfig.lastUpdated).toLocaleDateString() : 'Never'}`
                          : 'Configure at least one payment gateway to enable payments'
                        }
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${paymentConfig.stripe.enabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-gray-300">Stripe</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${paymentConfig.paypal.enabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-gray-300">PayPal</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${paymentConfig.nowPayments.enabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-gray-300">Crypto</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
