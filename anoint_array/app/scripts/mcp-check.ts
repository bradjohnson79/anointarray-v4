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
  PAYPAL_ACCESS_TOKEN: process.env.PAYPAL_ACCESS_TOKEN,
  PAYPAL_ENVIRONMENT: process.env.PAYPAL_ENVIRONMENT,
};

const derivedRef = undefined;
const have = {
  vercelToken: !!need.VERCEL_PERSONAL_ACCESS_TOKEN,
  vercelProject: !!need.VERCEL_PROJECT_ID,
  githubToken: !!need.GIT_PERSONAL_ACCESS_TOKEN,
  supabaseToken: false,
  supabaseUrl: false,
  supabaseProjectRef: '',
  paypalToken: !!need.PAYPAL_ACCESS_TOKEN,
  paypalEnv: !!need.PAYPAL_ENVIRONMENT,
};

const report = {
  ok: have.vercelToken && have.vercelProject && have.githubToken,
  vars: {
    VERCEL_PERSONAL_ACCESS_TOKEN: mask(need.VERCEL_PERSONAL_ACCESS_TOKEN),
    VERCEL_PROJECT_ID: need.VERCEL_PROJECT_ID || 'missing',
    GIT_PERSONAL_ACCESS_TOKEN: mask(need.GIT_PERSONAL_ACCESS_TOKEN),
    SUPABASE_ACCESS_TOKEN: 'removed',
    NEXT_PUBLIC_SUPABASE_URL: 'removed',
    SUPABASE_PROJECT_REF: 'removed',
    PAYPAL_ACCESS_TOKEN: mask(need.PAYPAL_ACCESS_TOKEN),
    PAYPAL_ENVIRONMENT: need.PAYPAL_ENVIRONMENT || 'missing',
  },
  next: [] as string[],
};

if (!have.vercelToken) report.next.push('export VERCEL_PERSONAL_ACCESS_TOKEN=vercel_pat_…');
if (!have.vercelProject) report.next.push('export VERCEL_PROJECT_ID=prj_…');
if (!have.githubToken) report.next.push('export GIT_PERSONAL_ACCESS_TOKEN=ghp_…');
// Supabase guidance removed
if (!have.paypalToken) report.next.push('export PAYPAL_ACCESS_TOKEN=A21A…   # short‑lived OAuth Access Token');
if (!have.paypalEnv) report.next.push('export PAYPAL_ENVIRONMENT=SANDBOX  # or LIVE');

// Suggested smoke tests
const ref = '<ref>';
report.next.push(
  'mcp list-tools',
  'mcp vercel env-list --project $VERCEL_PROJECT_ID',
  'mcp github whoami',
  // Supabase examples removed
);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(2);
