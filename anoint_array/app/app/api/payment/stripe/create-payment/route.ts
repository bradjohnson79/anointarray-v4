
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';
import { calculateCanadianTaxes } from '@/lib/canadian-taxes';
import fs from 'fs/promises';
import path from 'path';
import { getFxRate } from '@/lib/currency';

const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');

async function getStripeSecret(): Promise<string> {
  try {
    const raw = await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const useTest = !!cfg?.stripe?.testMode;
    const key = useTest ? cfg?.stripe?.testSecretKey : cfg?.stripe?.secretKey;
    if (key && key !== '***') return key as string;
    if (useTest && process.env.STRIPE_SECRET_TEST_KEY) return process.env.STRIPE_SECRET_TEST_KEY;
  } catch {}
  // fallback to environment
  return process.env.STRIPE_SECRET_KEY || '';
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { items, userId, userEmail, shippingAddress, billingAddress, billingSameAsShipping, allowGuest, shippingAmount = 0, currency = 'USD' } = await request.json();

    const allPhysical = Array.isArray(items) && items.every((item: any) => item?.type === 'product' && !(item?.customData?.isDigital));
    const guestAllowed = !session?.user && allowGuest && allPhysical;
    
    if (!session?.user && !guestAllowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    // For physical orders, require shipping address fields
    if (allPhysical) {
      const s = shippingAddress || {} as any;
      const required = ['fullName','street','city','state','zip','country'];
      const missing = required.some((k) => !s[k] || String(s[k]).trim() === '');
      if (missing) {
        return NextResponse.json({ error: 'Shipping address is required for physical products' }, { status: 400 });
      }
    }

    // Calculate subtotal and any taxes/tariffs
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const buyerCountry = (shippingAddress?.country || '').toUpperCase();
    let extraLabel: string | null = null;
    let extraAmount = 0; // same currency as items
    let taxBreakdown: any = {};
    if (buyerCountry === 'CA' && shippingAddress?.state) {
      const result = calculateCanadianTaxes({
        destinationProvince: String(shippingAddress.state),
        buyerCountry: 'CA',
        items: items.map((it: any) => ({
          isDigital: !!(it?.type === 'seal' || it?.customData?.isDigital),
          priceCents: Math.round(it.price * 100),
          quantity: it.quantity,
        }))
      });
      extraAmount = result.totalTaxCents / 100;
      extraLabel = 'Taxes (GST/HST/PST)';
      taxBreakdown = { gst: result.gstCents / 100, hst: result.hstCents / 100, pst: result.pstCents / 100 };
    } else if (buyerCountry === 'US') {
      extraAmount = Math.round(subtotal * 0.35 * 100) / 100; // 35% tariff
      if (extraAmount > 0.01) extraLabel = 'Prepaid Tariff (DDP 35%)';
    }
    const totalAmount = subtotal + (extraAmount || 0) + (Number(shippingAmount) || 0);

    // Create Stripe checkout session with selected secret key
    const secret = await getStripeSecret();
    if (!secret) {
      console.error('Stripe secret key missing');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    const stripe = new Stripe(secret, {} as any);
    const cur = String(currency || 'USD').toLowerCase();
    const base = 'usd';
    const rate = cur !== base ? await getFxRate('USD', cur.toUpperCase()) : 1;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
    const toAbs = (u?: string) => {
      if (!u) return undefined;
      try {
        const abs = new URL(u, baseUrl).toString();
        // Only allow http/https
        if (!/^https?:\/\//i.test(abs)) return undefined;
        return abs;
      } catch { return undefined; }
    };
    // Build compact metadata <= 500 chars for Stripe
    const compactItems = items.map((it: any) => ({ n: String(it.name).slice(0, 50), q: it.quantity, p: it.price }));
    let metaObj: any = {
      items: compactItems,
      subtotal,
      totalAmount,
      shippingAmount,
      extraLabel: extraLabel || undefined,
      extraAmount: extraAmount || 0,
      buyerCountry,
      province: shippingAddress?.state,
      taxBreakdown,
      paymentMethod: 'stripe',
      currency: String(currency || 'USD').toUpperCase(),
      billingSameAsShipping: !!billingSameAsShipping,
    };
    let metaStr = JSON.stringify(metaObj);
    if (metaStr.length > 480) {
      metaObj.items = compactItems.map((i: any) => ({ n: i.n, q: i.q }));
      metaStr = JSON.stringify(metaObj);
    }
    if (metaStr.length > 480) {
      metaObj.items = { count: items.length };
      metaStr = JSON.stringify(metaObj);
    }

    let checkoutSession;
    try {
    checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        ...items.map(item => ({
        price_data: {
          currency: cur,
          product_data: {
            name: item.name,
            description: item.type === 'seal' ? 'Custom Sacred Seal Array' : undefined,
            images: item.imageUrl ? [toAbs(item.imageUrl)!].filter(Boolean) as string[] : undefined,
          },
          unit_amount: Math.round(item.price * rate * 100), // Convert to cents in target currency
        },
        quantity: item.quantity,
      })),
      ...(extraLabel && extraAmount > 0 ? [{
        price_data: {
          currency: cur,
          product_data: { name: extraLabel },
          unit_amount: Math.round(extraAmount * rate * 100),
        },
        quantity: 1
      }] : []),
      ...(shippingAmount && shippingAmount > 0 ? [{
        price_data: {
          currency: cur,
          product_data: { name: 'Shipping' },
          unit_amount: Math.round(Number(shippingAmount) * rate * 100),
        },
        quantity: 1,
      }] : [])
      ],
      mode: 'payment',
      success_url: new URL(`/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}` , baseUrl).toString(),
      cancel_url: new URL('/dashboard?payment=cancelled', baseUrl).toString(),
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: {
        userId,
        orderData: metaStr,
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
      },
    });
    } catch (err: any) {
      console.error('Stripe create session failed:', err?.message || err);
      return NextResponse.json({ error: 'Stripe session error: ' + (err?.message || 'unknown') }, { status: 500 });
    }

    return NextResponse.json({ 
      clientSecret: checkoutSession.id,
      url: checkoutSession.url,
      livemode: (checkoutSession as any).livemode ?? undefined,
    });
  } catch (error) {
    console.error('Stripe payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
