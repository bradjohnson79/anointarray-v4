import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const id = ctx.params.id;
    const supabase = createSupabaseAdminClient();
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, role, phone, address, isActive, lastLoginAt, createdAt, updatedAt')
      .eq('id', id)
      .maybeSingle();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const id = ctx.params.id;
    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.phone === 'string') data.phone = body.phone;
    if (typeof body.role === 'string' && (body.role === 'USER' || body.role === 'ADMIN')) data.role = body.role;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data: updated, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select('id, name, email, role, phone, isActive')
      .single();
    if (error) throw error;
    return NextResponse.json(updated);
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    if (/not\s+found/i.test(msg)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const id = ctx.params.id;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    if (/not\s+found/i.test(msg)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
