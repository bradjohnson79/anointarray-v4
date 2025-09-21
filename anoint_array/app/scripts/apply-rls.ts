import 'dotenv/config';
import { spawnSync } from 'node:child_process';

function run(sql: string) {
  const r = spawnSync(process.platform === 'win32' ? 'pnpx' : 'pnpm', ['tsx', 'scripts/supabase-run-sql.ts', sql], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

const tables = (process.env.RLS_TABLES || 'users,orders').split(',').map(s=>s.trim()).filter(Boolean);

for (const t of tables) {
  if (t === 'users') {
    run(`grant usage on schema public to authenticated; grant select, insert, update on public.users to authenticated; alter table public.users enable row level security; drop policy if exists "users_select_own" on public.users; drop policy if exists "users_update_own" on public.users; drop policy if exists "users_insert_own" on public.users; create policy "users_select_own" on public.users for select to authenticated using (lower(email)=lower(auth.email())); create policy "users_update_own" on public.users for update to authenticated using (lower(email)=lower(auth.email())) with check (lower(email)=lower(auth.email())); create policy "users_insert_own" on public.users for insert to authenticated with check (lower(email)=lower(auth.email()));`);
  } else if (t === 'orders') {
    run(`grant usage on schema public to authenticated; grant select, insert, update on public.orders to authenticated; alter table public.orders enable row level security; drop policy if exists "orders_select_own" on public.orders; drop policy if exists "orders_update_own" on public.orders; drop policy if exists "orders_insert_own" on public.orders; create policy "orders_select_own" on public.orders for select to authenticated using ((user_id is not null and user_id = auth.uid()) or (customeremail is not null and lower(customeremail)=lower(auth.email())) or ("userId" is not null and "userId" = auth.uid()) or ("customerEmail" is not null and lower("customerEmail")=lower(auth.email()))); create policy "orders_update_own" on public.orders for update to authenticated using ((user_id is not null and user_id = auth.uid()) or (customeremail is not null and lower(customeremail)=lower(auth.email())) or ("userId" is not null and "userId" = auth.uid()) or ("customerEmail" is not null and lower("customerEmail")=lower(auth.email()))) with check ((user_id is not null and user_id = auth.uid()) or (customeremail is not null and lower(customeremail)=lower(auth.email())) or ("userId" is not null and "userId" = auth.uid()) or ("customerEmail" is not null and lower("customerEmail")=lower(auth.email()))); create policy "orders_insert_own" on public.orders for insert to authenticated with check ((user_id is not null and user_id = auth.uid()) or (customeremail is not null and lower(customeremail)=lower(auth.email())) or ("userId" is not null and "userId" = auth.uid()) or ("customerEmail" is not null and lower("customerEmail")=lower(auth.email())));`);
  }
}

console.log('RLS applied for tables:', tables.join(', '));

