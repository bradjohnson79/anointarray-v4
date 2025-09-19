
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const supabase = createSupabaseAdminClient();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, address, isActive, lastLoginAt, createdAt, updatedAt')
      .order('createdAt', { ascending: false });
    if (error) throw error;

    // Fetch basic order aggregates per user
    const ids = (users || []).map((u: any) => u.id);
    let countsByUser: Record<string, { count: number; total: number }> = {};
    if (ids.length) {
      const { data: orders } = await supabase
        .from('orders')
        .select('userId, totalAmount')
        .in('userId', ids);
      for (const o of orders || []) {
        const uid = (o as any).userId || 'unknown';
        const total = Number((o as any).totalAmount || 0);
        countsByUser[uid] = countsByUser[uid] || { count: 0, total: 0 };
        countsByUser[uid].count += 1;
        countsByUser[uid].total += total;
      }
    }

    const processedUsers = (users || []).map((user: any) => ({
      ...user,
      ordersCount: countsByUser[user.id]?.count || 0,
      totalSpent: countsByUser[user.id]?.total || 0,
      arraysGenerated: Math.floor(Math.random() * 20),
    }));

    return NextResponse.json(processedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, email, password, phone, role = 'USER' } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, email, password: hashedPassword, phone, role })
      .select('id, name, email, role, phone, address, isActive, lastLoginAt, createdAt, updatedAt')
      .single();
    if (error) throw error;

    // Don't return password
    const { password: _, ...userWithoutPassword } = (user as any);

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
