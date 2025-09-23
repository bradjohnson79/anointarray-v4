import { NextRequest, NextResponse } from 'next/server';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getPayPalBase() {
  const env = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase();
  return env === 'LIVE' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
}
async function getPayPalAccessToken() {
  const env = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const clientId = env === 'LIVE' ? process.env.PAYPAL_CLIENT_ID_LIVE : process.env.PAYPAL_CLIENT_ID_SANDBOX;
  const secret = env === 'LIVE' ? process.env.PAYPAL_SECRET_LIVE : process.env.PAYPAL_CLIENT_SECRET_SANDBOX;
  if (!clientId || !secret) throw new Error('PayPal credentials missing');
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const base = getPayPalBase();
  const resp = await fetch(`${base}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  const j = await resp.json();
  if (!resp.ok) throw new Error(j?.error_description || 'PayPal auth failed');
  return j.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    // Read body early (not raw validation — we verify via PayPal API call below)
    const event = await req.json();
    const base = getPayPalBase();
    // Verify webhook signature using PayPal API
    const transId = req.headers.get('paypal-transmission-id') || '';
    const transTime = req.headers.get('paypal-transmission-time') || '';
    const certUrl = req.headers.get('paypal-cert-url') || '';
    const authAlgo = req.headers.get('paypal-auth-algo') || '';
    const transSig = req.headers.get('paypal-transmission-sig') || '';
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
    if (!webhookId) return NextResponse.json({ error: 'Missing PAYPAL_WEBHOOK_ID' }, { status: 500 });
    const token = await getPayPalAccessToken();
    const verifyResp = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ transmission_id: transId, transmission_time: transTime, cert_url: certUrl, auth_algo: authAlgo, transmission_sig: transSig, webhook_id: webhookId, webhook_event: event })
    });
    const verify = await verifyResp.json();
    if (!verifyResp.ok || String(verify?.verification_status).toUpperCase() !== 'SUCCESS') {
      return NextResponse.json({ error: 'Verification failed', detail: verify }, { status: 400 });
    }

    // Handle completed payment events
    const type = String(event?.event_type || '').toUpperCase();
    if (type === 'PAYMENT.CAPTURE.COMPLETED' || type === 'CHECKOUT.ORDER.APPROVED') {
      const resource = event?.resource || {};
      const providerOrderId = String(resource?.id || resource?.supplementary_data?.related_ids?.order_id || '');
      const payer = resource?.payer || resource?.payment_source?.paypal || {};
      const email = (payer?.email_address || resource?.payer?.email_address || '')?.toLowerCase() || undefined;
      const amount = resource?.amount?.value ? Number(resource.amount.value) : (resource?.purchase_units?.[0]?.amount?.value ? Number(resource.purchase_units[0].amount.value) : 0);
      const currency = (resource?.amount?.currency_code || resource?.purchase_units?.[0]?.amount?.currency_code || 'USD').toUpperCase();
      // Build items list if provided via custom data or purchase_units
      let items: any[] = [];
      try {
        const cd = resource?.custom_id || resource?.purchase_units?.[0]?.custom_id || '';
        const od = cd ? JSON.parse(cd) : {};
        if (Array.isArray(od?.items)) items = od.items.map((it: any)=> ({ name: it.n || it.name, quantity: Number(it.q || it.quantity || 1), price: Number(it.p || it.price || 0) }));
      } catch {}
      await callConvex({ functionPath: 'orders:createFromProvider', args: {
        provider: 'paypal',
        providerOrderId,
        customerEmail: email,
        customerName: `${payer?.name?.given_name || ''} ${payer?.name?.surname || ''}`.trim() || undefined,
        subtotal: undefined,
        taxAmount: undefined,
        shippingAmount: undefined,
        totalAmount: amount,
        currency,
        shippingAddress: undefined,
        items: (items||[]).map((it:any)=> ({ name: it.name, quantity: it.quantity, price: it.price })),
      } });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Webhook failed' }, { status: 500 });
  }
}

