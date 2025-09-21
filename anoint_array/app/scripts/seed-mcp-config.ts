import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
try {
  const p = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(p)) dotenv.config({ path: p });
} catch {}
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !key) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';
const objectPath = 'configs/mcp/config.toml';

const supaPat = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || '';
const vercelPat = process.env.VERCEL_PERSONAL_ACCESS_TOKEN || process.env.VERCEL_API_TOKEN || '';
const githubPat = process.env.GIT_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN || '';

function sect(name: string, token: string, pkg: string) {
  const tok = token ? token : '***';
  return `
[mcpServers.${name}]
command = "npx"
args = ["${pkg}", "--access-token", "${tok}"]
`;
}

const content = `# Generated MCP config snapshot\n` +
  sect('supabase', supaPat, '@supabase/mcp-server-supabase@latest') +
  sect('vercel', vercelPat, '@vercel/mcp-server-vercel@latest') +
  sect('github', githubPat, '@github/mcp-server-github@latest');

(async () => {
  const blob = new Blob([content], { type: 'text/plain' });
  const up = await supabase.storage.from(bucket).upload(objectPath, blob, { upsert: true, contentType: 'text/plain' });
  if (up.error) { console.error('Upload failed:', up.error.message); process.exit(1); }
  console.log('Wrote MCP config snapshot to', `${bucket}/${objectPath}`);
})();
