import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { callConvex } from '@/lib/convexHttp';
import { sendReceiptEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_TEST_KEY;
  if (!key) throw new Error('Stripe API key not configured');
  // Use default API version bundled with the SDK
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = headers().get('stripe-signature');
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_TEST_SECRET || '';
  if (!whSecret) return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 });
  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig as any, whSecret);
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid signature', detail: e?.message || String(e) }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const providerOrderId = session.id;
      const customerEmail = (session.customer_details?.email || session.customer_email || '')?.toLowerCase() || undefined;
      // Extract compact order metadata
      let items: Array<{ name?: string; quantity: number; price: number }> = [];
      let shippingAddress: any = undefined;
      let currency = (session.currency || 'usd').toUpperCase();
      try {
        const od = JSON.parse((session.metadata as any)?.orderData || '{}');
        if (Array.isArray(od?.items)) items = od.items.map((it: any)=> ({ name: it.n, quantity: it.q, price: it.p }));
        if (od?.shippingAddress) shippingAddress = od.shippingAddress;
        if (typeof od?.currency === 'string') currency = String(od.currency).toUpperCase();
      } catch {}
      const subtotal = (session.amount_subtotal || 0) / 100;
      const total = (session.amount_total || 0) / 100;
      const tax = Math.max(total - subtotal - (((session.shipping_cost as any)?.amount_total || 0)/100), 0);
      const ship = ((session.shipping_cost as any)?.amount_total || 0)/100;

      await callConvex({ functionPath: 'orders:createFromProvider', args: {
        provider: 'stripe',
        providerOrderId,
        customerEmail,
        customerName: session.customer_details?.name || undefined,
        subtotal,
        taxAmount: tax,
        shippingAmount: ship,
        totalAmount: total,
        currency,
        shippingAddress,
        items: (items || []).map((it)=> ({ quantity: Number(it.quantity||1), price: Number(it.price||0), name: it.name })),
      } });

      // Best-effort receipt
      try {
        if (customerEmail && items?.length) await sendReceiptEmail(customerEmail, {
          customerName: session.customer_details?.name || undefined,
          orderNumber: `STRIPE_${providerOrderId}`,
          items: items.map(it=> ({ name: it.name || 'Item', quantity: it.quantity, price: it.price })),
          total,
          currency,
          shippingAddress,
        });
      } catch {}
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Webhook handling failed' }, { status: 500 });
  }
}
