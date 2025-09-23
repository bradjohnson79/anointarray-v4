
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { withApiErrorHandling } from '@/lib/api-handler';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function dbEnvSummary() {
  const url = process.env.CONVEX_URL;
  return { convexUrl: url || null };
}

async function GET_handler(request: NextRequest) {
  try {
    await requireAdmin();
    const orders = await callConvex({ functionPath: 'orders:list', args: {} });
    return NextResponse.json(orders);
  } catch (error: any) {
    const raw = String(error?.message || error || '');
    // Sanitize DSN credentials if present
    const detail = raw;
    const summary = dbEnvSummary();
    // Add short hint classification
    const m = raw.toLowerCase();
    let hint: string | undefined;
    if (m.includes('convex') && m.includes('failed')) hint = 'CONVEX_FAILED';
    else if (m.includes('timeout')) hint = 'CONVEX_TIMEOUT';
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

    // Create via Convex
    await callConvex({ functionPath: 'orders:create', args: {
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
      items,
      buyerCountry,
      shippingCountry,
      taxSubtotalCad,
      taxBreakdown,
      dutiesEstimatedCad,
      taxesEstimatedCad,
      dutiesTaxesCurrency,
      incoterm,
    } });
    const orders = await callConvex({ functionPath: 'orders:list', args: {} });
    return NextResponse.json(orders, { status: 201 });
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
