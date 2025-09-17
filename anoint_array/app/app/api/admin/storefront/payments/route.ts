import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'storefront-payments.json');

function bool(v: any) { return v === true || String(v || '').toLowerCase() === 'true'; }

export async function GET() {
  try {
    let fileCfg: any = {};
    try { if (fsSync.existsSync(FILE)) fileCfg = JSON.parse(await fs.readFile(FILE, 'utf-8')); } catch {}

    const stripeTest = bool(fileCfg?.stripe?.testMode) || !!process.env.STRIPE_SECRET_TEST_KEY;
    const stripe = {
      enabled: bool(fileCfg?.stripe?.enabled ?? true),
      testMode: stripeTest,
      publishableKey: fileCfg?.stripe?.publishableKey || (stripeTest ? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_TEST_KEY || '') : (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')),
      secretKey: fileCfg?.stripe?.secretKey || (stripeTest ? (process.env.STRIPE_SECRET_TEST_KEY || '') : (process.env.STRIPE_SECRET_KEY || '')),
      webhookSecret: fileCfg?.stripe?.webhookSecret || (process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_TEST_SECRET || ''),
      testPublishableKey: fileCfg?.stripe?.testPublishableKey || (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_TEST_KEY || ''),
      testSecretKey: fileCfg?.stripe?.testSecretKey || (process.env.STRIPE_SECRET_TEST_KEY || ''),
      testWebhookSecret: fileCfg?.stripe?.testWebhookSecret || (process.env.STRIPE_WEBHOOK_TEST_SECRET || ''),
    };

    const paypalSandbox = bool(fileCfg?.paypal?.testMode) || true; // default sandbox if unset
    const paypal = {
      enabled: bool(fileCfg?.paypal?.enabled ?? true),
      testMode: paypalSandbox,
      clientId: fileCfg?.paypal?.clientId || (paypalSandbox ? (process.env.PAYPAL_CLIENT_ID_SANDBOX || '') : (process.env.PAYPAL_CLIENT_ID_LIVE || '')),
      clientSecret: fileCfg?.paypal?.clientSecret || (paypalSandbox ? (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || '') : (process.env.PAYPAL_SECRET_LIVE || '')),
      testClientId: fileCfg?.paypal?.testClientId || (process.env.PAYPAL_CLIENT_ID_SANDBOX || ''),
      testClientSecret: fileCfg?.paypal?.testClientSecret || (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || ''),
    };

    const nowPayments = fileCfg?.nowPayments || { enabled: false, testMode: true, apiKey: '', publicKey: '', testApiKey: '', testPublicKey: '' };
    const pricing = { currency: (fileCfg?.pricing?.currency || 'USD').toUpperCase() };

    const isConfigured = !!((stripe.secretKey || stripe.testSecretKey) && (stripe.publishableKey || stripe.testPublishableKey)) || !!(paypal.clientId || paypal.testClientId);

    return NextResponse.json({ stripe, paypal, nowPayments, pricing, isConfigured, lastUpdated: fileCfg?.lastUpdated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to read configuration' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const payload = { ...body, lastUpdated: new Date().toISOString() };
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(payload, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save configuration' }, { status: 500 });
  }
}

