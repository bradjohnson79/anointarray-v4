
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { sendReceiptEmail } from '@/lib/email';
import { notifyGoAffProConversion } from '@/lib/affiliates';

const prisma = new PrismaClient();

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID_SANDBOX;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET_SANDBOX;
  
  const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
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

    const accessToken = await getPayPalAccessToken();

    // Capture the payment
    const captureResponse = await fetch(`https://api.sandbox.paypal.com/v2/checkout/orders/${token}/capture`, {
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
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { email: true } });
          admins.filter(a => a.email).forEach(a => {
            sends.push(sendReceiptEmail(a.email!, {
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
