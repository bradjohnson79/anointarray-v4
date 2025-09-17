import { NextResponse } from 'next/server';
import { resolvePaypalConfig } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const conf = await resolvePaypalConfig();
    const basic = Buffer.from(`${conf.clientId}:${conf.clientSecret}`).toString('base64');
    const resp = await fetch(conf.base.replace(/\/$/, '') + '/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${basic}` },
      body: 'grant_type=client_credentials',
    });
    const j: any = await resp.json();
    if (!resp.ok) throw new Error(j?.error_description || j?.error || 'Token fetch failed');
    return NextResponse.json({ access_token: j?.access_token, expires_in: j?.expires_in, scope: j?.scope, mode: conf.useSandbox ? 'SANDBOX' : 'LIVE' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to get token' }, { status: 500 });
  }
}

