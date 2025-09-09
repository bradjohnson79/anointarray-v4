
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

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
      items: order.orderItems.map(item => ({
        id: item.id,
        name: item.product.name,
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
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(trackingNumber && { trackingNumber }),
        ...(notes && { notes }),
        ...(shippingAddress && { shippingAddress }),
        ...(billingAddress && { billingAddress }),
        ...(status === 'shipped' && !trackingNumber && { shippedAt: new Date() }),
        ...(status === 'delivered' && { deliveredAt: new Date() }),
        ...(status === 'cancelled' && { cancelledAt: new Date() }),
        ...(paymentStatus === 'refunded' && { refundedAt: new Date() }),
      },
    });

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
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Delete order items first, then order
    await prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
