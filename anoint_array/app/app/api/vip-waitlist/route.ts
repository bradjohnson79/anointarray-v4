
import { NextRequest, NextResponse } from 'next/server';
import { callConvex } from '@/lib/convexHttp';
import { withApiErrorHandling } from '@/lib/api-handler';
import { BadRequestError, ConflictError } from '@/lib/http-errors';


export const dynamic = 'force-dynamic';

async function handler(request: NextRequest) {
  const body = await request.json();
  const { name, email, phone, interests } = body;

    // Validate required fields
  if (!name?.trim() || !email?.trim()) {
    throw new BadRequestError('Missing required fields: name and email are required.');
  }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BadRequestError('Invalid email format.');
  }

    // Save to Convex
    const addRes: any = await callConvex({ functionPath: 'vip:add', args: { name: name.trim(), email: email.trim().toLowerCase(), phone: phone?.trim() || undefined, interests: interests?.trim() || undefined } });
    if (!addRes?.ok && addRes?.error === 'exists') {
      throw new ConflictError('This email is already registered for the VIP waitlist.');
    }

    // Send email notification (placeholder - in production would use email service)
    console.log(`New VIP waitlist signup:
      ID: ${addRes?.id || 'n/a'}
      Name: ${name}
      Email: ${email}
      Phone: ${phone || 'Not provided'}
      Interests: ${interests || 'Not specified'}
      
      This notification should be sent to: info@anoint.me`);

  return NextResponse.json({ 
    success: true, 
    message: 'Successfully joined VIP waitlist',
    id: addRes?.id 
  });
}

export const POST = withApiErrorHandling(handler, '/api/vip-waitlist');
