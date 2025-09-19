import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Skip canonical redirects in local/dev to keep DX smooth
  const inProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') || '';
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  const isApi = url.pathname.startsWith('/api');
  const isAsset = url.pathname.startsWith('/_next') || url.pathname === '/favicon.ico' || url.pathname.startsWith('/static');

  if (!inProd || isLocalHost || isApi || isAsset) {
    return NextResponse.next();
  }

  // Default to production domain if env is missing in a preview build
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
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
