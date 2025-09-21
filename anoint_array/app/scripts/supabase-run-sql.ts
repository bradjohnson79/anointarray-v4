import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import dotenv from 'dotenv';

// Load app/.env.local if present
try {
  const p = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(p)) dotenv.config({ path: p });
} catch {}

function die(msg: string, code = 1) { console.error(msg); process.exit(code); }

// Prefer explicit SUPABASE_PROJECT_REF, else derive from NEXT_PUBLIC_SUPABASE_URL
function deriveProjectRef(): string | null {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!url) return null;
    const u = new URL(url);
    return (u.hostname.split('.')[0] || null);
  } catch { return null; }
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = process.env.SUPABASE_PROJECT_REF || deriveProjectRef() || '';
if (!accessToken) die('Missing SUPABASE_ACCESS_TOKEN (sbp_...)');
if (!projectRef) die('Missing SUPABASE_PROJECT_REF (or NEXT_PUBLIC_SUPABASE_URL to derive it)');

async function runSql(query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    die(`SQL failed [${res.status}]: ${text}`);
  }
  try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
  catch { console.log(text); }
}

(async () => {
  const arg = process.argv.slice(2).join(' ').trim();
  if (!arg) die('Usage: pnpm tsx scripts/supabase-run-sql.ts "<SQL>"');
  await runSql(arg);
})();

