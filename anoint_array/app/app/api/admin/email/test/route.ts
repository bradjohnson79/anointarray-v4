import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { sendReceiptEmail, sendSignupConfirmationEmail, sendNewsletterOptInEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { to, type } = await request.json().catch(() => ({ to: '', type: 'receipt' }));
    const recipient = to || process.env.EMAIL_FROM || '';
    if (!recipient) {
      return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 });
    }

    if (type === 'signup' || type === 'signup_confirmation') {
      await sendSignupConfirmationEmail(recipient, { customerName: 'Friend' });
      return NextResponse.json({ success: true, to: recipient, type: 'signup' });
    }

    if (type === 'newsletter' || type === 'newsletter_optin') {
      await sendNewsletterOptInEmail(recipient, { customerName: 'Friend' });
      return NextResponse.json({ success: true, to: recipient, type: 'newsletter_optin' });
    }

    // default: receipt
    const sampleItems = [
      { name: 'Sample Product A', quantity: 1, price: 9.99 },
      { name: 'Sample Product B', quantity: 2, price: 4.5 },
    ];
    const total = sampleItems.reduce((s, i) => s + i.price * i.quantity, 0);
    await sendReceiptEmail(recipient, { customerName: 'Customer', orderNumber: `TEST_${Date.now()}`, items: sampleItems, total });
    return NextResponse.json({ success: true, to: recipient, type: 'receipt' });
  } catch (e) {
    console.error('Test email send error:', e);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
