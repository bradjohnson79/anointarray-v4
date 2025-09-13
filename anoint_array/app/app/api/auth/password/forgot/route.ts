import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';
import { serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always respond 200 to prevent user enumeration
    if (!user) return NextResponse.json({ success: true });

    // Invalidate existing tokens for this identifier
    await prisma.verificationToken.deleteMany({ where: { identifier: email.toLowerCase() } }).catch(() => {});

    const token = crypto.randomUUID() + crypto.randomBytes(16).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
    await prisma.verificationToken.create({ data: { identifier: email.toLowerCase(), token, expires } });

    const baseUrl = serverEnv.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(email.toLowerCase(), { resetUrl });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Forgot password error:', e);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

