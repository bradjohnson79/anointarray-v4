import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Legacy endpoint kept to avoid 404s in older UI checks.
  // Convex is the primary datastore now.
  const url = process.env.CONVEX_URL || null;
  return NextResponse.json({ ok: !!url, message: 'Convex active', convexUrl: url });
}

