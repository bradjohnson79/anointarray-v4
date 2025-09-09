import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { sendAdminServiceOrderEmail } from '@/lib/email';
import { getAffiliateCodeFromHeaders } from '@/lib/affiliates';

const PAYMENTS_CONFIG_PATH = path.join(process.cwd(), 'data', 'payments-config.json');

type ServiceType = 'basic' | 'full' | 'environmental';

async function loadPaymentConfiguration(): Promise<any | null> {
  try {
    const configData = await fs.readFile(PAYMENTS_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);
    // Fill from env if masked
    config.stripe.secretKey = config.stripe.secretKey === '***' ? process.env.STRIPE_SECRET_KEY : config.stripe.secretKey;
    config.stripe.testSecretKey = config.stripe.testSecretKey === '***' ? process.env.STRIPE_SECRET_TEST_KEY : config.stripe.testSecretKey;
    config.paypal.clientSecret = config.paypal.clientSecret === '***' ? process.env.PAYPAL_SECRET_LIVE : config.paypal.clientSecret;
    config.paypal.testClientSecret = config.paypal.testClientSecret === '***' ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX : config.paypal.testClientSecret;
    config.nowPayments.apiKey = config.nowPayments.apiKey === '***' ? process.env.NOWPAYMENTS_API_KEY : config.nowPayments.apiKey;
    config.nowPayments.testApiKey = config.nowPayments.testApiKey === '***' ? process.env.NOWPAYMENTS_API_KEY : config.nowPayments.testApiKey;
    return config;
  } catch (e) {
    console.error('Failed to load payments config', e);
    return null;
  }
}

