
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    let payload: any = null;
    try {
      payload = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { email, password, fullName } = payload || {};

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(String(password), 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        name: String(fullName),
        password: hashedPassword,
        role: 'USER',
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });

    // Remove password from response
    return NextResponse.json(
      { message: 'User created successfully', user },
      { status: 201 }
    );
  } catch (error: any) {
    const msg = String(error?.message || error || 'Signup failed');
    console.error('[api:error]', JSON.stringify({ route: '/api/signup', code: 'SIGNUP_FAILED', msg }));
    if (msg.includes('Unique constraint') || msg.includes('P2002')) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
