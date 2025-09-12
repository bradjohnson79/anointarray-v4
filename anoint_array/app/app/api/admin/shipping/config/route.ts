import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/app-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ShippingConfig = {
  origin?: { name?: string; company?: string; street1?: string; city?: string; state?: string; zip?: string; country?: string; phone?: string };
  parcelDefault?: { length?: number; width?: number; height?: number; distance_unit?: 'cm'|'in'; weight?: number; mass_unit?: 'kg'|'lb' };
  carrierAccountIds?: { canadaPost?: string; upsCanada?: string };
  parcelTemplateId?: string;
};

const KEY = 'shipping-config';

export async function GET() {
  const cfg = await getConfig<ShippingConfig>(KEY);
  return NextResponse.json(cfg || {});
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cfg = (await req.json()) as ShippingConfig;
  await setConfig(KEY, cfg || {});
  return NextResponse.json({ success: true });
}

