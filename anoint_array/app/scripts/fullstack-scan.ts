/*
  Full‑Stack Developer Agent — Site integrity + connectivity scan
  Usage:
    BASE_URL=https://anointarray.com pnpm tsx scripts/fullstack-scan.ts
    Options:
      TIMEOUT=15000  CREATE_SIGNUP=true
*/
import crypto from 'crypto';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = Number(process.env.TIMEOUT || 15000);
const CREATE_SIGNUP = String(process.env.CREATE_SIGNUP || 'false').toLowerCase() === 'true';

type Result = { name: string; url: string; method: string; status?: number; ok: boolean; note?: string };

function deadline<T>(p: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${tag} timed out after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function hit(url: string, init?: RequestInit): Promise<Result> {
  const method = init?.method || 'GET';
  try {
    const res = await deadline(fetch(url, init), TIMEOUT, `${method} ${url}`);
    const ct = res.headers.get('content-type') || '';
    let note = '';
    if (ct.includes('application/json')) {
      try { await res.clone().json(); } catch { note = 'json-parse-failed'; }
    }
    return { name: `${method} ${new URL(url).pathname}`, url, method, status: res.status, ok: res.ok, note };
  } catch (e: any) {
    return { name: `${method} ${new URL(url).pathname}`, url, method, ok: false, note: e?.message || String(e) };
  }
}

async function main() {
  const out: Result[] = [];
  const pages = ['/', '/auth/login', '/auth/signup', '/services'];
  for (const p of pages) out.push(await hit(`${BASE}${p}`));

  // Assets & favicon
  out.push(await hit(`${BASE}/favicon.ico`));
  out.push(await hit(`${BASE}/icon.svg`));

  // Files service and fallback
  let fileRes = await hit(`${BASE}/api/files/basic-seal-array.png`);
  if (!fileRes.ok) fileRes = await hit(`${BASE}/example-seal-array.png`);
  out.push(fileRes);

  // Core APIs
  out.push(await hit(`${BASE}/api/debug/db`));
  out.push(await hit(`${BASE}/api/products`));
  out.push(await hit(`${BASE}/api/payment/status`));

  // Support chat smoke (should return 200 even if key absent)
  out.push(await hit(`${BASE}/api/support/chat`, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ message: 'hello from fullstack agent' })
  }));

  // Optional: create throwaway user to test signup
  if (CREATE_SIGNUP) {
    const email = `fs_${Date.now()}_${crypto.randomUUID().slice(0,6)}@example.com`;
    const r = await hit(`${BASE}/api/signup`, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email, password: 'FsAgent123!', fullName: 'FS Agent' })
    });
    r.name = `POST /api/signup email=${email}`;
    out.push(r);
  }

  // Summary & guidance
  const total = out.length;
  const oks = out.filter(r => r.ok).length;
  console.log(`\nFull‑Stack Scan (${BASE}) — ${oks}/${total} OK`);
  for (const r of out) {
    const s = r.ok ? 'OK ' : 'ERR';
    const status = r.status ? ` status=${r.status}` : '';
    const note = r.note ? ` note=${r.note}` : '';
    console.log(`- [${s}] ${r.name}${status}${note}`);
  }

  // Remediation hints when failures detected
  const fail = out.filter(r => !r.ok || (r.status && r.status >= 500));
  if (fail.length) {
    console.log('\nRemediation suggestions:');
    for (const f of fail) {
      if (f.url.endsWith('/api/debug/db')) {
        console.log('- DB probe failed: verify DATABASE_URL/DIRECT_URL on Vercel (pooled for runtime, sslmode=require).');
      } else if (f.url.endsWith('/api/signup')) {
        console.log('- Signup failed: check Prisma schema on prod DB, unique email conflicts, and Vercel function logs for correlation id.');
      } else if (f.url.includes('/api/files/')) {
        console.log('- Files service failed: ensure asset exists in uploads or public, or switch to Supabase Storage.');
      } else if (f.url.endsWith('/favicon.ico')) {
        console.log('- Favicon 404: App Router will use app/icon.svg; redeploy or hard refresh.');
      } else if (f.url.includes('/api/support/chat')) {
        console.log('- Support chat failed: verify OPENAI_API_KEY; route should still return 200 when key absent.');
      }
    }
    process.exit(1);
  }
}

main().catch(e => { console.error('fullstack-scan failed:', e?.message || e); process.exit(2); });

