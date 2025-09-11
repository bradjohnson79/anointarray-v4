import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import dotenv from 'dotenv';

// Load .env.local without printing
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const direct = process.env.DIRECT_URL || '';
const pooled = process.env.DATABASE_URL || '';
const url = direct || pooled;
if (!url) {
  console.error('[db-push] No DIRECT_URL or DATABASE_URL in env');
  process.exit(2);
}

console.log('[db-push] Running prisma db push (non-destructive)…');
const res = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
  stdio: 'pipe',
  env: { ...process.env, DIRECT_URL: direct, DATABASE_URL: pooled },
  cwd: process.cwd(),
});

if (res.status !== 0) {
  const out = (res.stdout?.toString() || '') + (res.stderr?.toString() || '');
  console.error('[db-push] Failed:', out.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@'));
  process.exit(res.status || 1);
}

console.log('[db-push] Success');

