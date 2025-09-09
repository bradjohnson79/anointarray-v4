import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

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
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checks: Check[] = [];

    // Database connectivity and counts
    try {
      // Connectivity probe
      await prisma.$queryRaw`SELECT 1`;
      // Run individual counts with guards so one missing table doesn't mask the rest
      const res: any = { connected: true };
      const dbInfo = parseDbUrlInfo(process.env.DATABASE_URL);
      if (dbInfo) res.target = `${dbInfo.host}:${dbInfo.port}/${dbInfo.db} (${dbInfo.user || 'user'})`;
      try { res.ordersCount = await prisma.order.count(); } catch (e: any) { res.ordersCount = 'n/a'; res.ordersError = String(e?.message || e); }
      try { res.productsCount = await prisma.product.count(); } catch (e: any) { res.productsCount = 'n/a'; res.productsError = String(e?.message || e); }
      try { res.usersCount = await prisma.user.count(); } catch (e: any) { res.usersCount = 'n/a'; res.usersError = String(e?.message || e); }
      try { res.adminsCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } }); } catch (e: any) { res.adminsCount = 'n/a'; res.adminsError = String(e?.message || e); }
      const status: CheckStatus = (typeof res.ordersCount === 'string' || typeof res.productsCount === 'string' || typeof res.usersCount === 'string') ? 'warn' : 'ok';
      checks.push({ key: 'db', label: 'Database', status, details: res });
    } catch (e: any) {
      const dbUrl = process.env.DATABASE_URL || '';
      // Attempt simple alternate-port probes using Prisma override
      const suggestions: any = { error: String(e?.message || e) };
      const dbInfo = parseDbUrlInfo(dbUrl);
      if (dbInfo) suggestions.target = dbInfo;
      try {
        const url = new URL(dbUrl);
        const base = `${url.protocol}//${url.username ? `${url.username}${url.password ? ':' + url.password : ''}@` : ''}${url.hostname}`;
        const path = `${url.pathname}${url.search}${url.hash}`;
        const currentPort = url.port ? Number(url.port) : 5432;
        const candidates = [5432, 5433].filter(p => p !== currentPort);
        const probeResults: Record<string, any> = {};
        for (const p of candidates) {
          const alt = `${base}:${p}${path}`;
          try {
            const { PrismaClient } = await import('@prisma/client');
            const client = new PrismaClient({ datasources: { db: { url: alt } } });
            await client.$queryRaw`SELECT 1`;
            await client.$disconnect();
            probeResults[p] = 'ok';
            suggestions.recommendedDatabaseUrl = alt;
            suggestions.recommendation = `Database reachable at port ${p}. Update .env.local DATABASE_URL to use :${p} and restart dev server.`;
            break;
          } catch (pe: any) {
            probeResults[p] = String(pe?.message || pe);
          }
        }
        suggestions.probes = probeResults;
      } catch {
        // ignore URL parsing errors
      }
      // Local Postgres hints (no Docker)
      suggestions.howToCheck = 'Ensure PostgreSQL is running locally. Example: lsof -i :5432 (macOS), or psql connection test.';
      suggestions.howToStartMacHomebrew = 'brew services start postgresql@16 (or your installed version)';
      suggestions.howToStartLinux = 'sudo systemctl start postgresql (or service postgresql start)';
      suggestions.howToMigrate = 'In project root: pnpm prisma db push (then optionally seed via Admin > Seed Sample Orders)';
      suggestions.envClarification = 'Prisma CLI reads .env by default; Next.js reads .env.local at runtime. Keep DATABASE_URL in both files in sync.';

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
    const shippoCpAccount = !!process.env.SHIPPO_CP_ACCOUNT_ID;
    checks.push({
      key: 'shippo',
      label: 'Shippo (Canada Post)',
      status: (shippoLive || shippoTest) ? 'ok' : 'warn',
      details: { shippoLive, shippoTest, shippoCpAccount }
    });

    const cpCreds = !!(
      (process.env.CANPOST_PROD_USERNAME && process.env.CANPOST_PROD_PASSWORD) ||
      (process.env.CANPOST_DEV_USERNAME && process.env.CANPOST_DEV_PASSWORD)
    );
    checks.push({ key: 'canadapost', label: 'Canada Post API (Direct)', status: cpCreds ? 'ok' : 'warn' });

    // Emails
    const resend = !!process.env.RESEND_API_KEY;
    checks.push({ key: 'email', label: 'Email (Resend)', status: resend ? 'ok' : 'warn' });

    // Support AI
    const openai = !!process.env.OPENAI_API_KEY;
    checks.push({ key: 'ai', label: 'Support AI', status: openai ? 'ok' : 'warn' });

    // Orders health
    try {
      const lastOrder = await prisma.order.findFirst({ orderBy: { createdAt: 'desc' } });
      // Successful read is OK; include hasAny detail
      checks.push({ key: 'orders', label: 'Orders Read', status: 'ok', details: { hasAny: !!lastOrder } });
    } catch (e: any) {
      checks.push({ key: 'orders', label: 'Orders Read', status: 'error', message: 'Cannot query orders table', details: { error: String(e?.message || e) } });
    }

    // Products health
    try {
      const firstProduct = await prisma.product.findFirst();
      checks.push({ key: 'products', label: 'Products', status: firstProduct ? 'ok' : 'warn', details: { hasAny: !!firstProduct } });
    } catch (e: any) {
      checks.push({ key: 'products', label: 'Products', status: 'error', message: 'Cannot query products table', details: { error: String(e?.message || e) } });
    }

    // Result
    const ok = checks.every(c => c.status !== 'error');
    return NextResponse.json({ ok, checks });
  } catch (e) {
    console.error('Precheck error:', e);
    return NextResponse.json({ error: 'Precheck failed' }, { status: 500 });
  }
}
