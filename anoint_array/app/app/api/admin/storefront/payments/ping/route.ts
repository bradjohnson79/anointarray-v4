import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const stripePub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';
    const stripeSec = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_TEST_KEY || '';
    const paypalId = process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID_LIVE || '';
    const paypalSecret = process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_SECRET_LIVE || '';
    const direct = process.env.DIRECT_URL || '';
    const database = process.env.DATABASE_URL || '';
    const ok = !!(stripePub && stripeSec && paypalId && paypalSecret && (direct || database));
    return NextResponse.json({ ok, stripePub: !!stripePub, stripeSec: !!stripeSec, paypalId: !!paypalId, paypalSecret: !!paypalSecret, direct: !!direct || !!database });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

