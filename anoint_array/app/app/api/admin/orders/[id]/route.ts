
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = params;
    const order = await callConvex({ functionPath: 'orders:get', args: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = params;
    const body = await request.json();
    const { status, paymentStatus, trackingNumber, notes, shippingAddress, billingAddress } = body;
    const patch: any = {};
    if (status) patch.status = status;
    if (paymentStatus) patch.paymentStatus = paymentStatus;
    if (trackingNumber) patch.trackingNumber = trackingNumber;
    if (notes) patch.notes = notes;
    if (shippingAddress) patch.shippingAddress = shippingAddress;
    if (billingAddress) patch.billingAddress = billingAddress;
    await callConvex({ functionPath: 'orders:update', args: { id, patch } });
    const updated = await callConvex({ functionPath: 'orders:get', args: { id } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = params;
    const res: any = await callConvex({ functionPath: 'orders:remove', args: { id } });
    if (!res?.ok) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
