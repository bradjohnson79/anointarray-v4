
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, formType } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        'Missing required fields: name, email, and message are required.',
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

    // Save to database
    const contactForm = await prisma.contactForm.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject?.trim() || null,
        message: message.trim(),
        formType: formType || 'contact',
      },
    });

    // Send email notification (placeholder - in production would use email service)
    console.log(`New contact form submission:
      ID: ${contactForm.id}
      Name: ${contactForm.name}
      Email: ${contactForm.email}
      Subject: ${contactForm.subject || 'No subject'}
      Type: ${contactForm.formType}
      Message: ${contactForm.message}
      
      This message should be sent to: info@anoint.me`);

    return NextResponse.json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      id: contactForm.id 
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      'Failed to process contact form. Please try again.',
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
