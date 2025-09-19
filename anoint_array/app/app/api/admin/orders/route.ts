
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import { withApiErrorHandling } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function dbEnvSummary() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  return { supabaseUrl: url || null };
}

async function GET_handler(request: NextRequest) {
  try {
    await requireAdmin();
    const s = createSupabaseAdminClient();
    const { data: orders, error } = await s
      .from('orders')
      .select(`
        *,
        orderItems:order_items(id, quantity, price, hsCode, countryOfOrigin, customsDescription, unitValueCad, massGramsEach, isDigital, product:products(name)),
        user:users(id, name, email)
      `)
      .order('createdAt', { ascending: false });
    if (error) throw error;

    // Process orders for frontend consumption
    const processedOrders = orders.map((order: any) => ({
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
      items: order.orderItems.map((item: any) => ({
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
    const raw = String(error?.message || error || '');
    // Sanitize DSN credentials if present
    const detail = raw;
    const summary = dbEnvSummary();
    // Add short hint classification
    const m = raw.toLowerCase();
    let hint: string | undefined;
    if (m.includes('econnrefused') || m.includes('getaddrinfo') || m.includes('cannot') && m.includes('reach')) hint = 'DB_CONNECT_FAILED';
    else if (m.includes('timeout')) hint = 'DB_TIMEOUT';
    else if (m.includes('password authentication failed')) hint = 'DB_AUTH_FAILED';
    const body = { error: 'Failed to fetch orders', detail, db: summary, hint };
    console.error('orders:list error', body);
    return NextResponse.json(body, { status: 500 });
  }
}

async function POST_handler(request: NextRequest) {
  try {
    await requireAdmin();

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
    const s = createSupabaseAdminClient();
    const { count: orderCount } = await s.from('orders').select('*', { count: 'exact', head: true });
    const orderNumber = `ANA-${new Date().getFullYear()}-${String((orderCount || 0) + 1).padStart(3, '0')}`;

    // Create order with optional items in a transaction
    const { data: order, error: createErr } = await s
      .from('orders')
      .insert({
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
      })
      .select('*')
      .single();
    if (createErr) throw createErr;
    if (Array.isArray(items) && items.length > 0) {
      const rows = items
        .filter((it: any) => it?.productId && it?.quantity && typeof it.price !== 'undefined')
        .map((it: any) => ({
          orderId: (order as any).id,
          productId: it.productId,
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
          hsCode: it.hsCode || null,
          countryOfOrigin: it.countryOfOrigin || null,
          customsDescription: it.customsDescription || null,
          unitValueCad: typeof it.unitValueCad !== 'undefined' ? Number(it.unitValueCad) : null,
          massGramsEach: typeof it.massGramsEach !== 'undefined' ? Number(it.massGramsEach) : null,
          isDigital: !!it.isDigital,
        }));
      const { error: itemsErr } = await s.from('order_items').insert(rows);
      if (itemsErr) throw itemsErr;
    }

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
    const raw = String(error?.message || error || '');
    const detail = raw;
    const body = { error: 'Failed to create order', detail, db: dbEnvSummary() };
    console.error('orders:create error', body);
    return NextResponse.json(body, { status: 500 });
  }
}

export const GET = withApiErrorHandling(GET_handler, '/api/admin/orders');
export const POST = withApiErrorHandling(POST_handler, '/api/admin/orders');
