import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const email = user?.email || '';
  const userId = user?.id;
  const supabase = createSupabaseAdminClient();
  // Query orders by userId or fallback by email
  let q = supabase
    .from('orders')
    .select(`
      id, orderNumber, createdAt, totalAmount, paymentStatus, status,
      orderItems:order_items(id, quantity, price, isDigital, product:products(id, name, digitalFileUrl))
    `)
    .order('createdAt', { ascending: false });
  if (userId) q = q.eq('userId', userId);
  else q = q.eq('customerEmail', email);
  const { data: orders, error } = await q;
  if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });

  const out = (orders || []).map((o: any) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    total: Number(o.totalAmount),
    paymentStatus: o.paymentStatus,
    status: o.status,
    items: (o.orderItems || []).map((oi: any) => ({ id: oi.id, name: oi.product?.name, quantity: oi.quantity, price: Number(oi.price), isDigital: oi.isDigital, digitalFileUrl: oi.product?.digitalFileUrl || null }))
  }));
  return NextResponse.json(out);
}
