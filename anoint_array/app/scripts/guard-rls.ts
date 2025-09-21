import 'dotenv/config';
import { spawnSync } from 'node:child_process';

function run(sql: string) {
  const r = spawnSync(process.platform === 'win32' ? 'pnpx' : 'pnpm', ['tsx', 'scripts/supabase-run-sql.ts', sql], { stdio: 'pipe' });
  if (r.status !== 0) {
    process.stdout.write(r.stdout || Buffer.alloc(0));
    process.stderr.write(r.stderr || Buffer.alloc(0));
    process.exit(r.status || 1);
  }
  process.stdout.write(r.stdout || Buffer.alloc(0));
}

// Check policies
const check = "select pol.polname as name, pol.polcmd as cmd from pg_policy pol join pg_class rel on rel.oid=pol.polrelid join pg_namespace nsp on nsp.oid=rel.relnamespace where nsp.nspname='public' and rel.relname='users' order by pol.polname;";
run(check);

