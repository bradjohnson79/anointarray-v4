
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import { calculateCanadianTaxes } from '@/lib/canadian-taxes';
import path from 'path';
import { getFxRate } from '@/lib/currency';

const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');

async function loadNowPaymentsKey() {
  try {
    const raw = await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const key = cfg?.nowPayments?.apiKey || cfg?.nowPayments?.testApiKey;
    if (key && key !== '***') return key as string;
  } catch {}
  return process.env.NOWPAYMENTS_API_KEY || '';
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Guest allowed logic handled upstream; accept guest flow here as well

    const { items, currency, userId, userEmail, shippingAddress, shippingAmount = 0, fiatCurrency = 'USD' } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    // Calculate subtotal and any taxes/tariffs
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const buyerCountry = (shippingAddress?.country || '').toUpperCase();
    let extraAmount = 0;
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
    } else if (buyerCountry === 'US') {
      extraAmount = Math.round(subtotal * 0.35 * 100) / 100;
    }
    let totalAmount = subtotal + (extraAmount || 0) + (Number(shippingAmount) || 0);
    const cur = String(fiatCurrency || 'USD').toUpperCase();
    if (cur !== 'USD') {
      const rate = await getFxRate('USD', cur);
      totalAmount = Math.round(totalAmount * rate * 100) / 100;
    }

    // Create NOWPayments payment
    const apiKey = await loadNowPaymentsKey();
    const paymentResponse = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        price_amount: totalAmount,
        price_currency: String(fiatCurrency || 'USD').toLowerCase(),
        pay_currency: currency.toLowerCase(),
        order_id: `anoint_${Date.now()}_${userId}`,
        order_description: `ANOINT Array Order - ${items.length} items`,
        ipn_callback_url: `${process.env.NEXTAUTH_URL}/api/payment/crypto/webhook`,
        success_url: `${process.env.NEXTAUTH_URL}/success?provider=crypto`,
        cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?payment=cancelled`,
        customer_email: userEmail,
        case: 'success',
      }),
    });

    const paymentData = await paymentResponse.json();

    if (paymentData.error) {
      throw new Error(paymentData.message || 'NOWPayments error');
    }

    return NextResponse.json({
      paymentId: paymentData.payment_id,
      payAddress: paymentData.pay_address,
      payAmount: paymentData.pay_amount,
      payCurrency: paymentData.pay_currency,
      priceAmount: paymentData.price_amount,
      priceCurrency: paymentData.price_currency,
      paymentStatus: paymentData.payment_status,
      orderData: {
        items,
        userId,
        userEmail,
        subtotal,
        totalAmount,
        extraAmount,
        buyerCountry
      }
    });
  } catch (error) {
    console.error('Crypto payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create crypto payment' },
      { status: 500 }
    );
  }
}
