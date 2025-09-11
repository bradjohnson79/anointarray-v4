import fs from 'fs';
import path from 'path';

function mask(v: string) {
  if (!v) return '';
  return v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)} (len=${v.length})` : '***';
}

const reqKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
];

const dotenvPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(dotenvPath)) {
  console.error('[guard:env] .env.local not found');
  process.exit(1);
}

const kv: Record<string, string> = {};
for (const line of fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    kv[m[1]] = v;
  }
}

let ok = true;
for (const k of reqKeys) {
  const present = !!kv[k];
  console.log(`ENV ${k}: ${present ? mask(kv[k]) : 'missing'}`);
  if (!present) ok = false;
}

if (!ok) {
  console.error('[guard:env] required keys missing.');
  process.exit(2);
}
console.log('[guard:env] ok');

