import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const sql = `
-- Enable RLS
alter table if exists public.users enable row level security;

-- Drop old policies if they exist (id/email variants)
drop policy if exists "Allow update for self" on public.users;
drop policy if exists "Allow update for self by id" on public.users;
drop policy if exists "Allow update for self by email" on public.users;
drop policy if exists "Allow select for self by email" on public.users;
drop policy if exists "Allow insert for self by email" on public.users;

-- Allow SELECT for the logged-in user (by email)
create policy "Allow select for self by email"
on public.users for select to authenticated
using (lower(email) = lower(auth.email()));

-- Allow UPDATE for the logged-in user (by email)
create policy "Allow update for self by email"
on public.users for update to authenticated
using (lower(email) = lower(auth.email()));

-- Allow INSERT of own profile (email must match token)
create policy "Allow insert for self by email"
on public.users for insert to authenticated
with check (lower(email) = lower(auth.email()));
`;

const proc = spawnSync(process.platform === 'win32' ? 'pnpx' : 'pnpm', ['tsx', 'scripts/supabase-run-sql.ts', sql], { stdio: 'inherit' });
process.exit(proc.status || 0);

