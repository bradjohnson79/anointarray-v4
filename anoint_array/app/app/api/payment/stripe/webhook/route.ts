
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import { sendReceiptEmail } from '@/lib/email';
import { notifyGoAffProConversion } from '@/lib/affiliates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Health probe for browsers and uptime checks
export async function GET() {
  return NextResponse.json({
    ok: true,
    note: 'Stripe webhook endpoint is alive. Stripe sends POST requests here.'
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_TEST_KEY;
  if (!key) {
    throw new Error('Stripe API key not configured');
  }
  return new Stripe(key);
}


export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_TEST_SECRET;
      if (!webhookSecret) throw new Error('Stripe webhook secret not configured');
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
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
        // Resolve customer email with robust fallbacks
        const emailFromMeta = (session.metadata as any)?.user_email || undefined;
        const customerEmail = session.customer_email || emailFromMeta || undefined;

        // Attempt to resolve userId by email if not supplied
        let resolvedUserId: string | undefined = ((session.metadata as any)?.user_id as string) || undefined;
        const s = createSupabaseAdminClient();
        try {
          if (!resolvedUserId && customerEmail) {
            const { data: u } = await s.from('users').select('id').eq('email', customerEmail.toLowerCase()).maybeSingle();
            if (u) resolvedUserId = (u as any).id;
          }
        } catch {}

        const { data: created } = await s
          .from('orders')
          .insert({
            orderNumber: `STRIPE_${session.id}`,
            userId: resolvedUserId,
            status: 'processing',
            totalAmount: session.amount_total! / 100,
            paymentStatus: 'paid',
            paymentMethod: 'stripe',
            stripePaymentId: (session.payment_intent as string) || session.id,
            customerEmail: customerEmail || 'unknown@example.com',
            customerName: session.customer_details?.name || 'Unknown',
            shippingAddress: shippingAddress || undefined,
            billingAddress: billingAddress || undefined,
            buyerCountry: (billingAddress?.country || shippingAddress?.country || 'CA') as string,
            shippingCountry: (shippingAddress?.country || 'CA') as string,
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
          })
          .select('id')
          .single();

        // Create order items if provided in metadata
        try {
          const od = JSON.parse(session.metadata?.orderData || '{}');
          const items = Array.isArray(od?.items) ? od.items : [];
          const rows: any[] = [];
          for (const it of items) {
            try {
              let pid = String(it.id || '') || undefined;
              // Support composite ids like "productId:variantId"
              if (pid && pid.includes(':')) pid = pid.split(':')[0];
              const qty = Number(it.q || it.quantity || 1) || 1;
              const price = Number(it.p || it.price || 0) || 0;
              if (pid) {
                const { data: product } = await s
                  .from('products')
                  .select('id, isDigital, hsCode, countryOfOrigin, customsDescription')
                  .eq('id', pid)
                  .maybeSingle();
                if (product) {
                  rows.push({ orderId: (created as any).id, productId: (product as any).id, quantity: qty, price, isDigital: !!(product as any).isDigital, hsCode: (product as any).hsCode || undefined, countryOfOrigin: (product as any).countryOfOrigin || undefined, customsDescription: (product as any).customsDescription || undefined });
                }
              }
            } catch {}
          }
          if (rows.length) await s.from('order_items').insert(rows);
        } catch {}

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
          if (customerEmail) {
            sends.push(sendReceiptEmail(customerEmail, {
              customerName: session.customer_details?.name || undefined,
              orderNumber: `STRIPE_${session.id}`,
              items,
              total,
              currency,
              shippingAddress,
            }));
          }
          // Admin notifications receive the same receipt template
          const { data: admins } = await s
            .from('users')
            .select('email')
            .eq('role', 'ADMIN')
            .eq('isActive', true);
          admins.filter((a: { email: string | null }) => !!a.email).forEach((a: { email: string | null }) => {
            sends.push(sendReceiptEmail(a.email as string, {
              customerName: session.customer_details?.name || 'Customer',
              orderNumber: `STRIPE_${session.id}`,
              items,
              total,
              currency,
              shippingAddress,
            }));
          });
          // Always CC these admin addresses for visibility
          ;['bradjohnson79@gmail.com','info@anoint.me'].forEach((addr)=>{
            sends.push(sendReceiptEmail(addr, {
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
