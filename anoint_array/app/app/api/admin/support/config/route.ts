import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const SUPPORT_CFG = path.join(process.cwd(), 'data', 'support-config.json');

async function ensure() { const dir = path.join(process.cwd(), 'data'); try{ await fs.access(dir);}catch{ await fs.mkdir(dir,{recursive:true}); } }

export async function GET() {
  await ensure();
  try {
    const raw = await fs.readFile(SUPPORT_CFG, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ enabled: false, description: '', kbFiles: [] });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cfg = await request.json();
  await ensure();
  await fs.writeFile(SUPPORT_CFG, JSON.stringify(cfg, null, 2));
  return NextResponse.json({ success: true });
}

