
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

interface CreateOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  taxAmount?: number;
  shippingAmount?: number;
  totalAmount: number;
  paymentMethod?: 'stripe' | 'paypal' | 'crypto' | 'manual';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  notes?: string;
  createShippingLabel?: boolean;
  shippingCarrier?: 'canada-post' | 'ups';
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body: CreateOrderRequest = await request.json();

    // Create sequential order number
    const supabase = createSupabaseAdminClient();
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const safeCount = typeof orderCount === 'number' ? orderCount : 0;
    const orderNumber = `ANA-${new Date().getFullYear()}-${String(safeCount + 1).padStart(3, '0')}`;

    // Persist order with items using Supabase
    const { data: order, error: createErr } = await supabase
      .from('orders')
      .insert({
        orderNumber,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        status: 'pending',
        paymentStatus: body.paymentStatus || 'pending',
        paymentMethod: body.paymentMethod,
        totalAmount: body.totalAmount,
        subtotal: body.subtotal,
        taxAmount: body.taxAmount || 0,
        shippingAmount: body.shippingAmount || 0,
        shippingAddress: body.shippingAddress,
        billingAddress: body.billingAddress || body.shippingAddress,
        notes: body.notes,
      })
      .select('*')
      .single();
    if (createErr) throw createErr;
    if (Array.isArray(body.items) && body.items.length > 0) {
      const rows = body.items.map((it) => ({
        orderId: (order as any).id,
        productId: it.productId,
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(rows);
      if (itemsErr) throw itemsErr;
    }

    let shippingLabel = null;

    // Create shipping label if requested
    if (body.createShippingLabel && body.shippingCarrier) {
      try {
        const orderForLabel = { ...(order as any), items: Array.isArray(body.items) ? body.items : [] };
        shippingLabel = await createShippingLabel(orderForLabel, body.shippingCarrier);
        
        // Update order with tracking number
        if (shippingLabel.success && shippingLabel.trackingNumber) {
          await supabase
            .from('orders')
            .update({ trackingNumber: shippingLabel.trackingNumber, status: 'processing' })
            .eq('id', (order as any).id);
        }
      } catch (labelError) {
        console.error('Error creating shipping label:', labelError);
        // Don't fail order creation if label generation fails
      }
    }

    return NextResponse.json({
      success: true,
      order,
      shippingLabel
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

async function createShippingLabel(order: any, carrier: string) {
  // Mock shipping addresses - in production, these would come from your business settings
  const senderAddress = {
    name: 'ANOINT Array',
    company: 'ANOINT Array Inc.',
    address: '123 Sacred Way',
    city: 'Toronto',
    state: 'ON',
    province: 'ON',
    postalCode: 'M1A 1A1',
    country: 'CA',
    phone: '+1-416-555-0123'
  };

  const recipientAddress = {
    name: order.customerName,
    address: order.shippingAddress.street,
    city: order.shippingAddress.city,
    state: order.shippingAddress.state,
    province: order.shippingAddress.state,
    postalCode: order.shippingAddress.zip,
    country: order.shippingAddress.country,
    phone: order.customerPhone || '+1-555-0000',
    email: order.customerEmail
  };

  // Calculate package weight and dimensions
  const totalWeight = order.items.reduce((sum: number, item: any) => {
    // Mock weight calculation - 1 lb per item
    return sum + (item.quantity * 1);
  }, 0);

  const packageInfo = {
    weight: Math.max(totalWeight, 0.5), // Minimum 0.5 lbs
    dimensions: {
      length: 12,
      width: 9,
      height: 6
    }
  };

  let labelData: any;

  if (carrier === 'canada-post') {
    labelData = {
      orderId: order.id,
      sender: senderAddress,
      recipient: recipientAddress,
      serviceCode: 'DOM.RP',
      value: Number(order.totalAmount),
      parcel: {
        weight: packageInfo.weight * 0.453592, // Convert to kg
        dimensions: {
          length: packageInfo.dimensions.length * 2.54, // Convert to cm
          width: packageInfo.dimensions.width * 2.54,
          height: packageInfo.dimensions.height * 2.54
        }
      }
    };
    
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/shipping/canada-post/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labelData)
    });
    
    return await response.json();
  } else if (carrier === 'ups') {
    labelData = {
      orderId: order.id,
      sender: senderAddress,
      recipient: recipientAddress,
      serviceCode: '03',
      value: Number(order.totalAmount),
      package: packageInfo
    };
    
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/shipping/ups/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labelData)
    });
    
    return await response.json();
  }

  throw new Error('Unsupported carrier');
}
