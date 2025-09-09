
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

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

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory already exists or other error
    console.log('Data directory creation:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentConfig: PaymentGatewayConfiguration = await request.json();
    
    // Add metadata
    paymentConfig.lastUpdated = new Date().toISOString();
    paymentConfig.isConfigured = !!(
      (paymentConfig.stripe.enabled && (
        (paymentConfig.stripe.testMode && paymentConfig.stripe.testSecretKey) ||
        (!paymentConfig.stripe.testMode && paymentConfig.stripe.secretKey)
      )) ||
      (paymentConfig.paypal.enabled && (
        (paymentConfig.paypal.testMode && paymentConfig.paypal.testClientId) ||
        (!paymentConfig.paypal.testMode && paymentConfig.paypal.clientId)
      )) ||
      (paymentConfig.nowPayments.enabled && (
        (paymentConfig.nowPayments.testMode && paymentConfig.nowPayments.testApiKey) ||
        (!paymentConfig.nowPayments.testMode && paymentConfig.nowPayments.apiKey)
      ))
    );

    // Ensure directory exists
    await ensureDataDirectory();

    // Save to file
    await fs.writeFile(PAYMENTS_CONFIG_PATH, JSON.stringify(paymentConfig, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Payment configuration saved successfully',
      isConfigured: paymentConfig.isConfigured
    });

  } catch (error) {
    console.error('Payment Config save error:', error);
    return NextResponse.json(
      { error: 'Failed to save payment configuration' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const configData = await fs.readFile(PAYMENTS_CONFIG_PATH, 'utf-8');
      const paymentConfig = JSON.parse(configData);
      
      // Load API keys from environment if not set in config and mask for security
      const processedConfig = {
        ...paymentConfig,
        stripe: {
          ...paymentConfig.stripe,
          // Use environment keys if config is empty, but mask for display
          publishableKey: paymentConfig.stripe.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY || '',
          secretKey: paymentConfig.stripe.secretKey || process.env.STRIPE_SECRET_KEY ? '***' : '',
          webhookSecret: paymentConfig.stripe.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET ? '***' : '',
          testPublishableKey: paymentConfig.stripe.testPublishableKey || process.env.STRIPE_PUBLISHABLE_TEST_KEY || '',
          testSecretKey: paymentConfig.stripe.testSecretKey || process.env.STRIPE_SECRET_TEST_KEY ? '***' : '',
          testWebhookSecret: paymentConfig.stripe.testWebhookSecret || process.env.STRIPE_WEBHOOK_TEST_SECRET ? '***' : '',
          // Auto-enable if we have keys
          enabled: paymentConfig.stripe.enabled || !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY)
        },
        paypal: {
          ...paymentConfig.paypal,
          clientId: paymentConfig.paypal.clientId || process.env.PAYPAL_CLIENT_ID_LIVE || '',
          clientSecret: paymentConfig.paypal.clientSecret || process.env.PAYPAL_SECRET_LIVE ? '***' : '',
          testClientId: paymentConfig.paypal.testClientId || process.env.PAYPAL_CLIENT_ID_SANDBOX || '',
          testClientSecret: paymentConfig.paypal.testClientSecret || process.env.PAYPAL_CLIENT_SECRET_SANDBOX ? '***' : '',
          // Auto-enable if we have keys
          enabled: paymentConfig.paypal.enabled || !!(process.env.PAYPAL_CLIENT_ID_LIVE && process.env.PAYPAL_SECRET_LIVE)
        },
        nowPayments: {
          ...paymentConfig.nowPayments,
          apiKey: paymentConfig.nowPayments.apiKey || process.env.NOWPAYMENTS_API_KEY ? '***' : '',
          publicKey: paymentConfig.nowPayments.publicKey || process.env.NOWPAYMENTS_PUBLIC_KEY || '',
          testApiKey: paymentConfig.nowPayments.testApiKey || process.env.NOWPAYMENTS_API_KEY ? '***' : '',
          testPublicKey: paymentConfig.nowPayments.testPublicKey || process.env.NOWPAYMENTS_PUBLIC_KEY || '',
          // Auto-enable if we have keys (NowPayments uses live keys for both test and production)
          enabled: paymentConfig.nowPayments.enabled || !!(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_PUBLIC_KEY),
          // Since NowPayments doesn't have test keys, always use live mode disabled
          testMode: false
        }
      };
      
      return NextResponse.json(processedConfig);
    } catch (error) {
      // Return default config with environment keys if file doesn't exist
      const defaultConfig = {
        stripe: {
          enabled: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
          testMode: true,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
          secretKey: process.env.STRIPE_SECRET_KEY ? '***' : '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '***' : '',
          testPublishableKey: process.env.STRIPE_PUBLISHABLE_TEST_KEY || '',
          testSecretKey: process.env.STRIPE_SECRET_TEST_KEY ? '***' : '',
          testWebhookSecret: process.env.STRIPE_WEBHOOK_TEST_SECRET ? '***' : ''
        },
        paypal: {
          enabled: !!(process.env.PAYPAL_CLIENT_ID_LIVE && process.env.PAYPAL_SECRET_LIVE),
          testMode: true,
          clientId: process.env.PAYPAL_CLIENT_ID_LIVE || '',
          clientSecret: process.env.PAYPAL_SECRET_LIVE ? '***' : '',
          testClientId: process.env.PAYPAL_CLIENT_ID_SANDBOX || '',
          testClientSecret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX ? '***' : ''
        },
        nowPayments: {
          enabled: !!(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_PUBLIC_KEY),
          testMode: false, // NowPayments doesn't have test keys, so always use live mode
          apiKey: process.env.NOWPAYMENTS_API_KEY ? '***' : '',
          publicKey: process.env.NOWPAYMENTS_PUBLIC_KEY || '',
          testApiKey: process.env.NOWPAYMENTS_API_KEY ? '***' : '', // Use live keys for test
          testPublicKey: process.env.NOWPAYMENTS_PUBLIC_KEY || '' // Use live keys for test
        },
        pricing: {
          sealArrayPrice: 14.99,
          currency: 'USD'
        },
        isConfigured: !!(
          (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) ||
          (process.env.PAYPAL_CLIENT_ID_LIVE && process.env.PAYPAL_SECRET_LIVE) ||
          (process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_PUBLIC_KEY)
        ),
        lastUpdated: new Date().toISOString()
      };
      
      return NextResponse.json(defaultConfig);
    }

  } catch (error) {
    console.error('Payment Config get error:', error);
    return NextResponse.json(
      { error: 'Failed to load payment configuration' },
      { status: 500 }
    );
  }
}
