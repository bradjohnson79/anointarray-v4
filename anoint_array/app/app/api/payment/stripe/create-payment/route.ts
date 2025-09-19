import { NextRequest, NextResponse } from 'next/server';
import { resolveStripeConfig, createStripeCheckoutSession } from '@/lib/stripe';
import { calculateCanadianTaxes } from '@/lib/canadian-taxes';
import { getFxRate } from '@/lib/currency';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { items, userId, userEmail, shippingAddress, billingAddress, billingSameAsShipping, allowGuest, shippingAmount = 0, currency = 'USD' } = await req.json();
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'No items' }, { status: 400 });

    const allPhysical = items.every((it: any) => it?.type === 'product' && !(it?.customData?.isDigital));
    const hasPhysical = items.some((it: any) => it?.type === 'product' && !(it?.customData?.isDigital));
    const isLoggedIn = !!userId;
    if (!allPhysical && !isLoggedIn && !allowGuest) {
      return NextResponse.json({ error: 'Login required for digital items' }, { status: 400 });
    }

    let subtotalUSD = items.reduce((s: number, it: any) => s + Number(it.price || 0) * Number(it.quantity || 1), 0);
    let taxUSD = 0;
    const buyerCountry = (shippingAddress?.country || '').toUpperCase();
    if (buyerCountry === 'CA' && shippingAddress?.state) {
      const result = calculateCanadianTaxes({
        destinationProvince: String(shippingAddress.state),
        buyerCountry: 'CA',
        items: items.map((it: any) => ({ isDigital: !!(it?.type==='seal' || it?.customData?.isDigital), priceCents: Math.round(Number(it.price||0)*100), quantity: Number(it.quantity||1) }))
      });
      taxUSD = result.totalTaxCents / 100;
    } else if (buyerCountry === 'US') {
      taxUSD = +(subtotalUSD * 0.35).toFixed(2);
    }
    // Only apply shipping when there is at least one physical item
    const shipUSD = hasPhysical ? (Number(shippingAmount) || 0) : 0;
    let totalUSD = subtotalUSD + taxUSD + shipUSD;

    const cur = String(currency || 'USD').toUpperCase();
    let rate = 1;
    if (cur !== 'USD') { rate = await getFxRate('USD', cur); }
    const subtotal = +(subtotalUSD * rate).toFixed(2);
    const tax = +(taxUSD * rate).toFixed(2);
    const ship = +(shipUSD * rate).toFixed(2);
    const total = +(subtotal + tax + ship).toFixed(2);

    // Force canonical domain for all provider redirects
    const { getCanonicalBaseUrl, logCanonicalResolution } = await import('@/lib/canonical');
    const baseUrl = getCanonicalBaseUrl();
    logCanonicalResolution('stripe.create-payment', baseUrl);
    const successUrl = `${baseUrl}/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/cart?payment=cancelled`;

    const params = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'mode': 'payment',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'metadata[user_id]': userId || '',
      'metadata[user_email]': userEmail || '',
    });
    // Prefill customer email so the webhook has session.customer_email
    const checkoutEmail = (userEmail || shippingAddress?.email || billingAddress?.email || '').trim();
    if (checkoutEmail) params.set('customer_email', checkoutEmail);
    if (userId) params.set('client_reference_id', String(userId));
    // Attach compact orderData metadata (<= ~500 chars)
    try {
      const compactItems = items.slice(0, 20).map((it: any) => ({
        id: String(it.id || ''),
        n: String(it.name || 'Item').slice(0, 80),
        q: Number(it.quantity || 1),
        p: Number(it.price || 0),
        t: (it.type || 'product'),
      }));
      const compact = {
        items: compactItems,
        currency: String(currency || 'USD').toUpperCase(),
        shippingAddress: shippingAddress ? {
          fullName: shippingAddress.fullName || '',
          street: [shippingAddress.street, shippingAddress.address2].filter(Boolean).join(' ').slice(0, 80),
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          zip: (shippingAddress.zip || '').slice(0, 16),
          country: (shippingAddress.country || '').toUpperCase(),
        } : undefined,
        billingSameAsShipping: !!billingSameAsShipping,
      } as any;
      let meta = JSON.stringify(compact);
      // Hard cap at ~480 chars to fit Stripe metadata limits comfortably
      if (meta.length > 480) {
        compact.items = compact.items.slice(0, 8);
        meta = JSON.stringify(compact);
      }
      params.set('metadata[orderData]', meta);
    } catch {}
    // line items
    items.forEach((it: any, idx: number) => {
      const unit = cur === 'USD' ? Number(it.price) : Math.round(Number(it.price) * rate * 100) / 100;
      params.set(`line_items[${idx}][price_data][currency]`, cur.toLowerCase());
      params.set(`line_items[${idx}][price_data][product_data][name]`, String(it.name || 'Item'));
      params.set(`line_items[${idx}][price_data][unit_amount]`, Math.round(unit * 100).toString());
      params.set(`line_items[${idx}][quantity]`, String(it.quantity || 1));
    });
    // ship and tax shown as a separate line if needed (optional)
    if (hasPhysical && ship > 0) {
      const idx = items.length;
      params.set(`line_items[${idx}][price_data][currency]`, cur.toLowerCase());
      params.set(`line_items[${idx}][price_data][product_data][name]`, 'Shipping');
      params.set(`line_items[${idx}][price_data][unit_amount]`, Math.round(ship * 100).toString());
      params.set(`line_items[${idx}][quantity]`, '1');
    }
    if (tax > 0) {
      const idx = items.length + (ship>0?1:0);
      params.set(`line_items[${idx}][price_data][currency]`, cur.toLowerCase());
      params.set(`line_items[${idx}][price_data][product_data][name]`, buyerCountry==='CA'?'Taxes (GST/HST/PST)':'Prepaid Tariff');
      params.set(`line_items[${idx}][price_data][unit_amount]`, Math.round(tax * 100).toString());
      params.set(`line_items[${idx}][quantity]`, '1');
    }

    const conf = await resolveStripeConfig();
    if (!conf.secretKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    const session = await createStripeCheckoutSession(conf, params);
    return NextResponse.json({ clientSecret: session.id, url: session.url, total, currency: cur });
  } catch (e: any) {
    console.error('Stripe create-payment error:', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
