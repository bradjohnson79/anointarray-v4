// Usage:
//   VERCEL_API_TOKEN=xxx PROJECT_ID=prj_xxx TARGETS=preview,production pnpm tsx scripts/push-vercel-env.ts
// Optional:
//   ENVFILE=./.env.local (default) | path to env file
//   PULL=1                      # Pull Vercel envs into .env.vercel
//   DRY_RUN=1                   # Don’t perform writes, only print actions
//   ALLOWLIST=KEY1,KEY2        # Only push these keys
//   SKIPLIST=KEY3,KEY4         # Skip these keys
//   MAP_SUPABASE=1             # Derive DATABASE_URL/DIRECT_URL from Supabase vars if missing

import fs from 'fs';
import path from 'path';

type Target = 'development' | 'preview' | 'production';

const token = process.env.VERCEL_API_TOKEN || '';
const projectId = process.env.PROJECT_ID || '';
const targets = (process.env.TARGETS || 'preview,production')
  .split(',')
  .map(t => t.trim())
  .filter(Boolean) as Target[];

if (!token || !projectId) {
  console.error('Missing VERCEL_API_TOKEN or PROJECT_ID');
  process.exit(1);
}

const dotenvPath = path.resolve(process.cwd(), process.env.ENVFILE || '.env.local');
if (!fs.existsSync(dotenvPath)) {
  console.error(`Env file not found: ${dotenvPath}`);
  process.exit(1);
}

const rawLines = fs
  .readFileSync(dotenvPath, 'utf8')
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'));

const entries = rawLines
  .map(line => {
    // Allow optional leading `export `
    const cleaned = line.startsWith('export ') ? line.slice('export '.length) : line;
    const m = cleaned.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) return null;
    const key = m[1].trim();
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return { key, value };
  })
  .filter(Boolean) as { key: string; value: string }[];

async function vercel(pathname: string, init?: RequestInit): Promise<Response> {
  const url = `https://api.vercel.com${pathname}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  return fetch(url, { ...init, headers: { ...headers, ...(init?.headers as any) } });
}

async function listEnv() {
  const decrypt = process.env.PULL ? 'true' : 'false';
  const res = await vercel(`/v10/projects/${projectId}/env?decrypt=${decrypt}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list envs: ${err}`);
  }
  const body: any = await res.json();
  // body.envs or body
  return (body.envs || body) as Array<{ id: string; key: string; target: Target[] | Target; type: string; value?: string }>;
}

function intersect(a: Target[] | Target, b: Target[]): boolean {
  const aa = Array.isArray(a) ? a : [a];
  return aa.some(x => b.includes(x));
}

function normalizeDbUrl(url: string): string {
  if (!url) return url;
  const hasSsl = /[?&]sslmode=/.test(url);
  if (!hasSsl) url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  return url;
}

function enhanceWithSupabaseMapping(input: { key: string; value: string }[]): { key: string; value: string }[] {
  if (!process.env.MAP_SUPABASE) return input;
  const map = new Map(input.map(e => [e.key, e.value] as const));
  const out = [...input];
  const pooled = map.get('SUPABASE_POOLED_URL') || map.get('SUPABASE_DB_POOLER_URL') || map.get('SUPABASE_PRISMA_URL') || '';
  const direct = map.get('SUPABASE_DIRECT_URL') || map.get('SUPABASE_DB_URL') || map.get('SUPABASE_NON_POOLING_URL') || '';
  if (!map.get('DATABASE_URL') && pooled) {
    out.push({ key: 'DATABASE_URL', value: normalizeDbUrl(pooled.includes('pgbouncer') ? pooled : (pooled + (pooled.includes('?') ? '&' : '?') + 'pgbouncer=true&connection_limit=1')) });
  }
  if (!map.get('DIRECT_URL') && direct) {
    out.push({ key: 'DIRECT_URL', value: normalizeDbUrl(direct) });
  }
  return out;
}

function filterByAllowSkip(items: { key: string; value: string }[]) {
  const allow = (process.env.ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);
  const skip = (process.env.SKIPLIST || '').split(',').map(s => s.trim()).filter(Boolean);
  return items.filter(e => (allow.length ? allow.includes(e.key) : true) && !skip.includes(e.key));
}

(async () => {
  try {
    const existing = await listEnv();

    // Pull mode: write .env.vercel snapshot and exit
    if (process.env.PULL) {
      const snapshotPath = path.resolve(process.cwd(), '.env.vercel');
      // Optional pull-only filters
      const pullAllow = (process.env.PULL_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);
      const pullSkip = (process.env.PULL_SKIPLIST || '').split(',').map(s => s.trim()).filter(Boolean);
      const filtered = existing.filter(e => (pullAllow.length ? pullAllow.includes(e.key) : true) && !pullSkip.includes(e.key));
      const rows = filtered
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(e => `${e.key}=${JSON.stringify(e.value ?? '')}`);
      fs.writeFileSync(snapshotPath, rows.join('\n') + '\n', 'utf8');
      console.log(`Wrote ${rows.length} vars to ${snapshotPath}`);
      return;
    }

    let toPush = enhanceWithSupabaseMapping(entries);
    toPush = filterByAllowSkip(toPush);

    for (const { key, value } of toPush) {
      if (!value) continue;
      const masked = value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)} (len=${value.length})` : '***';

      // Remove existing entries for these targets to upsert cleanly
      const toDelete = existing.filter(e => e.key === key && intersect(e.target, targets));
      for (const env of toDelete) {
        if (process.env.DRY_RUN) { console.log(`DRY delete ${key} (${env.id})`); continue; }
        const del = await vercel(`/v10/projects/${projectId}/env/${env.id}`, { method: 'DELETE' });
        if (!del.ok) {
          const t = await del.text();
          console.error(`⚠️  ${key}: failed to delete existing (${env.id}): ${t}`);
        }
      }

      // Create fresh
      if (process.env.DRY_RUN) { console.log(`DRY create ${key}: ${masked}`); }
      else {
        const res = await vercel(`/v10/projects/${projectId}/env`, {
          method: 'POST',
          body: JSON.stringify({ key, value, target: targets, type: 'encrypted' }),
        });
        if (!res.ok) {
          const err = await res.text();
          console.error(`❌ ${key}: ${err}`);
        } else {
          console.log(`✅ ${key}: ${masked}`);
        }
      }
    }
    // Confirm by listing current envs (names only)
    const after = await listEnv();
    const pushedKeys = new Set(toPush.map(e => e.key));
    const present = after.filter(e => pushedKeys.has(e.key) && intersect(e.target, targets));
    console.log(`Confirmed ${present.length}/${toPush.length} keys present on Vercel for targets [${targets.join(', ')}].`);
    console.log('Done. On Vercel, redeploy with "Clear build cache" to apply.');
  } catch (e: any) {
    console.error('Failed to push envs:', e?.message || e);
    process.exit(1);
  }
})();
