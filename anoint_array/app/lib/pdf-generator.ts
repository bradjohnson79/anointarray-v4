
import jsPDF from 'jspdf';

export interface ShippingLabelData {
  carrier: 'canada-post' | 'ups';
  trackingNumber: string;
  service: string;
  sender: {
    name: string;
    company?: string;
    address: string;
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

export function generateShippingLabelPDF(data: ShippingLabelData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set up colors
  const primaryColor: [number, number, number] = data.carrier === 'canada-post' ? [204, 0, 0] : [105, 57, 0]; // Red for CP, Brown for UPS
  const textColor: [number, number, number] = [0, 0, 0];
  const grayColor: [number, number, number] = [128, 128, 128];

  // Header with carrier branding
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.carrier === 'canada-post' ? 'CANADA POST' : 'UPS', 15, 18);

  // Service type
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.service, 15, 22);

  // Tracking number (large, prominent)
  doc.setTextColor(...textColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TRACKING NUMBER', 15, 35);
  
  // Tracking number barcode area (simulated)
  doc.setFillColor(240, 240, 240);
  doc.rect(15, 40, 180, 20, 'F');
  doc.setFontSize(14);
  doc.setFont('courier', 'bold');
  doc.text(data.trackingNumber, 20, 53);

  // Create a visual barcode representation
  const barcodeY = 45;
  for (let i = 0; i < 50; i++) {
    const x = 20 + i * 3;
    const height = Math.random() > 0.5 ? 8 : 4;
    doc.setFillColor(0, 0, 0);
    doc.rect(x, barcodeY, 1, height, 'F');
  }

  // Sender Information
  doc.setFillColor(...primaryColor);
  doc.rect(15, 70, 85, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM:', 18, 76);

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 85;
  doc.text(data.sender.company || data.sender.name, 18, yPos);
  yPos += 5;
  doc.text(data.sender.address, 18, yPos);
  yPos += 5;
  if ((data as any).sender?.address2) { doc.text((data as any).sender.address2, 18, yPos); yPos += 5; }
  doc.text(`${data.sender.city}, ${data.sender.province || data.sender.state} ${data.sender.postalCode}`, 18, yPos);
  yPos += 5;
  doc.text(data.sender.country, 18, yPos);
  if (data.sender.phone) {
    yPos += 5;
    doc.text(`Tel: ${data.sender.phone}`, 18, yPos);
  }

  // Recipient Information
  doc.setFillColor(...primaryColor);
  doc.rect(110, 70, 85, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TO:', 113, 76);

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos = 85;
  doc.text(data.recipient.company || data.recipient.name, 113, yPos);
  yPos += 5;
  doc.text(data.recipient.address, 113, yPos);
  yPos += 5;
  if ((data as any).recipient?.address2) { doc.text((data as any).recipient.address2, 113, yPos); yPos += 5; }
  doc.text(`${data.recipient.city}, ${data.recipient.province || data.recipient.state} ${data.recipient.postalCode}`, 113, yPos);
  yPos += 5;
  doc.text(data.recipient.country, 113, yPos);
  if (data.recipient.phone) {
    yPos += 5;
    doc.text(`Tel: ${data.recipient.phone}`, 113, yPos);
  }

  // Package details
  const packageInfo = data.package || data.parcel;
  if (packageInfo) {
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 130, 180, 25, 'F');
    
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PACKAGE DETAILS', 18, 140);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const weightUnit = data.carrier === 'canada-post' ? 'kg' : 'lbs';
    const dimUnit = data.carrier === 'canada-post' ? 'cm' : 'in';
    
    doc.text(`Weight: ${packageInfo.weight} ${weightUnit}`, 18, 148);
    doc.text(`Dimensions: ${packageInfo.dimensions.length} x ${packageInfo.dimensions.width} x ${packageInfo.dimensions.height} ${dimUnit}`, 100, 148);
  }

  // Shipping details
  doc.setFillColor(245, 245, 245);
  doc.rect(15, 165, 180, 30, 'F');
  
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIPPING DETAILS', 18, 175);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Service: ${data.service}`, 18, 183);
  doc.text(`Cost: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.cost)}`, 18, 191);
  doc.text(`Expected Delivery: ${new Date(data.estimatedDelivery).toLocaleDateString()}`, 100, 183);
  
  if (data.orderNumber) {
    doc.text(`Order: ${data.orderNumber}`, 100, 191);
  }

  // Footer with ANOINT Array branding
  doc.setFillColor(50, 50, 50);
  doc.rect(0, 210, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ANOINT ARRAY - Sacred Healing Technology', 15, 220);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('www.anointarray.com', 15, 227);

  // Important notices
  doc.setTextColor(255, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('*** IMPORTANT: HANDLE WITH CARE - FRAGILE ITEMS ***', 15, 235);
  
  if (process.env.NODE_ENV === 'development') {
    doc.setTextColor(255, 100, 100);
    doc.text('*** DEVELOPMENT MODE - NOT VALID FOR ACTUAL SHIPPING ***', 15, 245);
  }

  // Date and time stamp
  doc.setTextColor(...grayColor);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date(data.createdAt).toLocaleString()}`, 15, 260);
  doc.text(`Label ID: ${data.trackingNumber}`, 15, 267);

  return Buffer.from(doc.output('arraybuffer'));
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
