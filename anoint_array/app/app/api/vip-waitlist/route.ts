
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
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

    // Check if email already exists in waitlist
    const s = createSupabaseAdminClient();
    const { data: existingEntry } = await s
      .from('vip_waitlist')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

  if (existingEntry) {
    throw new ConflictError('This email is already registered for the VIP waitlist.');
  }

    // Save to database
    const { data: waitlistEntry, error } = await s
      .from('vip_waitlist')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        interests: interests?.trim() || null,
      })
      .select('id, name, email, phone, interests')
      .single();
    if (error) throw error;

    // Send email notification (placeholder - in production would use email service)
    console.log(`New VIP waitlist signup:
      ID: ${waitlistEntry.id}
      Name: ${waitlistEntry.name}
      Email: ${waitlistEntry.email}
      Phone: ${waitlistEntry.phone || 'Not provided'}
      Interests: ${waitlistEntry.interests || 'Not specified'}
      
      This notification should be sent to: info@anoint.me`);

  return NextResponse.json({ 
    success: true, 
    message: 'Successfully joined VIP waitlist',
    id: waitlistEntry.id 
  });
}

export const POST = withApiErrorHandling(handler, '/api/vip-waitlist');
