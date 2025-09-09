import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendReceiptEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to } = await request.json().catch(() => ({ to: '' }));
    const recipient = to || session.user?.email || process.env.EMAIL_FROM || '';
    if (!recipient) {
      return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 });
    }

    // Build a small sample order for the receipt template
    const sampleItems = [
      { name: 'Sample Product A', quantity: 1, price: 9.99 },
      { name: 'Sample Product B', quantity: 2, price: 4.5 },
    ];
    const total = sampleItems.reduce((s, i) => s + i.price * i.quantity, 0);

    await sendReceiptEmail(recipient, {
      customerName: session.user?.name || 'Customer',
      orderNumber: `TEST_${Date.now()}`,
      items: sampleItems,
      total,
    });

    return NextResponse.json({ success: true, to: recipient });
  } catch (e) {
    console.error('Test email send error:', e);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}

