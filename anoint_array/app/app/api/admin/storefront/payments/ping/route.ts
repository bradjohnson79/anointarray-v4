import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import Stripe from 'stripe';

const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');

async function loadConfig() {
  try { const raw = await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8'); return JSON.parse(raw); } catch { return {}; }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cfg = await loadConfig();

    // Stripe
    let stripeStatus = { ok: false, message: 'disabled' } as any;
    try {
      const useTest = !!cfg?.stripe?.testMode;
      let key = useTest ? (cfg?.stripe?.testSecretKey) : (cfg?.stripe?.secretKey);
      if (key === '***' || !key) key = useTest ? process.env.STRIPE_SECRET_TEST_KEY : process.env.STRIPE_SECRET_KEY;
      if (cfg?.stripe?.enabled && key) {
        const stripe = new Stripe(key, {} as any);
        const account = await stripe.accounts.retrieve();
        stripeStatus = { ok: true, message: account.email || account.id };
      } else {
        stripeStatus = { ok: false, message: 'not configured' };
      }
    } catch (e: any) {
      stripeStatus = { ok: false, message: e?.message || String(e) };
    }

    // PayPal
    let paypalStatus = { ok: false, message: 'disabled' } as any;
    try {
      const useSandbox = !!cfg?.paypal?.testMode;
      let clientId = (useSandbox ? cfg?.paypal?.testClientId : cfg?.paypal?.clientId) || '';
      let clientSecret = (useSandbox ? cfg?.paypal?.testClientSecret : cfg?.paypal?.clientSecret) || '';
      if (!clientId || clientId === '***') clientId = (useSandbox ? process.env.PAYPAL_CLIENT_ID_SANDBOX : process.env.PAYPAL_CLIENT_ID_LIVE) || '';
      if (!clientSecret || clientSecret === '***') clientSecret = (useSandbox ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX : process.env.PAYPAL_SECRET_LIVE) || '';
      clientId = clientId.trim();
      clientSecret = clientSecret.trim();
      const base = useSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';
      if (cfg?.paypal?.enabled && clientId && clientSecret) {
        const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` }, body: 'grant_type=client_credentials'
        });
        if (tokenRes.ok) {
          const j = await tokenRes.json();
          paypalStatus = { ok: true, message: `token ok (expires_in=${j.expires_in})`, mode: useSandbox ? 'sandbox' : 'live', clientIdPrefix: clientId.slice(0,6) };
        } else {
          const t = await tokenRes.text();
          paypalStatus = { ok: false, message: `token failed: ${t}` };
        }
      } else {
        paypalStatus = { ok: false, message: 'not configured' };
      }
    } catch (e: any) {
      paypalStatus = { ok: false, message: e?.message || String(e) };
    }

    // NOWPayments
    let nowStatus = { ok: false, message: 'disabled' } as any;
    try {
      let apiKey = cfg?.nowPayments?.apiKey || cfg?.nowPayments?.testApiKey;
      if (apiKey === '***' || !apiKey) apiKey = process.env.NOWPAYMENTS_API_KEY;
      if (cfg?.nowPayments?.enabled && apiKey) {
        const r = await fetch('https://api.nowpayments.io/v1/status', { headers: { 'x-api-key': apiKey } });
        if (r.ok) {
          const j = await r.json();
          nowStatus = { ok: true, message: j?.message || 'OK' };
        } else {
          const t = await r.text();
          nowStatus = { ok: false, message: t };
        }
      } else {
        nowStatus = { ok: false, message: 'not configured' };
      }
    } catch (e: any) {
      nowStatus = { ok: false, message: e?.message || String(e) };
    }

    return NextResponse.json({ stripe: stripeStatus, paypal: paypalStatus, nowPayments: nowStatus });
  } catch (e) {
    console.error('payments ping error', e);
    return NextResponse.json({ error: 'Ping failed' }, { status: 500 });
  }
}
