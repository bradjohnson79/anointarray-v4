import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');

interface PaymentGatewayConfiguration {
  stripe: { enabled: boolean; testMode: boolean; publishableKey: string; secretKey: string; webhookSecret: string; testPublishableKey: string; testSecretKey: string; testWebhookSecret: string };
  paypal: { enabled: boolean; testMode: boolean; clientId: string; clientSecret: string; testClientId: string; testClientSecret: string };
  nowPayments: { enabled: boolean; testMode: boolean; apiKey: string; publicKey: string; testApiKey: string; testPublicKey: string };
  pricing?: { currency: string };
  isConfigured: boolean;
  lastUpdated?: string;
}

async function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  try { await fs.access(dir); } catch { await fs.mkdir(dir, { recursive: true }); }
}

export async function GET() {
  try {
    await ensureDataDir();
    try {
      const raw = await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8');
      const cfg = JSON.parse(raw);
      // Compute configured using environment fallbacks so UI can show accurate status
      const hasStripeLive = !!(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY);
      const hasStripeTest = !!(process.env.STRIPE_PUBLISHABLE_TEST_KEY && process.env.STRIPE_SECRET_TEST_KEY);
      const stripeConfigured = !!cfg?.stripe?.enabled && (
        (cfg?.stripe?.testMode && hasStripeTest) || (!cfg?.stripe?.testMode && hasStripeLive)
      );
      const hasPaypalLive = !!(process.env.PAYPAL_CLIENT_ID_LIVE && process.env.PAYPAL_SECRET_LIVE);
      const hasPaypalSandbox = !!(process.env.PAYPAL_CLIENT_ID_SANDBOX && process.env.PAYPAL_CLIENT_SECRET_SANDBOX);
      const paypalConfigured = !!cfg?.paypal?.enabled && (
        (cfg?.paypal?.testMode && hasPaypalSandbox) || (!cfg?.paypal?.testMode && hasPaypalLive)
      );
      const hasNow = !!(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_PUBLIC_KEY);
      const nowConfigured = !!cfg?.nowPayments?.enabled && hasNow;

      const isConfigured = !!(stripeConfigured || paypalConfigured || nowConfigured);

      // Mask sensitive fields before returning
      const masked = {
        ...cfg,
        isConfigured,
        stripe: {
          ...cfg.stripe,
          secretKey: cfg.stripe?.secretKey ? '***' : '',
          webhookSecret: cfg.stripe?.webhookSecret ? '***' : '',
          testSecretKey: cfg.stripe?.testSecretKey ? '***' : '',
          testWebhookSecret: cfg.stripe?.testWebhookSecret ? '***' : '',
        },
        paypal: {
          ...cfg.paypal,
          clientSecret: cfg.paypal?.clientSecret ? '***' : '',
          testClientSecret: cfg.paypal?.testClientSecret ? '***' : '',
        },
        nowPayments: {
          ...cfg.nowPayments,
          apiKey: cfg.nowPayments?.apiKey ? '***' : '',
          testApiKey: cfg.nowPayments?.testApiKey ? '***' : '',
        },
      };
      return NextResponse.json(masked);
    } catch {
      // default config (pull from env if available)
      const cfg: PaymentGatewayConfiguration = {
        stripe: {
          enabled: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
          testMode: true,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
          secretKey: process.env.STRIPE_SECRET_KEY ? '***' : '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '***' : '',
          testPublishableKey: process.env.STRIPE_PUBLISHABLE_TEST_KEY || '',
          testSecretKey: process.env.STRIPE_SECRET_TEST_KEY ? '***' : '',
          testWebhookSecret: process.env.STRIPE_WEBHOOK_TEST_SECRET ? '***' : '',
        },
        paypal: {
          enabled: !!(process.env.PAYPAL_CLIENT_ID_LIVE && process.env.PAYPAL_SECRET_LIVE),
          testMode: true,
          clientId: process.env.PAYPAL_CLIENT_ID_LIVE || '',
          clientSecret: process.env.PAYPAL_SECRET_LIVE ? '***' : '',
          testClientId: process.env.PAYPAL_CLIENT_ID_SANDBOX || '',
          testClientSecret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX ? '***' : '',
        },
        nowPayments: {
          enabled: !!(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_PUBLIC_KEY),
          testMode: false,
          apiKey: process.env.NOWPAYMENTS_API_KEY ? '***' : '',
          publicKey: process.env.NOWPAYMENTS_PUBLIC_KEY || '',
          testApiKey: process.env.NOWPAYMENTS_API_KEY ? '***' : '',
          testPublicKey: process.env.NOWPAYMENTS_PUBLIC_KEY || '',
        },
        pricing: { currency: 'USD' },
        isConfigured: !!(
          (process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY) ||
          (process.env.STRIPE_PUBLISHABLE_TEST_KEY && process.env.STRIPE_SECRET_TEST_KEY) ||
          (process.env.PAYPAL_CLIENT_ID_LIVE && process.env.PAYPAL_SECRET_LIVE) ||
          (process.env.PAYPAL_CLIENT_ID_SANDBOX && process.env.PAYPAL_CLIENT_SECRET_SANDBOX) ||
          (process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_PUBLIC_KEY)
        ),
      };
      return NextResponse.json(cfg);
    }
  } catch (e) {
    console.error('Storefront payments GET error:', e);
    return NextResponse.json({ error: 'Failed to load payments config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const cfg = (await request.json()) as PaymentGatewayConfiguration;
    cfg.lastUpdated = new Date().toISOString();
    cfg.isConfigured = !!(
      (cfg.stripe.enabled && ((cfg.stripe.testMode && cfg.stripe.testSecretKey) || (!cfg.stripe.testMode && cfg.stripe.secretKey))) ||
      (cfg.paypal.enabled && ((cfg.paypal.testMode && cfg.paypal.testClientId) || (!cfg.paypal.testMode && cfg.paypal.clientId))) ||
      (cfg.nowPayments.enabled && (cfg.nowPayments.apiKey || cfg.nowPayments.testApiKey))
    );
    await ensureDataDir();
    await fs.writeFile(STORE_PAYMENTS_PATH, JSON.stringify(cfg, null, 2));
    return NextResponse.json({ success: true, isConfigured: cfg.isConfigured });
  } catch (e) {
    console.error('Storefront payments POST error:', e);
    return NextResponse.json({ error: 'Failed to save payments config' }, { status: 500 });
  }
}
