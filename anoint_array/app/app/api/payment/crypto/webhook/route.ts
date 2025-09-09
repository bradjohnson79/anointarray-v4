
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendReceiptEmail } from '@/lib/email';
import { notifyGoAffProConversion } from '@/lib/affiliates';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Verify the webhook is from NOWPayments (you should implement signature verification)
    console.log('NOWPayments webhook received:', body);

    if (body.payment_status === 'finished' || body.payment_status === 'confirmed') {
      try {
        // Create order in database
        await prisma.order.create({
          data: {
            orderNumber: `CRYPTO_${body.payment_id}`,
            userId: undefined, // You'll need to store this in the order_id or metadata
            status: 'processing',
            totalAmount: parseFloat(body.price_amount),
            paymentStatus: 'paid',
            paymentMethod: 'crypto',
            cryptoAddress: body.pay_address || '',
            customerEmail: body.order_description?.includes('@') ? body.order_description : 'unknown',
            customerName: 'Crypto Customer'
          }
        });

        // Send receipt email to customer and all admins (best effort)
        try {
          const email = body.customer_email || (body.order_description?.includes('@') ? body.order_description : '');
          const currency = (body.price_currency || 'USD').toUpperCase();
          const sends: Promise<any>[] = [];
          if (email) {
            sends.push(sendReceiptEmail(email, {
              orderNumber: `CRYPTO_${body.payment_id}`,
              items: [],
              total: parseFloat(body.price_amount),
              currency,
            }));
          }
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { email: true } });
          admins.filter(a => a.email).forEach(a => {
            sends.push(sendReceiptEmail(a.email!, {
              orderNumber: `CRYPTO_${body.payment_id}`,
              items: [],
              total: parseFloat(body.price_amount),
              currency,
            }));
          });
          await Promise.allSettled(sends);
        } catch (e) {
          console.warn('Receipt email failed (crypto):', e);
        }

        console.log('Crypto order created successfully:', body.payment_id);
        // Affiliate conversion (best effort). Parse optional JSON order_description
        try {
          let aff: string | null = null;
          try { const j = JSON.parse(body.order_description || '{}'); aff = j?.aff || null; } catch {}
          await notifyGoAffProConversion({ orderId: `CRYPTO_${body.payment_id}`, amount: parseFloat(body.price_amount), currency: (body.price_currency || 'USD').toUpperCase(), affiliateCode: aff, customerEmail: body.customer_email || null });
        } catch (e) { console.warn('Affiliate conversion failed (crypto non-fatal):', e); }
      } catch (error) {
        console.error('Failed to create crypto order:', error);
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Crypto webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
