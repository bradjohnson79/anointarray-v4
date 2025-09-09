
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'generator-data', 'generator-config.json');

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Save configuration to file
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving generator config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
      const config = JSON.parse(configData);
      return NextResponse.json(config);
    } catch (fileError) {
      // Return default config if file doesn't exist
      const defaultConfig = {
        settings: {
          centerX: 0,
          centerY: 0,
          innerRadius: 120,
          outerRadius: 180,
          showGrid: true,
          showWatermark: true,
          canvasSize: 600
        },
        coordinates: []
      };
      return NextResponse.json(defaultConfig);
    }
  } catch (error) {
    console.error('Error loading generator config:', error);
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
  }
}
