import { NextRequest, NextResponse } from 'next/server';
import { getFxRate } from '@/lib/currency';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const to = (searchParams.get('to') || 'USD').toUpperCase();
    const from = (searchParams.get('from') || 'USD').toUpperCase();
    const rate = await getFxRate(from, to);
    return NextResponse.json({ from, to, rate });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch rate' }, { status: 500 });
  }
}