function getServiceDetails(serviceType: ServiceType) {
  switch (serviceType) {
    case 'basic':
      return { name: 'Basic Service', price: 35, description: 'Scalar + Transcendental Frequencies (personal/environmental)' };
    case 'full':
      return { name: 'Full Body Scan Service', price: 98, description: 'Body scan + imbuing of up to 3 items' };
    case 'environmental':
      return { name: 'Environmental Service', price: 143, description: 'Body scan + full-room environmental imbuing' };
    default:
      return { name: 'Service', price: 35, description: 'ANOINT Service' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { paymentMethod, serviceType, customer, photoData } = await req.json();
    const service = getServiceDetails(serviceType);
    const paymentConfig = await loadPaymentConfiguration();
    if (!paymentConfig) return NextResponse.json({ error: 'Payments not configured' }, { status: 500 });

    const currency = (paymentConfig.pricing?.currency || 'USD').toUpperCase();
    const amount = service.price;
    const orderId = `service_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const aff = getAffiliateCodeFromHeaders(req.headers);

    // Save lightweight order record for admin follow-up
    try {
      const dir = path.join(process.cwd(), 'data', 'service-orders');
      await fs.mkdir(dir, { recursive: true });
      const record = { orderId, createdAt: new Date().toISOString(), serviceType, service, customer, photoProvided: !!photoData };
      await fs.writeFile(path.join(dir, `${orderId}.json`), JSON.stringify(record, null, 2));
      // If photoData present, store base64 separately (optional, bounded in size)
      if (photoData && String(photoData).length < 2_000_000) {
        await fs.writeFile(path.join(dir, `${orderId}_photo.txt`), photoData);
      }
    } catch (e) {
      console.warn('Failed to persist service order record', e);
    }

    const successUrl = `${process.env.NEXTAUTH_URL}/success?provider=${encodeURIComponent(paymentMethod)}&order_id=${orderId}`;
    const cancelUrl = `${process.env.NEXTAUTH_URL}/services?payment=cancelled`;

    if (paymentMethod === 'stripe') {
      if (!paymentConfig.stripe.enabled) return NextResponse.json({ error: 'Stripe not enabled' }, { status: 400 });
      const useTest = paymentConfig.stripe.testMode;
      const secret = useTest ? paymentConfig.stripe.testSecretKey : paymentConfig.stripe.secretKey;
      if (!secret) return NextResponse.json({ error: 'Stripe key missing' }, { status: 500 });
      const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'payment_method_types[0]': 'card',
          'line_items[0][price_data][currency]': currency.toLowerCase(),
          'line_items[0][price_data][product_data][name]': `ANOINT Service — ${service.name}`,
          'line_items[0][price_data][product_data][description]': service.description,
          'line_items[0][price_data][unit_amount]': Math.round(amount * 100).toString(),
          'line_items[0][quantity]': '1',
          'mode': 'payment',
          'success_url': successUrl,
          'cancel_url': cancelUrl,
          'metadata[order_id]': orderId,
          'metadata[product_type]': 'service',
          'metadata[service_type]': serviceType,
          'metadata[aff]': aff || '',
        })
      });
      if (!resp.ok) return NextResponse.json({ error: 'Stripe checkout creation failed' }, { status: 500 });
      const data = await resp.json();
      // Notify admin
      try { await sendAdminServiceOrderEmail(process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || '', { orderId, serviceName: service.name, price: amount, currency, customer, photoData }); } catch {}
      return NextResponse.json({ success: true, checkoutUrl: data.url, orderId });
    }

    if (paymentMethod === 'paypal') {
      if (!paymentConfig.paypal.enabled) return NextResponse.json({ error: 'PayPal not enabled' }, { status: 400 });
      const useTest = paymentConfig.paypal.testMode;
      const cid = useTest ? paymentConfig.paypal.testClientId : paymentConfig.paypal.clientId;
      const secret = useTest ? paymentConfig.paypal.testClientSecret : paymentConfig.paypal.clientSecret;
      const base = useTest ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';
      if (!cid || !secret) return NextResponse.json({ error: 'PayPal credentials missing' }, { status: 500 });
      const auth = Buffer.from(`${cid}:${secret}`).toString('base64');
      const tokenResp = await fetch(`${base}/v1/oauth2/token`, { method:'POST', headers:{ 'Authorization': `Basic ${auth}`, 'Content-Type':'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
      if (!tokenResp.ok) return NextResponse.json({ error: 'PayPal token failed' }, { status: 500 });
      const token = await tokenResp.json();
      const orderResp = await fetch(`${base}/v2/checkout/orders`, { method:'POST', headers:{ 'Authorization': `Bearer ${token.access_token}`, 'Content-Type':'application/json' }, body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) }, description: `ANOINT Service — ${service.name}`, custom_id: orderId }],
        application_context: { return_url: `${process.env.NEXTAUTH_URL}/api/payment/paypal/capture?custom_data=${encodeURIComponent(JSON.stringify({ aff }))}`, cancel_url: cancelUrl }
      })});
      if (!orderResp.ok) return NextResponse.json({ error: 'PayPal order failed' }, { status: 500 });
      const orderData = await orderResp.json();
      const approval = orderData.links.find((l: any)=>l.rel==='approve')?.href;
      try { await sendAdminServiceOrderEmail(process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || '', { orderId, serviceName: service.name, price: amount, currency, customer, photoData }); } catch {}
      return NextResponse.json({ success: true, paypalUrl: approval, orderId });
    }

    if (paymentMethod === 'nowpayments') {
      if (!paymentConfig.nowPayments.enabled) return NextResponse.json({ error: 'Crypto not enabled' }, { status: 400 });
      const useTest = paymentConfig.nowPayments.testMode;
      const apiKey = useTest ? paymentConfig.nowPayments.testApiKey : paymentConfig.nowPayments.apiKey;
      const base = useTest ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
      if (!apiKey) return NextResponse.json({ error: 'NOWPayments key missing' }, { status: 500 });
      const npResp = await fetch(`${base}/v1/payment`, { method:'POST', headers:{ 'x-api-key': apiKey, 'Content-Type':'application/json' }, body: JSON.stringify({
        price_amount: amount,
        price_currency: currency.toLowerCase(),
        pay_currency: 'btc',
        order_id: orderId,
        order_description: JSON.stringify({ t: 'service', name: service.name, aff }),
        success_url: successUrl,
        cancel_url: cancelUrl,
      })});
      if (!npResp.ok) return NextResponse.json({ error: 'NOWPayments failed' }, { status: 500 });
      const npData = await npResp.json();
      try { await sendAdminServiceOrderEmail(process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || '', { orderId, serviceName: service.name, price: amount, currency, customer, photoData }); } catch {}
      return NextResponse.json({ success: true, cryptoUrl: npData.invoice_url || npData.payment_url, orderId });
    }

    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
  } catch (e) {
    console.error('Service payment error:', e);
    return NextResponse.json({ error: 'Failed to create service payment' }, { status: 500 });
  }
}
