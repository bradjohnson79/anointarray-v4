
import sharp from 'sharp';

export interface ShippingLabelData {
  carrier: 'canada-post' | 'ups';
  trackingNumber: string;
  service: string;
  sender: {
    name: string;
    company?: string;
    address: string;
    address2?: string;
    city: string;
    state?: string;
    province?: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  recipient: {
    name: string;
    company?: string;
    address: string;
    address2?: string;
    city: string;
    state?: string;
    province?: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  package?: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
  parcel?: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
  cost: number;
  estimatedDelivery: string;
  orderNumber?: string;
  createdAt: string;
}

export async function generateShippingLabelPNG(data: ShippingLabelData): Promise<Buffer> {
  // Create SVG for the shipping label
  const svgLabel = createShippingLabelSVG(data);
  
  try {
    // Convert SVG to PNG using Sharp
    const pngBuffer = await sharp(Buffer.from(svgLabel))
      .png({ quality: 90, compressionLevel: 6 })
      .toBuffer();
    
    return pngBuffer;
  } catch (error) {
    console.error('Error generating PNG:', error);
    // Fallback to a simple error image
    return generateErrorImage();
  }
}

function createShippingLabelSVG(data: ShippingLabelData): string {
  const width = 800;
  const height = 1000;
  
  const primaryColor = data.carrier === 'canada-post' ? '#CC0000' : '#8B4513'; // Red for CP, Brown for UPS
  const backgroundColor = '#FFFFFF';
  const textColor = '#000000';
  const grayColor = '#666666';
  
  const packageInfo = data.package || data.parcel;
  const weightUnit = data.carrier === 'canada-post' ? 'kg' : 'lbs';
  const dimUnit = data.carrier === 'canada-post' ? 'cm' : 'in';

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .header-text { font-family: 'Arial', sans-serif; font-size: 28px; font-weight: bold; fill: white; }
          .service-text { font-family: 'Arial', sans-serif; font-size: 14px; fill: white; }
          .section-title { font-family: 'Arial', sans-serif; font-size: 16px; font-weight: bold; fill: white; }
          .tracking-large { font-family: 'Courier', monospace; font-size: 18px; font-weight: bold; fill: ${textColor}; }
          .text-large { font-family: 'Arial', sans-serif; font-size: 14px; fill: ${textColor}; }
          .text-medium { font-family: 'Arial', sans-serif; font-size: 12px; fill: ${textColor}; }
          .text-small { font-family: 'Arial', sans-serif; font-size: 10px; fill: ${grayColor}; }
          .text-bold { font-weight: bold; }
          .branding-text { font-family: 'Arial', sans-serif; font-size: 14px; font-weight: bold; fill: white; }
          .warning-text { font-family: 'Arial', sans-serif; font-size: 9px; font-weight: bold; fill: #FF0000; }
        </style>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="${backgroundColor}" stroke="#E0E0E0" stroke-width="2"/>
      
      <!-- Header -->
      <rect x="0" y="0" width="${width}" height="80" fill="${primaryColor}"/>
      <text x="30" y="35" class="header-text">${data.carrier === 'canada-post' ? 'CANADA POST' : 'UPS'}</text>
      <text x="30" y="60" class="service-text">${data.service}</text>
      
      <!-- Tracking Section -->
      <rect x="20" y="100" width="${width - 40}" height="100" fill="#F5F5F5" stroke="#D0D0D0" stroke-width="1"/>
      <text x="30" y="125" class="section-title">TRACKING NUMBER</text>
      <text x="30" y="160" class="tracking-large">${data.trackingNumber}</text>
      
      <!-- Barcode simulation -->
      ${generateBarcodePattern(30, 170, 400, 20)}
      
      <!-- From Section -->
      <rect x="20" y="220" width="${(width - 60) / 2}" height="25" fill="${primaryColor}"/>
      <text x="30" y="240" class="section-title">FROM:</text>
      
      <text x="30" y="265" class="text-large text-bold">${data.sender.company || data.sender.name}</text>
      <text x="30" y="285" class="text-medium">${data.sender.address}</text>
      ${data.sender?.address2 ? `<text x="30" y="300" class="text-medium">${data.sender.address2}</text>` : ''}
      <text x="30" y="${data.sender?.address2 ? 320 : 305}" class="text-medium">${data.sender.city}, ${data.sender.province || data.sender.state} ${data.sender.postalCode}</text>
      <text x="30" y="${data.sender?.address2 ? 340 : 325}" class="text-medium">${data.sender.country}</text>
      ${data.sender.phone ? `<text x="30" y="${data.sender?.address2 ? 360 : 345}" class="text-medium">Tel: ${data.sender.phone}</text>` : ''}
      
      <!-- To Section -->
      <rect x="${(width / 2) + 10}" y="220" width="${(width - 60) / 2}" height="25" fill="${primaryColor}"/>
      <text x="${(width / 2) + 20}" y="240" class="section-title">TO:</text>
      
      <text x="${(width / 2) + 20}" y="265" class="text-large text-bold">${data.recipient.company || data.recipient.name}</text>
      <text x="${(width / 2) + 20}" y="285" class="text-medium">${data.recipient.address}</text>
      ${data.recipient?.address2 ? `<text x="${(width / 2) + 20}" y="300" class="text-medium">${data.recipient.address2}</text>` : ''}
      <text x="${(width / 2) + 20}" y="${data.recipient?.address2 ? 320 : 305}" class="text-medium">${data.recipient.city}, ${data.recipient.province || data.recipient.state} ${data.recipient.postalCode}</text>
      <text x="${(width / 2) + 20}" y="${data.recipient?.address2 ? 340 : 325}" class="text-medium">${data.recipient.country}</text>
      ${data.recipient.phone ? `<text x="${(width / 2) + 20}" y="${data.recipient?.address2 ? 360 : 345}" class="text-medium">Tel: ${data.recipient.phone}</text>` : ''}
      
      <!-- Package Details -->
      ${packageInfo ? `
        <rect x="20" y="380" width="${width - 40}" height="80" fill="#F8F8F8" stroke="#D0D0D0" stroke-width="1"/>
        <text x="30" y="405" class="text-large text-bold">PACKAGE DETAILS</text>
        <text x="30" y="425" class="text-medium">Weight: ${packageInfo.weight} ${weightUnit}</text>
        <text x="30" y="445" class="text-medium">Dimensions: ${packageInfo.dimensions.length} x ${packageInfo.dimensions.width} x ${packageInfo.dimensions.height} ${dimUnit}</text>
      ` : ''}
      
      <!-- Shipping Details -->
      <rect x="20" y="480" width="${width - 40}" height="100" fill="#F8F8F8" stroke="#D0D0D0" stroke-width="1"/>
      <text x="30" y="505" class="text-large text-bold">SHIPPING DETAILS</text>
      <text x="30" y="525" class="text-medium">Service: ${data.service}</text>
      <text x="30" y="545" class="text-medium">Cost: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.cost)}</text>
      <text x="400" y="525" class="text-medium">Expected Delivery: ${new Date(data.estimatedDelivery).toLocaleDateString()}</text>
      ${data.orderNumber ? `<text x="400" y="545" class="text-medium">Order: ${data.orderNumber}</text>` : ''}
      
      <!-- ANOINT Array Branding Footer -->
      <rect x="0" y="${height - 120}" width="${width}" height="80" fill="#333333"/>
      <text x="30" y="${height - 85}" class="branding-text">ANOINT ARRAY - Sacred Healing Technology</text>
      <text x="30" y="${height - 65}" class="text-small" fill="white">www.anointarray.com</text>
      
      <!-- Important Notice -->
      <text x="30" y="${height - 40}" class="warning-text">*** IMPORTANT: HANDLE WITH CARE - FRAGILE ITEMS ***</text>
      ${process.env.NODE_ENV === 'development' ? `<text x="30" y="${height - 25}" class="warning-text">*** DEVELOPMENT MODE - NOT VALID FOR ACTUAL SHIPPING ***</text>` : ''}
      
      <!-- Timestamp -->
      <text x="30" y="${height - 10}" class="text-small">Generated: ${new Date(data.createdAt).toLocaleString()}</text>
      <text x="400" y="${height - 10}" class="text-small">Label ID: ${data.trackingNumber}</text>
    </svg>
  `;
  
  return svg;
}

function generateBarcodePattern(x: number, y: number, width: number, height: number): string {
  let pattern = '';
  const barWidth = 2;
  const numBars = Math.floor(width / (barWidth * 2));
  
  for (let i = 0; i < numBars; i++) {
    const barX = x + (i * barWidth * 2);
    const barHeight = Math.random() > 0.5 ? height : height * 0.7;
    pattern += `<rect x="${barX}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#000000"/>`;
  }
  
  return pattern;
}

async function generateErrorImage(): Promise<Buffer> {
  const errorSvg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#F5F5F5"/>
      <text x="400" y="280" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="#CC0000">
        Shipping Label Generation Error
      </text>
      <text x="400" y="320" text-anchor="middle" font-family="Arial" font-size="16" fill="#666666">
        Please try again or contact support
      </text>
    </svg>
  `;
  
  try {
    return await sharp(Buffer.from(errorSvg))
      .png({ quality: 90 })
      .toBuffer();
  } catch (error) {
    // If even the error image fails, return a minimal buffer
    return Buffer.from('PNG generation failed');
  }
}

export function generateShippingLabelFromAPIData(apiData: any): ShippingLabelData {
  // Convert API response data to our unified ShippingLabelData format
  return {
    carrier: apiData.carrier === 'Canada Post' ? 'canada-post' : 'ups',
    trackingNumber: apiData.trackingNumber,
    service: apiData.service,
    sender: apiData.sender || {
      name: 'ANOINT Array Inc.',
      company: 'ANOINT Array Inc.',
      address: '123 Sacred Way',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M1A 1A1',
      country: 'CA',
      phone: '+1-416-555-0123'
    },
    recipient: apiData.recipient || {
      name: 'Customer',
      address: 'Customer Address',
      city: 'Customer City',
      province: 'Customer Province',
      postalCode: 'A1A 1A1',
      country: 'CA'
    },
    package: apiData.package,
    parcel: apiData.parcel,
    cost: apiData.cost,
    estimatedDelivery: apiData.estimatedDelivery,
    orderNumber: apiData.orderNumber,
    createdAt: new Date().toISOString()
  };
}

export function generateMockShippingLabel(carrier: 'canada-post' | 'ups', orderId?: string): ShippingLabelData {
  const trackingNumber = carrier === 'canada-post' 
    ? `CA${Date.now()}${Math.floor(Math.random() * 1000)}`
    : `1Z${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return {
    carrier,
    trackingNumber,
    service: carrier === 'canada-post' ? 'Regular Parcel' : 'UPS Ground',
    sender: {
      name: 'ANOINT Array Inc.',
      company: 'ANOINT Array Inc.',
      address: '123 Sacred Way',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M1A 1A1',
      country: 'CA',
      phone: '+1-416-555-0123'
    },
    recipient: {
      name: 'Test Customer',
      address: '456 Test Street',
      city: 'Vancouver',
      province: 'BC',
      postalCode: 'V6B 2W2',
      country: 'CA',
      phone: '+1-604-555-0199',
      email: 'test@example.com'
    },
    package: carrier === 'canada-post' ? {
      weight: 0.5,
      dimensions: {
        length: 30,
        width: 23,
        height: 15
      }
    } : undefined,
    parcel: carrier === 'ups' ? {
      weight: 1.1, // Convert to lbs
      dimensions: {
        length: 12, // Convert to inches
        width: 9,
        height: 6
      }
    } : undefined,
    cost: carrier === 'canada-post' ? 12.50 : 15.50,
    estimatedDelivery: new Date(Date.now() + (carrier === 'canada-post' ? 3 : 2) * 24 * 60 * 60 * 1000).toISOString(),
    orderNumber: orderId ? `ANA-${orderId}` : undefined,
    createdAt: new Date().toISOString()
  };
}
