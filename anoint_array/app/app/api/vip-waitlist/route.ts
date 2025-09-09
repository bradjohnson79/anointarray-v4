
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, interests } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        'Missing required fields: name and email are required.',
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        'Invalid email format.',
        { status: 400 }
      );
    }

    // Check if email already exists in waitlist
    const existingEntry = await prisma.vipWaitlist.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingEntry) {
      return NextResponse.json(
        'This email is already registered for the VIP waitlist.',
        { status: 400 }
      );
    }

    // Save to database
    const waitlistEntry = await prisma.vipWaitlist.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        interests: interests?.trim() || null,
      },
    });

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

  } catch (error) {
    console.error('Error processing VIP waitlist signup:', error);
    
    // Handle unique constraint violation specifically
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        'This email is already registered for the VIP waitlist.',
        { status: 400 }
      );
    }

    return NextResponse.json(
      'Failed to join VIP waitlist. Please try again.',
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
