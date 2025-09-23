
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

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

    const s = createSupabaseAdminClient();
    const { data: order, error } = await s
      .from('orders')
      .select(`
        *,
        orderItems:order_items(*, product:products(*)),
        user:users(id, name, email)
      `)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Process order for frontend consumption
    const processedOrder = {
      ...order,
      totalAmount: Number(order.totalAmount),
      subtotal: order.subtotal ? Number(order.subtotal) : null,
      taxAmount: order.taxAmount ? Number(order.taxAmount) : null,
      shippingAmount: order.shippingAmount ? Number(order.shippingAmount) : null,
      refundAmount: order.refundAmount ? Number(order.refundAmount) : null,
      items: (order.orderItems || []).map((item: { id: string; quantity: number; price: any; product: { name: string | null } }) => ({
        id: item.id,
        name: item.product?.name ?? '',
        quantity: item.quantity,
        price: Number(item.price),
      })),
    };

    return NextResponse.json(processedOrder);
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
    const {
      status,
      paymentStatus,
      trackingNumber,
      notes,
      shippingAddress,
      billingAddress,
    } = body;

    const s = createSupabaseAdminClient();
    const patch: any = {};
    if (status) patch.status = status;
    if (paymentStatus) patch.paymentStatus = paymentStatus;
    if (trackingNumber) patch.trackingNumber = trackingNumber;
    if (notes) patch.notes = notes;
    if (shippingAddress) patch.shippingAddress = shippingAddress;
    if (billingAddress) patch.billingAddress = billingAddress;
    if (status === 'shipped' && !trackingNumber) patch.shippedAt = new Date().toISOString();
    if (status === 'delivered') patch.deliveredAt = new Date().toISOString();
    if (status === 'cancelled') patch.cancelledAt = new Date().toISOString();
    if (paymentStatus === 'refunded') patch.refundedAt = new Date().toISOString();
    const { data: updatedOrder, error: uErr } = await s
      .from('orders')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (uErr) throw uErr;

    return NextResponse.json({
      ...updatedOrder,
      totalAmount: Number(updatedOrder.totalAmount),
      subtotal: updatedOrder.subtotal ? Number(updatedOrder.subtotal) : null,
      taxAmount: updatedOrder.taxAmount ? Number(updatedOrder.taxAmount) : null,
      shippingAmount: updatedOrder.shippingAmount ? Number(updatedOrder.shippingAmount) : null,
      refundAmount: updatedOrder.refundAmount ? Number(updatedOrder.refundAmount) : null,
    });
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

    const s = createSupabaseAdminClient();
    const { data: order } = await s.from('orders').select('id').eq('id', id).maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Delete order items first, then order
    await s.from('order_items').delete().eq('orderId', id);
    await s.from('orders').delete().eq('id', id);

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
