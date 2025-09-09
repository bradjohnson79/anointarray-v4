
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { sendReceiptEmail } from '@/lib/email';
import { notifyGoAffProConversion } from '@/lib/affiliates';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      try {
        const orderData = JSON.parse(session.metadata?.orderData || '{}');
        // Prefer Stripe-provided details when available
        const stripeShipping = (session as any)?.shipping_details?.address || (session as any)?.customer_details?.address || null;
        const toAddressJson = (addr: any) => addr ? {
          fullName: (session as any)?.shipping_details?.name || orderData?.shippingAddress?.fullName || '',
          email: session.customer_details?.email || orderData?.shippingAddress?.email || undefined,
          phone: (session.customer_details as any)?.phone || orderData?.shippingAddress?.phone || undefined,
          street: [addr.line1, addr.line2].filter(Boolean).join(' '),
          city: addr.city,
          state: addr.state,
          zip: addr.postal_code,
          country: addr.country,
        } : null;
        const shippingAddress = toAddressJson(stripeShipping) || orderData?.shippingAddress || null;
        const billingAddress = orderData?.billingSameAsShipping ? (shippingAddress || orderData?.billingAddress || null) : (orderData?.billingAddress || shippingAddress || null);
        
        // Create order in database
        await prisma.order.create({
          data: {
            orderNumber: `STRIPE_${session.id}`,
            userId: session.client_reference_id || undefined,
            status: 'processing',
            totalAmount: session.amount_total! / 100, // Convert from cents
            paymentStatus: 'paid',
            paymentMethod: 'stripe',
            stripePaymentId: session.payment_intent as string || session.id,
            customerEmail: session.customer_email!,
            customerName: session.customer_details?.name || 'Unknown',
            shippingAddress: shippingAddress || undefined,
            billingAddress: billingAddress || undefined,
            buyerCountry: (billingAddress?.country || shippingAddress?.country || 'CA') as string,
            shippingCountry: (shippingAddress?.country || 'CA') as string,
            // Estimated taxes/tariffs from metadata
            taxSubtotalCad: (() => {
              try {
                const od = JSON.parse(session.metadata?.orderData || '{}');
                return od?.extraLabel?.toLowerCase().includes('tax') ? Number(od?.extraAmount || 0) : 0;
              } catch { return 0; }
            })(),
            taxesEstimatedCad: (() => {
              try { const od = JSON.parse(session.metadata?.orderData || '{}'); return od?.extraLabel?.toLowerCase().includes('tax') ? Number(od?.extraAmount || 0) : 0; } catch { return 0; }
            })(),
            dutiesEstimatedCad: (() => {
              try { const od = JSON.parse(session.metadata?.orderData || '{}'); return od?.extraLabel?.toLowerCase().includes('tariff') ? Number(od?.extraAmount || 0) : 0; } catch { return 0; }
            })(),
            taxBreakdown: (() => { try { const od = JSON.parse(session.metadata?.orderData || '{}'); return od?.taxBreakdown || {}; } catch { return {}; } })(),
          }
        });

        // Send receipt email to customer and all admins (best effort)
        try {
          const orderData = JSON.parse(session.metadata?.orderData || '{}');
          let items: any[] = [];
          if (Array.isArray(orderData?.items)) {
            // Accept both full and compact item shapes
            items = orderData.items.map((it: any) => ({
              name: it.name ?? it.n ?? 'Item',
              quantity: it.quantity ?? it.q ?? 1,
              price: typeof it.price === 'number' ? it.price : (typeof it.p === 'number' ? it.p : 0),
            }));
          }
          const total = (session.amount_total || 0) / 100;
          const currency = (session.currency || 'usd').toUpperCase();

          const sends: Promise<any>[] = [];
          // Customer receipt
          if (session.customer_email) {
            sends.push(sendReceiptEmail(session.customer_email, {
              customerName: session.customer_details?.name || undefined,
              orderNumber: `STRIPE_${session.id}`,
              items,
              total,
              currency,
              shippingAddress,
            }));
          }
          // Admin notifications receive the same receipt template
          const admins = await prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { email: true },
          });
          admins.filter(a => a.email).forEach(a => {
            sends.push(sendReceiptEmail(a.email!, {
              customerName: session.customer_details?.name || 'Customer',
              orderNumber: `STRIPE_${session.id}`,
              items,
              total,
              currency,
              shippingAddress,
            }));
          });
          await Promise.allSettled(sends);
        } catch (e) {
          console.warn('Receipt email failed (stripe):', e);
        }

        // Affiliate conversion (best effort)
        try {
          const aff = (session.metadata as any)?.aff || null;
          const amount = (session.amount_total || 0) / 100;
          const currency = (session.currency || 'USD').toUpperCase();
          await notifyGoAffProConversion({ orderId: `STRIPE_${session.id}`, amount, currency, affiliateCode: aff, customerEmail: session.customer_email || null });
        } catch (e) {
          console.warn('Affiliate conversion failed (stripe non-fatal):', e);
        }

        console.log('Order created successfully:', session.id);
      } catch (error) {
        console.error('Failed to create order:', error);
        // Don't return error to Stripe to avoid retries
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
