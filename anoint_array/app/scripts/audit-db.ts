import { createSupabaseAdminClient } from '@/lib/supabaseClient';

async function main() {
  const s = createSupabaseAdminClient();
  const probe = async (tbl: string) => (await s.from(tbl).select('*', { count: 'exact', head: true })).count ?? null;
  const users = await probe('users');
  const products = await probe('products');
  const orders = await probe('orders');
  console.log('[guard:db] counts:', { users, products, orders });
}
main().catch(e=>{ console.error('[guard:db] error', e?.message||e); process.exit(4); });
