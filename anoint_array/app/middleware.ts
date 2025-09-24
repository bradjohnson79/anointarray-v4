import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware((auth, req) => {
  const inProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') || '';
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  const isApi = url.pathname.startsWith('/api');
  const isAsset = url.pathname.startsWith('/_next') || url.pathname === '/favicon.ico' || url.pathname.startsWith('/static');

  if (!inProd || isLocalHost || isApi || isAsset) {
    return NextResponse.next();
  }

  const canonical = (process.env.CANONICAL_URL || 'https://anointarray.com').replace(/\/$/, '');

  try {
    const target = new URL(canonical);
    if (host && host !== target.host) {
      url.protocol = target.protocol;
      url.host = target.host;
      return NextResponse.redirect(url, 308);
    }
  } catch {}

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|.*\\..*|favicon\\.ico).*)',
    '/api/(.*)',
  ],
};
