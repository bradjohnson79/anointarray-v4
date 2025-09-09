
import { NextRequest, NextResponse } from 'next/server';
import { generateShippingLabelPDF, generateMockShippingLabel } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    filename: string;
  };
}

// Chrome-friendly PDF viewer
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { filename } = params;
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'view';
    
    // Determine carrier from filename
    const carrier = filename.includes('canada-post') ? 'canada-post' : 'ups';
    
    // Generate mock shipping label data
    const mockData = generateMockShippingLabel(carrier as 'canada-post' | 'ups');
    
    // Generate professional PDF
    const pdfBuffer = generateShippingLabelPDF(mockData);
    
    if (action === 'download') {
      // Force download
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
    } else if (action === 'base64') {
      // Return as base64 data URL for embedding
      const base64 = pdfBuffer.toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;
      
      return new NextResponse(JSON.stringify({ 
        dataUrl,
        filename,
        size: pdfBuffer.length 
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Standard view with Chrome-optimized headers
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          'Content-Length': pdfBuffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

  } catch (error) {
    console.error('Error in PDF viewer:', error);
    
    return new NextResponse('PDF generation failed', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
