/*
  QA Engineer agent: sweeps key pages and APIs and reports status.
  Usage:
    BASE_URL=https://anointarray.com pnpm tsx scripts/qa-engineer.ts
    # optional: CREATE_SIGNUP=true will try creating a throwaway user
*/
import crypto from 'crypto';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CREATE_SIGNUP = String(process.env.CREATE_SIGNUP || 'false').toLowerCase() === 'true';

type Check = { name: string; url: string; method?: string; status?: number; ok: boolean; note?: string };

async function tryFetch(url: string, init?: RequestInit): Promise<Check> {
  const name = `${init?.method || 'GET'} ${url}`;
  try {
    const res = await fetch(url, init);
    const ct = res.headers.get('content-type') || '';
    let note = '';
    if (ct.includes('application/json')) {
      try { await res.clone().json(); } catch { note = 'JSON parse failed'; }
    }
    return { name, url, method: init?.method, status: res.status, ok: res.ok, note };
  } catch (e: any) {
    return { name, url, method: init?.method, ok: false, note: e?.message || String(e) };
  }
}

async function main() {
  const checks: Check[] = [];
  const pages = ['/', '/auth/login', '/auth/signup', '/services', '/dashboard'];
  for (const p of pages) checks.push(await tryFetch(`${BASE}${p}`));

  // Static assets
  checks.push(await tryFetch(`${BASE}/favicon.ico`));
  checks.push(await tryFetch(`${BASE}/icon.svg`));

  // File service
  let fileOk = await tryFetch(`${BASE}/api/files/basic-seal-array.png`);
  if (!fileOk.ok) fileOk = await tryFetch(`${BASE}/example-seal-array.png`);
  checks.push(fileOk);

  // APIs
  checks.push(await tryFetch(`${BASE}/api/debug/db`));
  checks.push(await tryFetch(`${BASE}/api/products`));
  checks.push(await tryFetch(`${BASE}/api/payment/status`));

  // Optional signup test (writes one throwaway user)
  if (CREATE_SIGNUP) {
    const email = `qa_${Date.now()}_${crypto.randomUUID().slice(0,6)}@example.com`;
    const res = await tryFetch(`${BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'QaTest123!', fullName: 'QA User' })
    });
    res.name = `POST /api/signup (email=${email})`;
    checks.push(res);
  }

  // Report
  const okCount = checks.filter(c => c.ok).length;
  const total = checks.length;
  console.log(`\nQA Sweep for ${BASE}: ${okCount}/${total} OK`);
  for (const c of checks) {
    const s = c.ok ? 'OK ' : 'ERR';
    const status = c.status ? ` status=${c.status}` : '';
    const note = c.note ? ` note=${c.note}` : '';
    console.log(`- [${s}] ${c.name}${status}${note}`);
  }
  if (okCount !== total) process.exit(1);
}

main().catch(e => { console.error('QA sweep failed:', e?.message || e); process.exit(2); });

