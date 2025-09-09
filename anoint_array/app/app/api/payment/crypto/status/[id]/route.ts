
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;

    // Check payment status with NOWPayments
    const statusResponse = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
    });

    const statusData = await statusResponse.json();

    if (statusData.error) {
      throw new Error(statusData.message || 'Status check failed');
    }

    let status = 'pending';
    if (statusData.payment_status === 'waiting') status = 'pending';
    else if (statusData.payment_status === 'confirming') status = 'confirming';
    else if (['confirmed', 'sending', 'partially_paid', 'finished'].includes(statusData.payment_status)) status = 'confirmed';
    else if (['failed', 'refunded', 'expired'].includes(statusData.payment_status)) status = 'failed';

    return NextResponse.json({
      paymentId: statusData.payment_id,
      status,
      paymentStatus: statusData.payment_status,
      payAmount: statusData.pay_amount,
      actuallyPaid: statusData.actually_paid,
      payCurrency: statusData.pay_currency,
      outcome: statusData.outcome,
    });
  } catch (error) {
    console.error('Crypto payment status error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
