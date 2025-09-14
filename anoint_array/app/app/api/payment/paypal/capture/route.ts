
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { sendReceiptEmail } from '@/lib/email';
import { notifyGoAffProConversion } from '@/lib/affiliates';


const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');
const PAYMENTS_CONFIG_PATH = path.join(process.cwd(), 'data', 'payments-config.json');

async function loadPaypalCreds() {
  // Try storefront config first, then payments-config, then env (sandbox)
  try {
    const raw = await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const useSandbox = !!cfg?.paypal?.testMode;
    const clientId = (useSandbox ? cfg?.paypal?.testClientId : cfg?.paypal?.clientId) || '';
    const clientSecret = (useSandbox ? cfg?.paypal?.testClientSecret : cfg?.paypal?.clientSecret) || '';
    const base = useSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';
    return { clientId, clientSecret, base };
  } catch {}
  try {
    const raw = await fs.readFile(PAYMENTS_CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const useSandbox = !!cfg?.paypal?.testMode;
    const clientId = (useSandbox ? cfg?.paypal?.testClientId : cfg?.paypal?.clientId) || '';
    const clientSecret = (useSandbox ? cfg?.paypal?.testClientSecret : cfg?.paypal?.clientSecret) || '';
    const base = useSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';
    return { clientId, clientSecret, base };
  } catch {}
  // Fallback to sandbox env
  return {
    clientId: process.env.PAYPAL_CLIENT_ID_SANDBOX || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX || '',
    base: 'https://api.sandbox.paypal.com'
  };
}

async function getPayPalAccessToken(base: string, clientId: string, clientSecret: string) {
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const payerId = url.searchParams.get('PayerID');
    const customData = url.searchParams.get('custom_data');

    if (!token || !payerId) {
      return redirect('/dashboard?payment=error&message=Missing payment parameters');
    }

    const { clientId, clientSecret, base } = await loadPaypalCreds();
    const accessToken = await getPayPalAccessToken(base, clientId, clientSecret);

    // Capture the payment
    const captureResponse = await fetch(`${base}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const captureData = await captureResponse.json();

    if (captureData.status === 'COMPLETED') {
      try {
        // Parse custom data
        const orderInfo = customData ? JSON.parse(decodeURIComponent(customData)) : {};
        
        // Create order in database
        const capture = captureData.purchase_units[0].payments.captures[0];
        
        await prisma.order.create({
          data: {
            orderNumber: `PAYPAL_${token}`,
            userId: orderInfo.userId || undefined,
            status: 'processing',
            totalAmount: parseFloat(capture.amount.value),
            paymentStatus: 'paid',
            paymentMethod: 'paypal',
            paypalOrderId: capture.id,
            customerEmail: captureData.payer?.email_address || 'unknown',
            customerName: `${captureData.payer?.name?.given_name || ''} ${captureData.payer?.name?.surname || ''}`.trim() || 'Unknown',
            shippingAddress: orderInfo.shippingAddress || undefined,
            billingAddress: (orderInfo.billingSameAsShipping ? (orderInfo.shippingAddress || orderInfo.billingAddress) : orderInfo.billingAddress) || undefined,
            buyerCountry: (orderInfo?.billingAddress?.country || orderInfo?.shippingAddress?.country || 'CA'),
            shippingCountry: (orderInfo?.shippingAddress?.country || 'CA'),
            taxSubtotalCad: orderInfo?.extraLabel?.toLowerCase()?.includes('tax') ? Number(orderInfo?.extraAmount || 0) : 0,
            taxesEstimatedCad: orderInfo?.extraLabel?.toLowerCase()?.includes('tax') ? Number(orderInfo?.extraAmount || 0) : 0,
            dutiesEstimatedCad: orderInfo?.extraLabel?.toLowerCase()?.includes('tariff') ? Number(orderInfo?.extraAmount || 0) : 0,
            taxBreakdown: orderInfo?.taxBreakdown || {},
          }
        });

        // Send receipt email to customer and all admins (best effort)
        try {
          let items: any[] = [];
          if (Array.isArray(orderInfo?.items)) {
            items = orderInfo.items.map((it: any) => ({
              name: it.name ?? it.n ?? 'Item',
              quantity: it.quantity ?? it.q ?? 1,
              price: typeof it.price === 'number' ? it.price : (typeof it.p === 'number' ? it.p : 0),
            }));
          }
          const total = parseFloat(capture.amount.value);
          const customerEmail = captureData.payer?.email_address || '';
          const customerName = `${captureData.payer?.name?.given_name || ''} ${captureData.payer?.name?.surname || ''}`.trim() || undefined;
          const currency = (capture.amount.currency_code || 'USD').toUpperCase();
          const shippingAddress = orderInfo?.shippingAddress || undefined;

          const sends: Promise<any>[] = [];
          if (customerEmail) {
            sends.push(sendReceiptEmail(customerEmail, {
              customerName,
              orderNumber: `PAYPAL_${token}`,
              items,
              total,
              currency,
              shippingAddress,
            }));
          }
          const admins: { email: string | null }[] = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { email: true } });
          admins.filter((a: { email: string | null }) => !!a.email).forEach((a: { email: string | null }) => {
            sends.push(sendReceiptEmail(a.email as string, {
              customerName: customerName || 'Customer',
              orderNumber: `PAYPAL_${token}`,
              items,
              total,
              currency,
              shippingAddress,
            }));
          });
          await Promise.allSettled(sends);
        } catch (e) {
          console.warn('Receipt email failed (paypal):', e);
        }

        // Affiliate conversion (best effort)
        try {
          const aff = (() => { try { const data = JSON.parse(customData || '{}'); return data?.aff || null; } catch { return null; } })();
          const currency = (capture.amount.currency_code || 'USD').toUpperCase();
          await notifyGoAffProConversion({ orderId: `PAYPAL_${token}`, amount: parseFloat(capture.amount.value), currency, affiliateCode: aff, customerEmail: captureData.payer?.email_address || '' });
        } catch (e) { console.warn('Affiliate conversion failed (paypal non-fatal):', e); }

        return redirect('/success?provider=paypal');
      } catch (error) {
        console.error('Failed to create PayPal order in database:', error);
        return redirect('/success?provider=paypal&warning=database_error');
      }
    } else {
      return redirect('/dashboard?payment=error&message=Payment not completed');
    }
  } catch (error) {
    console.error('PayPal capture error:', error);
    return redirect('/dashboard?payment=error&message=Payment processing failed');
  }
}
