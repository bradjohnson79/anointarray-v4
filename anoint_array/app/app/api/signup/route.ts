
import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/api-handler';
import bcrypt from 'bcryptjs';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';
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

    const emailLower = String(email).toLowerCase();
    // Check if user exists in Convex
    let existing: any;
    try { existing = await callConvex({ functionPath: 'users:byEmail', args: { email: emailLower } }); }
    catch { existing = await runConvex('users:byEmail', { email: emailLower }); }
    if (existing) throw new ConflictError('User with this email already exists');
    // Hash and store
    const hash = await bcrypt.hash(String(password), 10);
    try { await callConvex({ functionPath: 'users:setPasswordHash', args: { email: emailLower, passwordHash: hash } }); }
    catch { await runConvex('users:setPasswordHash', { email: emailLower, passwordHash: hash }); }
    try { await callConvex({ functionPath: 'users:upsertByEmail', args: { email: emailLower, name: String(fullName) } }); }
    catch { await runConvex('users:upsertByEmail', { email: emailLower, name: String(fullName) }); }
    const user = { email: emailLower, name: String(fullName), role: 'USER' };

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
