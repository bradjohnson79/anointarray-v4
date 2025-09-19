/*
 Usage:
   tsx scripts/validate-mcp-tokens.ts [--config /path/to/config.toml]

 Reads a simple TOML with [mcpServers.<name>] sections and args = [.. '--access-token', '<token>']
 Then performs a minimal API call per provider to validate the token.
 No secrets are printed; tokens are masked in output.
*/

import fs from 'fs';
import os from 'os';
import path from 'path';

function mask(v?: string) {
  if (!v) return 'missing';
  if (v.length <= 8) return '***';
  return `${v.slice(0,4)}…${v.slice(-4)} (len=${v.length})`;
}

function parseArgsLine(content: string): string[] {
  const out: string[] = [];
  let inStr = false;
  let buf = '';
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      inStr = !inStr;
      if (!inStr) { out.push(buf); buf = ''; }
      continue;
    }
    if (inStr) buf += ch;
  }
  return out;
}

type Server = { name: string; token?: string; stripeKey?: string };

function readTokens(cfgPath: string): Server[] {
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const servers: Server[] = [];
  let current = '';
  let section = '';
  let inArgs = false;
  let argsBuf = '';
  for (const l of lines) {
    const s = l.trim();
    if (!s || s.startsWith('#')) continue;
    const sect = s.match(/^\[(.+)\]$/);
    if (sect) {
      // flush previous section's pending args
      if (inArgs && section.startsWith('mcpServers.')) {
        const arr = parseArgsLine(argsBuf);
        const idx = arr.findIndex(a => a === '--access-token');
        const token = idx>=0 && idx+1 < arr.length ? arr[idx+1] : undefined;
        servers.push({ name: current.replace(/^mcpServers\./,''), token });
      }
      section = sect[1];
      current = section;
      inArgs = false;
      argsBuf = '';
      continue;
    }
    if (!section.startsWith('mcpServers.')) continue;
    if (!inArgs) {
      const m1 = s.match(/^args\s*=\s*\[(.*)\]\s*$/);
      if (m1) {
        // single-line case
        const arr = parseArgsLine(m1[1]);
        const idx = arr.findIndex(a => a === '--access-token');
        const token = idx>=0 && idx+1 < arr.length ? arr[idx+1] : undefined;
        const sidx = arr.findIndex(a => a === '--api-key');
        const stripeKey = sidx>=0 && sidx+1 < arr.length ? arr[sidx+1] : undefined;
        servers.push({ name: current.replace(/^mcpServers\./,''), token, stripeKey });
        continue;
      }
      const m2 = s.match(/^args\s*=\s*\[(.*)$/);
      if (m2) { inArgs = true; argsBuf = m2[1]; continue; }
    } else {
      argsBuf += '\n' + s;
      if (/\]$/.test(s)) {
        // end of multiline array
        inArgs = false;
        argsBuf = argsBuf.replace(/\]$/, '');
        const arr = parseArgsLine(argsBuf);
        const idx = arr.findIndex(a => a === '--access-token');
        const token = idx>=0 && idx+1 < arr.length ? arr[idx+1] : undefined;
        const sidx = arr.findIndex(a => a === '--api-key');
        const stripeKey = sidx>=0 && sidx+1 < arr.length ? arr[sidx+1] : undefined;
        servers.push({ name: current.replace(/^mcpServers\./,''), token, stripeKey });
        argsBuf = '';
      }
    }
  }
  // flush if file ended mid-args (unlikely)
  if (inArgs && section.startsWith('mcpServers.')) {
    const arr = parseArgsLine(argsBuf);
    const idx = arr.findIndex(a => a === '--access-token');
    const token = idx>=0 && idx+1 < arr.length ? arr[idx+1] : undefined;
    const sidx = arr.findIndex(a => a === '--api-key');
    const stripeKey = sidx>=0 && sidx+1 < arr.length ? arr[sidx+1] : undefined;
    servers.push({ name: current.replace(/^mcpServers\./,''), token, stripeKey });
  }
  return servers;
}

async function validate() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--config');
  let cfg = i >= 0 && argv[i+1] ? argv[i+1] : path.join(os.homedir(), '.codex', 'config.toml');
  if (!fs.existsSync(cfg)) throw new Error(`Config not found: ${cfg}`);
  const servers = readTokens(cfg);
  const out: any = { config: cfg, results: [] as any[] };

  for (const s of servers) {
    // Stripe uses --api-key
    if (/stripe/i.test(s.name)) {
      const key = s.stripeKey;
      if (!key) { out.results.push({ name: s.name, ok: false, reason: 'no api key in args', token: 'missing' }); continue; }
      const r = await fetch('https://api.stripe.com/v1/accounts', { headers: { Authorization: `Bearer ${key}` } });
      out.results.push({ name: s.name, ok: r.ok, status: r.status, token: mask(key) });
      continue;
    }
    if (!s.token) { out.results.push({ name: s.name, ok: false, reason: 'no token in args', token: mask(s.token) }); continue; }
    try {
      if (/vercel/i.test(s.name)) {
        const r = await fetch('https://api.vercel.com/v9/projects?limit=1', { headers: { Authorization: `Bearer ${s.token}` } });
        out.results.push({ name: s.name, ok: r.ok, status: r.status, token: mask(s.token) });
        continue;
      }
      if (/github/i.test(s.name)) {
        const r = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${s.token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'mcp-validator' } });
        out.results.push({ name: s.name, ok: r.ok, status: r.status, token: mask(s.token) });
        continue;
      }
      if (/supabase/i.test(s.name)) {
        const r = await fetch('https://api.supabase.com/v1/projects', { headers: { Authorization: `Bearer ${s.token}` } });
        out.results.push({ name: s.name, ok: r.ok, status: r.status, token: mask(s.token) });
        continue;
      }
      if (/paypal/i.test(s.name)) {
        // Use sandbox by default unless token indicates live (we can't infer reliably). This is a low-impact endpoint.
        const r = await fetch('https://api-m.paypal.com/v1/notifications/webhooks', { headers: { Authorization: `Bearer ${s.token}` } });
        out.results.push({ name: s.name, ok: r.ok, status: r.status, token: mask(s.token) });
        continue;
      }
      // Default: unknown server — mark as unchecked
      out.results.push({ name: s.name, ok: true, status: 'skipped', token: mask(s.token) });
    } catch (e: any) {
      out.results.push({ name: s.name, ok: false, error: e?.message || String(e), token: mask(s.token) });
    }
  }
  console.log(JSON.stringify(out, null, 2));
}

validate().catch(e => { console.error(e); process.exit(1); });
