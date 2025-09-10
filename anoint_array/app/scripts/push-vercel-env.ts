// Usage:
//   VERCEL_API_TOKEN=xxx PROJECT_ID=prj_xxx TARGETS=preview,production pnpm tsx scripts/push-vercel-env.ts
// Optional:
//   ENVFILE=./.env.local (default) | path to env file

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
  const res = await vercel(`/v10/projects/${projectId}/env?decrypt=false`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list envs: ${err}`);
  }
  const body: any = await res.json();
  // body.envs or body
  return (body.envs || body) as Array<{ id: string; key: string; target: Target[] | Target; type: string }>;
}

function intersect(a: Target[] | Target, b: Target[]): boolean {
  const aa = Array.isArray(a) ? a : [a];
  return aa.some(x => b.includes(x));
}

(async () => {
  try {
    const existing = await listEnv();
    for (const { key, value } of entries) {
      if (!value) continue;
      const masked = value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)} (len=${value.length})` : '***';

      // Remove existing entries for these targets to upsert cleanly
      const toDelete = existing.filter(e => e.key === key && intersect(e.target, targets));
      for (const env of toDelete) {
        const del = await vercel(`/v10/projects/${projectId}/env/${env.id}`, { method: 'DELETE' });
        if (!del.ok) {
          const t = await del.text();
          console.error(`⚠️  ${key}: failed to delete existing (${env.id}): ${t}`);
        }
      }

      // Create fresh
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
    console.log('Done. On Vercel, redeploy with "Clear build cache" to apply.');
  } catch (e: any) {
    console.error('Failed to push envs:', e?.message || e);
    process.exit(1);
  }
})();

