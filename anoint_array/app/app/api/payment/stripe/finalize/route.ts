import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { sendReceiptEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_TEST_KEY;
  if (!key) throw new Error('Stripe API key not configured');
  return new Stripe(key);
}

// Idempotent finalizer: if webhook missed, create order + send emails using the Checkout Session.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Session not paid', status: session?.payment_status || 'unknown' }, { status: 409 });
    }

    // If the order already exists, exit early
    const orderNumber = `STRIPE_${session.id}`;
    const existing = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
    if (existing) return NextResponse.json({ ok: true, orderNumber, status: 'already_finalized' });

    // Build addresses
    const stripeShipping: any = (session as any)?.shipping_details?.address || (session as any)?.customer_details?.address || null;
    const toAddressJson = (addr: any) => addr ? {
      fullName: (session as any)?.shipping_details?.name || undefined,
      email: (session as any)?.customer_details?.email || undefined,
      phone: (session as any)?.customer_details?.phone || undefined,
      street: [addr.line1, addr.line2].filter(Boolean).join(' '),
      city: addr.city,
      state: addr.state,
      zip: addr.postal_code,
      country: addr.country,
    } : null;
    const shippingAddress = toAddressJson(stripeShipping);
    const billingAddress = shippingAddress;

    // Resolve user/email
    const emailFromMeta = (session.metadata as any)?.user_email || undefined;
    const customerEmail = session.customer_email || emailFromMeta || undefined;
    let resolvedUserId: string | undefined = ((session.metadata as any)?.user_id as string) || undefined;
    try {
      if (!resolvedUserId && customerEmail) {
        const u = await prisma.user.findUnique({ where: { email: customerEmail.toLowerCase() }, select: { id: true } });
        if (u) resolvedUserId = u.id;
      }
    } catch {}

    // Create order
    const created = await prisma.order.create({
      data: {
        orderNumber,
        userId: resolvedUserId,
        status: 'processing',
        totalAmount: (session.amount_total || 0) / 100,
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentId: (session.payment_intent as string) || session.id,
        customerEmail: customerEmail || 'unknown@example.com',
        customerName: session.customer_details?.name || 'Unknown',
        shippingAddress: shippingAddress || undefined,
        billingAddress: billingAddress || undefined,
        buyerCountry: (billingAddress?.country || shippingAddress?.country || 'CA') as string,
        shippingCountry: (shippingAddress?.country || 'CA') as string,
      }
    });

    // Create order items from metadata
    try {
      const od = JSON.parse(session.metadata?.orderData || '{}');
      const items = Array.isArray(od?.items) ? od.items : [];
      const rows: any[] = [];
      for (const it of items) {
        try {
          let pid = String(it.id || '') || undefined;
          if (pid && pid.includes(':')) pid = pid.split(':')[0];
          const qty = Number(it.q || it.quantity || 1) || 1;
          const price = Number(it.p || it.price || 0) || 0;
          if (pid) {
            const product = await prisma.product.findUnique({ where: { id: pid }, select: { id: true, isDigital: true, hsCode: true, countryOfOrigin: true, customsDescription: true } });
            if (product) {
              rows.push({ orderId: created.id, productId: product.id, quantity: qty, price, isDigital: !!product.isDigital, hsCode: product.hsCode || undefined, countryOfOrigin: product.countryOfOrigin || undefined, customsDescription: product.customsDescription || undefined });
            }
          }
        } catch {}
      }
      if (rows.length) await prisma.orderItem.createMany({ data: rows, skipDuplicates: true });
    } catch {}

    // Send receipts
    try {
      const od = JSON.parse(session.metadata?.orderData || '{}');
      const items = Array.isArray(od?.items) ? od.items.map((it: any) => ({ name: it.name ?? it.n ?? 'Item', quantity: it.quantity ?? it.q ?? 1, price: Number(it.price ?? it.p ?? 0) })) : [];
      const total = (session.amount_total || 0) / 100;
      const currency = (session.currency || 'USD').toUpperCase();
      const sends: Promise<any>[] = [];
      if (customerEmail) sends.push(sendReceiptEmail(customerEmail, { customerName: session.customer_details?.name || undefined, orderNumber, items, total, currency, shippingAddress }));
      ['bradjohnson79@gmail.com','info@anoint.me'].forEach(addr => sends.push(sendReceiptEmail(addr, { customerName: session.customer_details?.name || 'Customer', orderNumber, items, total, currency, shippingAddress })));
      await Promise.allSettled(sends);
    } catch {}

    return NextResponse.json({ ok: true, orderNumber });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Finalize failed' }, { status: 500 });
  }
}
