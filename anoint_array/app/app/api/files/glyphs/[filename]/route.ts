

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    // Security check - only allow specific image extensions
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
    const fileExt = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Look for glyph files in multiple possible locations
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'glyphs', filename),
      path.join(process.cwd(), 'app', 'public', 'glyphs', filename),
      path.join(process.cwd(), 'data', 'ai-resources', 'glyphs', filename),
      path.join(process.cwd(), 'uploads', 'glyphs', filename),
      // Fallback: create a simple placeholder if file not found
    ];

    let filePath: string | null = null;
    let fileBuffer: Buffer;

    for (const possiblePath of possiblePaths) {
      try {
        await fs.access(possiblePath);
        filePath = possiblePath;
        break;
      } catch {
        // Continue to next path
      }
    }

    if (filePath) {
      fileBuffer = await fs.readFile(filePath);
    } else {
      // Generate a simple placeholder SVG for missing glyphs
      const placeholderSvg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#666" stroke-width="2"/>
          <text x="20" y="26" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">?</text>
        </svg>
      `;
      fileBuffer = Buffer.from(placeholderSvg, 'utf-8');
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Determine content type
    const contentTypes: { [key: string]: string } = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentTypes[fileExt] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (error) {
    console.error('Glyph file serve error:', error);
    
    // Return a fallback placeholder SVG
    const errorSvg = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="#f44336" opacity="0.1"/>
        <path d="M15 15 L25 25 M25 15 L15 25" stroke="#f44336" stroke-width="2"/>
      </svg>
    `;
    
    return new NextResponse(Buffer.from(errorSvg, 'utf-8'), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
}

