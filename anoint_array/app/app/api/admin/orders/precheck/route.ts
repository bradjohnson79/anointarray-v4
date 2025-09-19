import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import { getConfig } from '@/lib/app-config';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CheckStatus = 'ok' | 'warn' | 'error';

interface Check {
  key: string;
  label: string;
  status: CheckStatus;
  details?: any;
  message?: string;
}

async function fileExists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

function parseDbUrlInfo(dbUrl: string | undefined) {
  try {
    if (!dbUrl) return null;
    const u = new URL(dbUrl);
    const host = u.hostname;
    const port = u.port || '5432';
    const db = (u.pathname || '').replace(/^\//, '') || '';
    const user = u.username || '';
    return { host, port, db, user };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const checks: Check[] = [];

    // Database connectivity and counts
    try {
      const s = createSupabaseAdminClient();
      const res: any = { connected: true };
      const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url) res.target = url;
      const oc = await s.from('orders').select('*', { count: 'exact', head: true });
      const pc = await s.from('products').select('*', { count: 'exact', head: true });
      const uc = await s.from('users').select('*', { count: 'exact', head: true });
      const ac = await s.from('users').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN').eq('isActive', true);
      res.ordersCount = oc.count ?? 'n/a';
      res.productsCount = pc.count ?? 'n/a';
      res.usersCount = uc.count ?? 'n/a';
      res.adminsCount = ac.count ?? 'n/a';
      const status: CheckStatus = (typeof res.ordersCount === 'string' || typeof res.productsCount === 'string' || typeof res.usersCount === 'string') ? 'warn' : 'ok';
      checks.push({ key: 'db', label: 'Database', status, details: res });
    } catch (e: any) {
      const suggestions: any = { error: String(e?.message || e) };
      suggestions.howToCheck = 'Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars. Test /api/debug/db';
      checks.push({ key: 'db', label: 'Database', status: 'error', message: 'Database connection failed', details: suggestions });
    }

    // NextAuth
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    checks.push({
      key: 'nextauth',
      label: 'Auth (NextAuth)',
      status: nextAuthUrl && nextAuthSecret ? 'ok' : 'warn',
      details: { NEXTAUTH_URL: !!nextAuthUrl, NEXTAUTH_SECRET: !!nextAuthSecret }
    });

    // Payments: storefront config file and envs
    const dataDir = path.join(process.cwd(), 'data');
    const storefrontCfgPath = path.join(dataDir, 'storefront-payments.json');
    let storefrontCfg: any = null;
    if (await fileExists(storefrontCfgPath)) {
      try { storefrontCfg = JSON.parse(await fs.readFile(storefrontCfgPath, 'utf-8')); } catch {}
    }
    const stripeLive = !!(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY);
    const stripeTest = !!(process.env.STRIPE_PUBLISHABLE_TEST_KEY && process.env.STRIPE_SECRET_TEST_KEY);
    const stripeWebhook = !!(process.env.STRIPE_WEBHOOK_SECRET);
    const paypalLive = !!(process.env.PAYPAL_CLIENT_ID_LIVE && process.env.PAYPAL_SECRET_LIVE);
    const paypalSandbox = !!(process.env.PAYPAL_CLIENT_ID_SANDBOX && process.env.PAYPAL_CLIENT_SECRET_SANDBOX);
    const nowPay = !!(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_PUBLIC_KEY);
    checks.push({
      key: 'payments',
      label: 'Payments (Storefront)',
      status: (stripeLive || stripeTest || paypalLive || paypalSandbox || nowPay) ? 'ok' : 'warn',
      details: {
        configPresent: !!storefrontCfg || stripeLive || stripeTest || paypalLive || paypalSandbox || nowPay,
        stripeLive, stripeTest, stripeWebhook,
        paypalLive, paypalSandbox,
        nowPay,
      }
    });

    // Shippo / Canada Post
    const shippoLive = !!process.env.SHIPPO_API_KEY;
    const shippoTest = !!process.env.SHIPPO_API_TEST_KEY;
    const cfg = await getConfig<any>('shipping-config');
    const cpAccountId = cfg?.carrierAccountIds?.canadaPost || process.env.SHIPPO_CP_ACCOUNT_ID;
    const upsAccountId = cfg?.carrierAccountIds?.upsCanada || process.env.SHIPPO_UPS_CA_ACCOUNT_ID;
    const shippoCpAccount = !!cpAccountId;
    const shippoUpsAccount = !!upsAccountId;
    checks.push({
      key: 'shippo',
      label: 'Shippo (Canada Post / UPS CA)',
      status: (shippoLive || shippoTest) ? 'ok' : 'warn',
      details: { shippoLive, shippoTest, canadaPostAccount: shippoCpAccount, upsCanadaAccount: shippoUpsAccount }
    });

    const cpCreds = !!(
      (process.env.CANPOST_PROD_USERNAME && process.env.CANPOST_PROD_PASSWORD) ||
      (process.env.CANPOST_DEV_USERNAME && process.env.CANPOST_DEV_PASSWORD)
    );
    checks.push({ key: 'canadapost', label: 'Canada Post API (Direct)', status: cpCreds ? 'ok' : 'warn' });

    // Emails (Provider)
    const emailProvider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
    const hasResend = !!process.env.RESEND_API_KEY;
    const hasPostmark = !!process.env.POSTMARK_SERVER_TOKEN;
    const emailOk = emailProvider === 'postmark' ? hasPostmark : (emailProvider === 'resend' ? hasResend : (hasPostmark || hasResend));
    checks.push({ key: 'email', label: 'Email (Provider)', status: emailOk ? 'ok' : 'warn', details: { provider: emailProvider || (hasPostmark ? 'postmark' : (hasResend ? 'resend' : 'none')) } });

    // Support AI
    const openai = !!process.env.OPENAI_API_KEY;
    checks.push({ key: 'ai', label: 'Support AI', status: openai ? 'ok' : 'warn' });

    // Orders health
    try {
      const s = createSupabaseAdminClient();
      const { count: oc } = await s.from('orders').select('*', { count: 'exact', head: true });
      checks.push({ key: 'orders', label: 'Orders Read', status: 'ok', details: { hasAny: !!(oc && oc > 0) } });
    } catch (e: any) {
      checks.push({ key: 'orders', label: 'Orders Read', status: 'error', message: 'Cannot query orders table', details: { error: String(e?.message || e) } });
    }

    // Products health
    try {
      const s = createSupabaseAdminClient();
      const { count: pc } = await s.from('products').select('*', { count: 'exact', head: true });
      checks.push({ key: 'products', label: 'Products', status: (pc && pc > 0) ? 'ok' : 'warn', details: { hasAny: !!(pc && pc > 0) } });
    } catch (e: any) {
      checks.push({ key: 'products', label: 'Products', status: 'error', message: 'Cannot query products table', details: { error: String(e?.message || e) } });
    }

    // Result
    const ok = checks.every(c => c.status !== 'error');
    return NextResponse.json({ ok, checks });
  } catch (e: any) {
    console.error('Precheck error:', e);
    const detail = typeof e?.message === 'string' ? e.message : String(e);
    return NextResponse.json({ error: 'Precheck failed', detail }, { status: 500 });
  }
}
