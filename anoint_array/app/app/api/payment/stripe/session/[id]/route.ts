import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_TEST_KEY;
  if (!key) throw new Error('Stripe key not configured');
  return new Stripe(key);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(params.id);
    return NextResponse.json({
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      url: session.url,
      amount_total: session.amount_total,
      currency: session.currency,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to retrieve session' }, { status: 500 });
  }
}

