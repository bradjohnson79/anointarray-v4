import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local
try {
  const p = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(p)) dotenv.config({ path: p });
} catch {}

async function main() {
  const sql = `
  alter table if exists public.users
    add column if not exists phone text,
    add column if not exists address text,
    add column if not exists address2 text,
    add column if not exists city text,
    add column if not exists state text,
    add column if not exists zip text,
    add column if not exists country text;
  `;
  const { spawn } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    const p = spawn(process.execPath, ['-e', `import('./supabase-run-sql.ts').then(()=>{});`], {
      cwd: path.resolve(process.cwd(), 'scripts')
    });
    p.on('error', reject);
    // above approach is clumsy in ESM; instead just exec tsx directly below
    resolve();
  });
}

// Simple: reuse the helper by spawning tsx
import { spawnSync } from 'node:child_process';
const query = `alter table if exists public.users
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists address2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text,
  add column if not exists country text;`;
const proc = spawnSync(process.platform === 'win32' ? 'pnpx' : 'pnpm', ['tsx', 'scripts/supabase-run-sql.ts', query], { stdio: 'inherit' });
process.exit(proc.status || 0);

