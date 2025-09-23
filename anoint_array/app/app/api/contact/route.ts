
import { NextRequest, NextResponse } from 'next/server';
import { callConvex } from '@/lib/convexHttp';

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

    // Save to Convex
    const addRes: any = await callConvex({ functionPath: 'contact:add', args: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || undefined,
      message: message.trim(),
      formType: formType || 'contact',
    } });

    // Send email notification (placeholder - in production would use email service)
    console.log(`New contact form submission:
      ID: ${addRes?.id || 'n/a'}
      Name: ${name}
      Email: ${email}
      Subject: ${subject || 'No subject'}
      Type: ${formType || 'contact'}
      Message: ${message}
      
      This message should be sent to: info@anoint.me`);

    return NextResponse.json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      id: addRes?.id 
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      'Failed to process contact form. Please try again.',
      { status: 500 }
    );
  } finally {
    // nothing
  }
}
