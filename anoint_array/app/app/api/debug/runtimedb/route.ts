export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return new Response(
    JSON.stringify({
      usedKeyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service' : 'anon',
      serviceKeyLoaded: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      envs: {
        SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing'
      }
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

