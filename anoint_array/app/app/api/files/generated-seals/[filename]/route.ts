

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

    const filePath = path.join(process.cwd(), 'data', 'generated-seals', filename);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const sealData = JSON.parse(fileContent);
      
      return NextResponse.json(sealData);
    } catch (error) {
      return NextResponse.json({ error: 'Seal data not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Seal data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seal data' },
      { status: 500 }
    );
  }
}

