export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const ok = !!(process.env.CONVEX_URL && process.env.CONVEX_ADMIN_KEY);
  const body: any = {
    ok,
    url: process.env.CONVEX_URL || null,
    adminKey: process.env.CONVEX_ADMIN_KEY ? 'present' : 'missing',
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

