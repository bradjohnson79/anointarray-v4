
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Process orders for frontend consumption
    const processedOrders = orders.map(order => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      subtotal: order.subtotal ? Number(order.subtotal) : null,
      taxAmount: order.taxAmount ? Number(order.taxAmount) : null,
      shippingAmount: order.shippingAmount ? Number(order.shippingAmount) : null,
      refundAmount: order.refundAmount ? Number(order.refundAmount) : null,
      // Tax & Customs Fields
      buyerCountry: order.buyerCountry,
      shippingCountry: order.shippingCountry,
      taxSubtotalCad: order.taxSubtotalCad ? Number(order.taxSubtotalCad) : 0,
      taxBreakdown: order.taxBreakdown || {},
      dutiesEstimatedCad: order.dutiesEstimatedCad ? Number(order.dutiesEstimatedCad) : 0,
      taxesEstimatedCad: order.taxesEstimatedCad ? Number(order.taxesEstimatedCad) : 0,
      dutiesTaxesCurrency: order.dutiesTaxesCurrency,
      incoterm: order.incoterm,
      items: order.orderItems.map(item => ({
        id: item.id,
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
        // Customs snapshot fields
        hsCode: item.hsCode,
        countryOfOrigin: item.countryOfOrigin,
        customsDescription: item.customsDescription,
        unitValueCad: item.unitValueCad ? Number(item.unitValueCad) : null,
        massGramsEach: item.massGramsEach,
        isDigital: item.isDigital,
      })),
    }));

    return NextResponse.json(processedOrders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    const detail = typeof error?.message === 'string' ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', detail },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      status = 'pending',
      paymentStatus = 'pending',
      paymentMethod,
      totalAmount,
      subtotal,
      taxAmount,
      shippingAmount,
      shippingAddress,
      billingAddress,
      notes,
      items = [],
      // Tax & Customs fields
      buyerCountry = 'CA',
      shippingCountry = 'CA',
      taxSubtotalCad = 0,
      taxBreakdown = {},
      dutiesEstimatedCad = 0,
      taxesEstimatedCad = 0,
      dutiesTaxesCurrency = 'CAD',
      incoterm = 'DDP'
    } = body;

    if (!customerName || !customerEmail || !totalAmount) {
      return NextResponse.json(
        { error: 'Customer name, email, and total amount are required' },
        { status: 400 }
      );
    }

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `ANA-${new Date().getFullYear()}-${String(orderCount + 1).padStart(3, '0')}`;

    // Create order with optional items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          customerEmail,
          customerPhone,
          status,
          paymentStatus,
          paymentMethod,
          totalAmount,
          subtotal,
          taxAmount,
          shippingAmount,
          shippingAddress,
          billingAddress,
          notes,
          buyerCountry,
          shippingCountry,
          taxSubtotalCad,
          taxBreakdown,
          dutiesEstimatedCad,
          taxesEstimatedCad,
          dutiesTaxesCurrency,
          incoterm,
        }
      });

      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          if (!it?.productId || !it?.quantity || typeof it.price === 'undefined') continue;
          await tx.orderItem.create({
            data: {
              orderId: created.id,
              productId: it.productId,
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || 0,
              // Customs snapshot
              hsCode: it.hsCode || null,
              countryOfOrigin: it.countryOfOrigin || null,
              customsDescription: it.customsDescription || null,
              unitValueCad: typeof it.unitValueCad !== 'undefined' ? Number(it.unitValueCad) : null,
              massGramsEach: typeof it.massGramsEach !== 'undefined' ? Number(it.massGramsEach) : null,
              isDigital: !!it.isDigital,
            }
          });
        }
      }

      return created;
    });

    return NextResponse.json({
      ...order,
      totalAmount: Number(order.totalAmount),
      subtotal: order.subtotal ? Number(order.subtotal) : null,
      taxAmount: order.taxAmount ? Number(order.taxAmount) : null,
      shippingAmount: order.shippingAmount ? Number(order.shippingAmount) : null,
      // Tax & Customs fields
      taxSubtotalCad: Number(order.taxSubtotalCad),
      dutiesEstimatedCad: Number(order.dutiesEstimatedCad),
      taxesEstimatedCad: Number(order.taxesEstimatedCad),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    const detail = typeof error?.message === 'string' ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create order', detail },
      { status: 500 }
    );
  }
}
