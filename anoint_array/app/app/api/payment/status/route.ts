import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/api-handler';
import fs from 'fs/promises';
import path from 'path';
import Stripe from 'stripe';

const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');

export const dynamic = 'force-dynamic';

async function handler(_req: NextRequest) {
  const checks: any[] = [];
  try {
    let cfg: any = {};
    try { cfg = JSON.parse(await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8')); } catch {}

    // Stripe
    try {
      const useTest = !!cfg?.stripe?.testMode;
      const secret = (useTest ? cfg?.stripe?.testSecretKey : cfg?.stripe?.secretKey) || process.env.STRIPE_SECRET_KEY;
      const pub = (useTest ? cfg?.stripe?.testPublishableKey : cfg?.stripe?.publishableKey) || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      const ok = !!secret && !!pub;
      checks.push({ key: 'stripeKeys', label: 'Stripe keys present', ok });
      if (ok) {
        try {
          const stripe = new Stripe(secret!);
          await stripe.accounts.retrieve();
          checks.push({ key: 'stripePing', label: 'Stripe API reachable', ok: true });
        } catch (e: any) {
          checks.push({ key: 'stripePing', label: 'Stripe API reachable', ok: false, detail: e?.message });
        }
      }
    } catch (e: any) {
      checks.push({ key: 'stripe', label: 'Stripe check failed', ok: false, detail: e?.message });
    }

    // PayPal
    try {
      const useSandbox = !!cfg?.paypal?.testMode;
      const clientId = (useSandbox ? cfg?.paypal?.testClientId : cfg?.paypal?.clientId) || process.env.PAYPAL_CLIENT_ID_SANDBOX;
      const secret = (useSandbox ? cfg?.paypal?.testClientSecret : cfg?.paypal?.clientSecret) || process.env.PAYPAL_CLIENT_SECRET_SANDBOX;
      checks.push({ key: 'paypalCreds', label: 'PayPal credentials present', ok: !!clientId && !!secret });
    } catch (e: any) {
      checks.push({ key: 'paypal', label: 'PayPal check failed', ok: false, detail: e?.message });
    }

    // NOWPayments
    try {
      const key = cfg?.nowPayments?.apiKey || cfg?.nowPayments?.testApiKey || process.env.NOWPAYMENTS_API_KEY;
      checks.push({ key: 'nowPaymentsKey', label: 'NOWPayments API key present', ok: !!key });
    } catch (e: any) {
      checks.push({ key: 'nowPayments', label: 'NOWPayments check failed', ok: false, detail: e?.message });
    }

    const ok = checks.every(c => c.ok !== false);
    return NextResponse.json({ ok, checks });
  } catch (e: any) {
    checks.push({ key: 'exception', label: 'Exception during payment status check', ok: false, detail: e?.message || String(e) });
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }
}

export const GET = withApiErrorHandling(handler, '/api/payment/status');
