
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import { getAffiliateCodeFromHeaders } from '@/lib/affiliates';
import { resolvePaypalConfig, getPaypalAccessToken, createPaypalOrder } from '@/lib/paypal';

const PAYMENTS_CONFIG_PATH = path.join(process.cwd(), 'data', 'payments-config.json');

interface PaymentGatewayConfiguration {
  stripe: {
    enabled: boolean;
    testMode: boolean;
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    testPublishableKey: string;
    testSecretKey: string;
    testWebhookSecret: string;
  };
  paypal: {
    enabled: boolean;
    testMode: boolean;
    clientId: string;
    clientSecret: string;
    testClientId: string;
    testClientSecret: string;
  };
  nowPayments: {
    enabled: boolean;
    testMode: boolean;
    apiKey: string;
    publicKey: string;
    testApiKey: string;
    testPublicKey: string;
  };
  pricing: {
    sealArrayPrice: number;
    currency: string;
  };
  isConfigured: boolean;
  lastUpdated: string;
}

async function loadPaymentConfiguration(): Promise<PaymentGatewayConfiguration | null> {
  try {
    const configData = await fs.readFile(PAYMENTS_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);
    
    // Fill in actual API keys from environment if they're masked
    config.stripe.secretKey = config.stripe.secretKey === '***' ? process.env.STRIPE_SECRET_KEY : config.stripe.secretKey;
    config.stripe.testSecretKey = config.stripe.testSecretKey === '***' ? process.env.STRIPE_SECRET_TEST_KEY : config.stripe.testSecretKey;
    config.stripe.webhookSecret = config.stripe.webhookSecret === '***' ? process.env.STRIPE_WEBHOOK_SECRET : config.stripe.webhookSecret;
    config.stripe.testWebhookSecret = config.stripe.testWebhookSecret === '***' ? process.env.STRIPE_WEBHOOK_TEST_SECRET : config.stripe.testWebhookSecret;
    
    config.paypal.clientSecret = config.paypal.clientSecret === '***' ? process.env.PAYPAL_SECRET_LIVE : config.paypal.clientSecret;
    config.paypal.testClientSecret = config.paypal.testClientSecret === '***' ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX : config.paypal.testClientSecret;
    
    config.nowPayments.apiKey = config.nowPayments.apiKey === '***' ? process.env.NOWPAYMENTS_API_KEY : config.nowPayments.apiKey;
    config.nowPayments.testApiKey = config.nowPayments.testApiKey === '***' ? process.env.NOWPAYMENTS_API_KEY : config.nowPayments.testApiKey;
    
    return config;
  } catch (error) {
    console.error('Failed to load payment configuration:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentMethod, userId, sealConfig, userDetails, testMode } = await request.json();
    
    // Load payment configuration
    const paymentConfig = await loadPaymentConfiguration();
    if (!paymentConfig) {
      return NextResponse.json({ error: 'Payment configuration not found. Please configure payment gateways in Admin panel.' }, { status: 500 });
    }
    
    const amount = paymentConfig.pricing.sealArrayPrice;
    const currency = paymentConfig.pricing.currency;
    const aff = getAffiliateCodeFromHeaders(request.headers);

    // Generate order ID
    const orderId = `seal_${Date.now()}_${userId}`;

    if (paymentMethod === 'stripe') {
      // Check if Stripe is enabled
      if (!paymentConfig.stripe.enabled) {
        return NextResponse.json({ error: 'Stripe payment is not enabled' }, { status: 400 });
      }
      
      const { resolveStripeConfig, createStripeCheckoutSession } = await import('@/lib/stripe');
      const conf = await resolveStripeConfig();
      if (!conf.secretKey) return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 500 });
      const params = new URLSearchParams({
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': currency.toLowerCase(),
        'line_items[0][price_data][product_data][name]': `ANOINT Seal Array - ${sealConfig.category}`,
        'line_items[0][price_data][product_data][description]': `Custom seal array for ${userDetails.fullName}`,
        'line_items[0][price_data][unit_amount]': Math.round(amount * 100).toString(),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${process.env.NEXTAUTH_URL}/success?provider=stripe&order_id=${orderId}`,
        'cancel_url': `${process.env.NEXTAUTH_URL}/dashboard/seal-generator?payment=cancelled`,
        'metadata[order_id]': orderId,
        'metadata[user_id]': userId,
        'metadata[product_type]': 'seal_array'
      });
      const stripeData = await createStripeCheckoutSession(conf, params);
      if (stripeData) {
        return NextResponse.json({
          success: true,
          checkoutUrl: stripeData.url,
          orderId
        });
      } else {
        throw new Error('Stripe checkout creation failed');
      }

    } else if (paymentMethod === 'paypal') {
      // Check if PayPal is enabled
      if (!paymentConfig.paypal.enabled) {
        return NextResponse.json({ error: 'PayPal payment is not enabled' }, { status: 400 });
      }
      
      const conf = await resolvePaypalConfig();
      const tokenData = await getPaypalAccessToken(conf);
      const paypalData = await createPaypalOrder(conf, tokenData, {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2)
            },
            description: `ANOINT Seal Array - ${sealConfig.category}`,
            custom_id: orderId
          }
        ],
        application_context: {
          return_url: `${process.env.NEXTAUTH_URL}/api/payment/paypal/capture?custom_data=${encodeURIComponent(JSON.stringify({ aff }))}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/seal-generator?payment=cancelled`
        }
      });
      if (paypalData) {
        const approvalUrl = paypalData.links.find((link: any) => link.rel === 'approve')?.href;
        
        return NextResponse.json({
          success: true,
          paypalUrl: approvalUrl,
          orderId
        });
      } else {
        throw new Error('PayPal order creation failed');
      }

    } else if (paymentMethod === 'nowpayments') {
      // Check if NowPayments is enabled
      if (!paymentConfig.nowPayments.enabled) {
        return NextResponse.json({ error: 'Cryptocurrency payment is not enabled' }, { status: 400 });
      }
      
      const useTestMode = testMode || paymentConfig.nowPayments.testMode;
      const nowPaymentsApiKey = useTestMode ? paymentConfig.nowPayments.testApiKey : paymentConfig.nowPayments.apiKey;
      const nowPaymentsApiBase = useTestMode ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
      
      if (!nowPaymentsApiKey) {
        return NextResponse.json({ error: 'NowPayments API key not configured' }, { status: 500 });
      }
      
      // Create NowPayments crypto payment
      const nowPaymentsResponse = await fetch(`${nowPaymentsApiBase}/v1/payment`, {
        method: 'POST',
        headers: {
          'x-api-key': nowPaymentsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: amount,
          price_currency: currency.toLowerCase(),
          pay_currency: 'btc', // Default to Bitcoin
          order_id: orderId,
          order_description: JSON.stringify({ t: 'seal-array', category: sealConfig.category, aff }),
          success_url: `${process.env.NEXTAUTH_URL}/success?provider=nowpayments&order_id=${orderId}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/seal-generator?payment=cancelled`
        })
      });

      if (nowPaymentsResponse.ok) {
        const nowPaymentsData = await nowPaymentsResponse.json();
        
        return NextResponse.json({
          success: true,
          cryptoUrl: nowPaymentsData.invoice_url || nowPaymentsData.payment_url,
          orderId
        });
      } else {
        throw new Error('NowPayments creation failed');
      }
    }

    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
