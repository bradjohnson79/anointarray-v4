import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    if (!filename) return NextResponse.json({ error: 'Filename required' }, { status: 400 });

    // Only allow the three canonical template files
    const allowed = new Set(['flower-of-life.png', 'sri-yantra.png', 'torus-field.png']);
    if (!allowed.has(filename)) {
      return NextResponse.json({ error: 'Template not allowed' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'data', 'ai-resources', 'templates', filename);
    const buf = await fs.readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
}
