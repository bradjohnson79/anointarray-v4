
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import { withApiErrorHandling } from '@/lib/api-handler';
import { BadRequestError, ConflictError } from '@/lib/http-errors';

async function handler(req: NextRequest) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch (e) {
    throw new BadRequestError('Invalid JSON body');
  }
  const { email, password, fullName } = payload || {};

  if (!email || !password || !fullName) {
    throw new BadRequestError('Email, password, and full name are required');
  }

    const s = createSupabaseAdminClient();
    // Check if user already exists (profile table)
    const { data: existingUser } = await s
      .from('users')
      .select('id')
      .eq('email', String(email).toLowerCase())
      .maybeSingle();

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

    // Create Supabase Auth user and profile row
    const emailLower = String(email).toLowerCase();
    const adminRes = await s.auth.admin.createUser({ email: emailLower, password: String(password), email_confirm: true });
    if (adminRes.error) throw new BadRequestError(adminRes.error.message || 'Failed to create auth user');
    const { data: user } = await s
      .from('users')
      .upsert({ email: emailLower, name: String(fullName), role: 'USER', isActive: true }, { onConflict: 'email' })
      .select('id, email, name, role, createdAt')
      .single();

    // Remove password from response
  return NextResponse.json(
    { message: 'User created successfully', user },
    { status: 201 }
  );
}

export const POST = withApiErrorHandling(handler, '/api/signup');
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
