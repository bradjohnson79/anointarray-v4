import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolvePaypalConfig, getPaypalAccessToken } from '@/lib/paypal';
import { resolveStripeConfig } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  const out: any = {};
  // Stripe
  try {
    const conf = await resolveStripeConfig();
    if (!conf.secretKey) throw new Error('Missing Stripe secret key');
    const s = new Stripe(conf.secretKey);
    const acct = await s.accounts.retrieve();
    out.stripe = { ok: true, message: `Account ${acct.id} (${acct?.email || 'n/a'})` };
  } catch (e: any) {
    out.stripe = { ok: false, message: e?.message || 'Stripe ping failed' };
  }

  // PayPal
  try {
    const conf = await resolvePaypalConfig();
    const token = await getPaypalAccessToken(conf);
    out.paypal = { ok: !!token, message: token ? `Token acquired (${conf.useSandbox ? 'SANDBOX' : 'LIVE'})` : 'No token' };
  } catch (e: any) {
    out.paypal = { ok: false, message: e?.message || 'PayPal ping failed' };
  }

  return NextResponse.json(out);
}

