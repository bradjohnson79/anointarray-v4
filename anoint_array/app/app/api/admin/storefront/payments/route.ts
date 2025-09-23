import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createSupabaseServerClient, useSupabaseStorage, PRODUCT_IMAGES_BUCKET } from '@/lib/supabase-server';

const FILE = path.join(process.cwd(), 'data', 'storefront-payments.json');

function bool(v: any) { return v === true || String(v || '').toLowerCase() === 'true'; }

export async function GET() {
  try {
    let fileCfg: any = {};
    try { if (fsSync.existsSync(FILE)) fileCfg = JSON.parse(await fs.readFile(FILE, 'utf-8')); }
    catch {}
    if ((!fileCfg || !Object.keys(fileCfg).length) && useSupabaseStorage()) {
      try {
        const supabase = createSupabaseServerClient();
        const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs' || PRODUCT_IMAGES_BUCKET || 'Storage';
        const { data, error } = await supabase.storage.from(bucket).download('configs/storefront-payments.json');
        if (!error && data) {
          let text = '';
          if (typeof (data as any).text === 'function') text = await (data as any).text();
          else if (typeof (data as any).arrayBuffer === 'function') {
            const buf = Buffer.from(await (data as any).arrayBuffer()); text = buf.toString('utf8');
          }
          fileCfg = JSON.parse(text || '{}');
        }
      } catch {}
    }

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
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const body = await req.json();
    const payload = { ...body, lastUpdated: new Date().toISOString() };
    try {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(payload, null, 2), 'utf8');
      return NextResponse.json({ ok: true, storage: 'file' });
    } catch (e: any) {
      try {
        if (!useSupabaseStorage()) throw new Error('Supabase storage not configured');
        // Store sanitized snapshot (no secrets) in Supabase storage for UI reading in RO envs
        const safe: any = {
          stripe: { enabled: !!payload?.stripe?.enabled, testMode: !!payload?.stripe?.testMode },
          paypal: { enabled: !!payload?.paypal?.enabled, testMode: !!payload?.paypal?.testMode },
          nowPayments: { enabled: !!payload?.nowPayments?.enabled, testMode: !!payload?.nowPayments?.testMode },
          pricing: { currency: String(payload?.pricing?.currency || 'USD').toUpperCase() },
          lastUpdated: new Date().toISOString(),
        };
        const supabase = createSupabaseServerClient();
        const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs' || PRODUCT_IMAGES_BUCKET || 'Storage';
        const blob = new Blob([JSON.stringify(safe)], { type: 'application/json' });
        const { error } = await supabase.storage.from(bucket).upload('configs/storefront-payments.json', blob, { upsert: true, contentType: 'application/json' });
        if (error) throw error;
        return NextResponse.json({ ok: true, storage: 'supabase' });
      } catch (be: any) {
        return NextResponse.json({ error: be?.message || e?.message || 'Failed to save configuration' }, { status: 500 });
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save configuration' }, { status: 500 });
  }
}
