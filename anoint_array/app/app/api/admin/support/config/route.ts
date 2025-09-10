import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/app-config';
import fs from 'fs/promises';
import path from 'path';

const SUPPORT_CFG = path.join(process.cwd(), 'data', 'support-config.json');

async function ensure() { /* no-op for DB storage; retained for backward compat */ }

export async function GET() {
  try {
    const cfg = await getConfig<any>('support-config');
    if (cfg) return NextResponse.json(cfg);
  } catch {}
  return NextResponse.json({ enabled: false, description: '', kbFiles: [] });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cfg = await request.json();
  await setConfig('support-config', cfg);
  return NextResponse.json({ success: true });
}
