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
    if (!allowGuest && !allPhysical) return NextResponse.json({ error: 'Guest checkout not allowed for digital items' }, { status: 400 });

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
    const shipUSD = Number(shippingAmount) || 0;
    let totalUSD = subtotalUSD + taxUSD + shipUSD;

    const cur = String(currency || 'USD').toUpperCase();
    let rate = 1;
    if (cur !== 'USD') { rate = await getFxRate('USD', cur); }
    const subtotal = +(subtotalUSD * rate).toFixed(2);
    const tax = +(taxUSD * rate).toFixed(2);
    const ship = +(shipUSD * rate).toFixed(2);
    const total = +(subtotal + tax + ship).toFixed(2);

    const successUrl = `${process.env.NEXTAUTH_URL}/success?provider=stripe`;
    const cancelUrl = `${process.env.NEXTAUTH_URL}/cart?payment=cancelled`;

    const params = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'mode': 'payment',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'metadata[user_id]': userId || '',
      'metadata[user_email]': userEmail || '',
    });
    // line items
    items.forEach((it: any, idx: number) => {
      const unit = cur === 'USD' ? Number(it.price) : Math.round(Number(it.price) * rate * 100) / 100;
      params.set(`line_items[${idx}][price_data][currency]`, cur.toLowerCase());
      params.set(`line_items[${idx}][price_data][product_data][name]`, String(it.name || 'Item'));
      params.set(`line_items[${idx}][price_data][unit_amount]`, Math.round(unit * 100).toString());
      params.set(`line_items[${idx}][quantity]`, String(it.quantity || 1));
    });
    // ship and tax shown as a separate line if needed (optional)
    if (ship > 0) {
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

