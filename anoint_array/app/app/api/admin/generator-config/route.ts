
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/app-config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    // Save configuration to DB
    await setConfig('generator-config', data);
    
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
      const config = await getConfig<any>('generator-config');
      if (config) return NextResponse.json(config);
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
