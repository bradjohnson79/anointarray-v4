import { NextResponse } from 'next/server';

// Tiny 16x16 transparent PNG (valid for most browsers at /favicon.ico)
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAHElEQVQ4T2NkwAT/Gf4ZGBgYw4gZQGQGQwAAcYkB1j7p3s8AAAAASUVORK5CYII=';

export const dynamic = 'force-static';

export async function GET() {
  const buf = Buffer.from(PNG_BASE64, 'base64');
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

