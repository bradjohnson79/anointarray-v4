import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function mask(v?: string | null) {
  if (!v) return 'missing';
  const s = String(v);
  if (s.length <= 8) return '***';
  return `${s.slice(0, 4)}…${s.slice(-4)} (len=${s.length})`;
}

// Load app/.env.local if present (local convenience only)
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });

const need = {
  VERCEL_PERSONAL_ACCESS_TOKEN: process.env.VERCEL_PERSONAL_ACCESS_TOKEN,
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  GIT_PERSONAL_ACCESS_TOKEN: process.env.GIT_PERSONAL_ACCESS_TOKEN,
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
};

function supabaseRefFromUrl(url?: string) {
  try {
    if (!url) return undefined;
    const u = new URL(url);
    // e.g., https://znqtfdfvcrbwsefzmtam.supabase.co → znqtfdfvcrbwsefzmtam
    const host = u.hostname || '';
    const ref = host.split('.')[0];
    return ref || undefined;
  } catch {
    return undefined;
  }
}

const derivedRef = supabaseRefFromUrl(need.NEXT_PUBLIC_SUPABASE_URL);
const have = {
  vercelToken: !!need.VERCEL_PERSONAL_ACCESS_TOKEN,
  vercelProject: !!need.VERCEL_PROJECT_ID,
  githubToken: !!need.GIT_PERSONAL_ACCESS_TOKEN,
  supabaseToken: !!need.SUPABASE_ACCESS_TOKEN,
  supabaseUrl: !!need.NEXT_PUBLIC_SUPABASE_URL,
  supabaseProjectRef: need.SUPABASE_PROJECT_REF || derivedRef || '',
};

const report = {
  ok: have.vercelToken && have.vercelProject && have.githubToken && have.supabaseToken && (have.supabaseProjectRef.length > 0),
  vars: {
    VERCEL_PERSONAL_ACCESS_TOKEN: mask(need.VERCEL_PERSONAL_ACCESS_TOKEN),
    VERCEL_PROJECT_ID: need.VERCEL_PROJECT_ID || 'missing',
    GIT_PERSONAL_ACCESS_TOKEN: mask(need.GIT_PERSONAL_ACCESS_TOKEN),
    SUPABASE_ACCESS_TOKEN: mask(need.SUPABASE_ACCESS_TOKEN),
    NEXT_PUBLIC_SUPABASE_URL: need.NEXT_PUBLIC_SUPABASE_URL || 'missing',
    SUPABASE_PROJECT_REF: (need.SUPABASE_PROJECT_REF || derivedRef || 'missing'),
  },
  next: [] as string[],
};

if (!have.vercelToken) report.next.push('export VERCEL_PERSONAL_ACCESS_TOKEN=vercel_pat_…');
if (!have.vercelProject) report.next.push('export VERCEL_PROJECT_ID=prj_…');
if (!have.githubToken) report.next.push('export GIT_PERSONAL_ACCESS_TOKEN=ghp_…');
if (!have.supabaseToken) report.next.push('export SUPABASE_ACCESS_TOKEN=sbp_…');
if (!have.supabaseUrl) report.next.push('export NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co');
if (!have.supabaseProjectRef) report.next.push('export SUPABASE_PROJECT_REF=<ref>   # e.g., znqtfdfvcrbwsefzmtam');

// Suggested smoke tests
const ref = have.supabaseProjectRef || '<ref>';
report.next.push(
  'mcp list-tools',
  'mcp vercel env-list --project $VERCEL_PROJECT_ID',
  'mcp github whoami',
  'mcp supabase sql "select now();"',
  'mcp supabase sql "select count(*) as c from orders;"'
);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(2);

