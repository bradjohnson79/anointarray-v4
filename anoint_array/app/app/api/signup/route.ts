
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      select: { id: true }
    });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
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
}

export const POST = withApiErrorHandling(handler, '/api/signup');
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
