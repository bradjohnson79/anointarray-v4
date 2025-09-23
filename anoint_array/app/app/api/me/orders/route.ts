import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const email = (user?.email || '').toLowerCase();
  if (!email) return NextResponse.json([]);
  const orders = await callConvex({ functionPath: 'orders:byEmail', args: { email } });
  return NextResponse.json(orders || []);
}
