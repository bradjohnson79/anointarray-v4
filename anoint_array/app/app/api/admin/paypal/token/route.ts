import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConfig } from '@/lib/app-config';

async function loadConfig() {
  try { return (await getConfig<any>('storefront-payments')) || {}; } catch { return {}; }
}

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cfg = await loadConfig();
  const useSandbox = !!cfg?.paypal?.testMode;
  let clientId = (useSandbox ? cfg?.paypal?.testClientId : cfg?.paypal?.clientId) || '';
  let clientSecret = (useSandbox ? cfg?.paypal?.testClientSecret : cfg?.paypal?.clientSecret) || '';
  if (!clientId || clientId === '***') clientId = (useSandbox ? process.env.PAYPAL_CLIENT_ID_SANDBOX : process.env.PAYPAL_CLIENT_ID_LIVE) || '';
  if (!clientSecret || clientSecret === '***') clientSecret = (useSandbox ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX : process.env.PAYPAL_SECRET_LIVE) || '';
  clientId = clientId.trim();
  clientSecret = clientSecret.trim();
  if (!cfg?.paypal?.enabled || !clientId || !clientSecret) return NextResponse.json({ error: 'PayPal not configured' }, { status: 400 });

  const base = useSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';
  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) {
    const t = await r.text();
    return NextResponse.json({ error: `Token request failed: ${t}` }, { status: 500 });
  }
  const j = await r.json();
  // Return the token, scope, token_type, expires_in. Do NOT log server-side.
  return NextResponse.json({ mode: useSandbox ? 'sandbox' : 'live', access_token: j.access_token, token_type: j.token_type, expires_in: j.expires_in, scope: j.scope });
}

