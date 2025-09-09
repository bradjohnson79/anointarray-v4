
import { NextRequest, NextResponse } from 'next/server';
import { generateShippingLabelPDF, generateMockShippingLabel } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    filename: string;
  };
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Enhanced PDF generator for shipping labels
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { filename } = params;
    
    // Determine carrier from filename
    const carrier = filename.includes('canada-post') ? 'canada-post' : 'ups';
    
    // Generate mock shipping label data
    const mockData = generateMockShippingLabel(carrier as 'canada-post' | 'ups');
    
    // Generate professional PDF
    const pdfBuffer = generateShippingLabelPDF(mockData);
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "default-src 'self'; object-src 'self'; script-src 'none';",
      },
    });

  } catch (error) {
    console.error('Error generating shipping label PDF:', error);
    
    // Fallback to a simple PDF if generation fails
    const fallbackPDF = createFallbackPDF();
    
    return new NextResponse(fallbackPDF, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${params.filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  }
}

function createFallbackPDF(): Buffer {
  const simplePDF = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
100 700 Td
(SHIPPING LABEL) Tj
0 -50 Td
/F1 16 Tf
(PDF Generation Error) Tj
0 -30 Td
/F1 12 Tf
(Please try again or contact support) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000287 00000 n 
0000000370 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
620
%%EOF`;

  return Buffer.from(simplePDF);
}
