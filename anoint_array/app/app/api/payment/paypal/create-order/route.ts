
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import { calculateCanadianTaxes } from '@/lib/canadian-taxes';
import path from 'path';
import { getFxRate } from '@/lib/currency';

const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');

async function loadPaypalCreds() {
  try {
    const raw = await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const useSandbox = !!cfg?.paypal?.testMode;
    const clientId = useSandbox ? cfg?.paypal?.testClientId : cfg?.paypal?.clientId;
    const clientSecret = useSandbox ? cfg?.paypal?.testClientSecret : cfg?.paypal?.clientSecret;
    const base = useSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';
    return { clientId, clientSecret, base };
  } catch {
    // fallback to environment sandbox
    return {
      clientId: process.env.PAYPAL_CLIENT_ID_SANDBOX,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX,
      base: 'https://api.sandbox.paypal.com'
    };
  }
}

async function getPayPalAccessToken(base: string, clientId?: string, clientSecret?: string) {
  const isSandbox = /sandbox/.test(base);
  const id = (clientId || (isSandbox ? process.env.PAYPAL_CLIENT_ID_SANDBOX : process.env.PAYPAL_CLIENT_ID_LIVE) || '').trim();
  const secret = (clientSecret || (isSandbox ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX : process.env.PAYPAL_SECRET_LIVE) || '').trim();
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
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
    let subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const buyerCountry = (shippingAddress?.country || '').toUpperCase();
    let extraLabel: string | null = null;
    let extraAmount = 0; // USD
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
      extraAmount = Math.round(subtotal * 0.35 * 100) / 100;
      if (extraAmount > 0.01) extraLabel = 'Prepaid Tariff (DDP 35%)';
    }
    let totalAmount = subtotal + (extraAmount || 0) + (Number(shippingAmount) || 0);
    const cur = String(currency || 'USD').toUpperCase();
    let rate = 1;
    if (cur !== 'USD') {
      rate = await getFxRate('USD', cur);
      subtotal = Math.round(subtotal * rate * 100) / 100;
      extraAmount = Math.round(extraAmount * rate * 100) / 100;
      const shipAmt = Math.round(Number(shippingAmount) * rate * 100) / 100;
      totalAmount = subtotal + extraAmount + shipAmt;
    }

    const { clientId, clientSecret, base } = await loadPaypalCreds();
    const accessToken = await getPayPalAccessToken(base, clientId, clientSecret);

    // Create PayPal order
    const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: cur,
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: { currency_code: cur, value: subtotal.toFixed(2) },
              ...(buyerCountry === 'CA' ? { tax_total: { currency_code: cur, value: extraAmount.toFixed(2) } } : {}),
              ...(Number(shippingAmount) > 0 ? { shipping: { currency_code: cur, value: (cur==='USD'? Number(shippingAmount): Math.round(Number(shippingAmount)* rate *100)/100).toFixed(2) } } : {}),
              ...(buyerCountry === 'US' ? { handling: { currency_code: cur, value: extraAmount.toFixed(2) } } : {}),
            },
          },
          items: items.map(item => ({
            name: item.name,
            description: item.type === 'seal' ? 'Custom Sacred Seal Array' : undefined,
            unit_amount: {
              currency_code: cur,
              value: (cur==='USD'? item.price : (Math.round(item.price * rate *100)/100)).toFixed(2),
            },
            quantity: item.quantity.toString(),
            category: 'DIGITAL_GOODS',
          })),
          custom_id: userId,
        }],
        application_context: {
          return_url: `${process.env.NEXTAUTH_URL}/api/payment/paypal/capture`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?payment=cancelled`,
          brand_name: 'ANOINT Array',
          user_action: 'PAY_NOW',
        },
      }),
    });

    const orderData = await orderResponse.json();

    if (orderData.error) {
      throw new Error(orderData.error_description || 'PayPal order creation failed');
    }

    // Store order data temporarily (in production, use a database)
    // For now, we'll pass it through the URL parameters

    const approvalUrl = orderData.links.find((link: any) => link.rel === 'approve')?.href;

    // Compact custom_data to avoid long URLs
    const compactItems = items.map((it: any) => ({ n: String(it.name).slice(0,50), q: it.quantity, p: it.price }));
    let cd: any = {
      items: compactItems.length <= 5 ? compactItems : { count: items.length },
      userId,
      userEmail,
      subtotal,
      totalAmount,
      extraLabel: extraLabel || undefined,
      extraAmount: extraAmount || 0,
      buyerCountry,
      province: shippingAddress?.state,
      taxBreakdown,
      currency: cur,
      billingSameAsShipping: !!billingSameAsShipping,
    };
    const cdStr = encodeURIComponent(JSON.stringify(cd));
    return NextResponse.json({
      orderId: orderData.id,
      approvalUrl: `${approvalUrl}&custom_data=${cdStr}`
    });
  } catch (error) {
    console.error('PayPal order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}
