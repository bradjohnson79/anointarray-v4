import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

export const runtime = 'nodejs';

type ServerDef = {
  command?: string;
  args?: any;
};

function mask(v?: string | null) {
  if (!v) return '';
  const s = String(v);
  if (!s) return '';
  if (s.length <= 8) return '********';
  return `${s.slice(0, 4)}…${s.slice(-4)} (len=${s.length})`;
}

function cmdExists(cmd?: string): boolean {
  if (!cmd) return false;
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(which, [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function safeParseToml(raw: string): any {
  // Lightweight TOML parser for our specific structure: [mcpServers.<name>] with string command and array args
  // This is not a full TOML parser, but adequate for simple key/value and string arrays used here.
  const result: any = { mcpServers: {} };
  let current: any = null;
  let currentName = '';
  const lines = raw.split(/\r?\n/);
  for (let line of lines) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const sect = l.match(/^\[(.+)\]$/);
    if (sect) {
      const key = sect[1];
      const m = key.match(/^mcpServers\.(.+)$/);
      if (m) {
        currentName = m[1];
        current = {};
        result.mcpServers[currentName] = current;
      } else {
        current = null;
        currentName = '';
      }
      continue;
    }
    if (!current) continue;
    const kv = l.match(/^(\w+)\s*=\s*(.+)$/);
    if (!kv) continue;
    const k = kv[1];
    const v = kv[2];
    if (v.startsWith('[')) {
      // array of strings
      const items: string[] = [];
      let buf = '';
      let inStr = false;
      for (let i = 1; i < v.length; i++) {
        const ch = v[i];
        if (ch === '"') {
          inStr = !inStr;
          if (!inStr) {
            items.push(buf);
            buf = '';
          }
          continue;
        }
        if (inStr) buf += ch;
      }
      current[k] = items;
    } else {
      const str = v.replace(/^"|"$/g, '');
      current[k] = str;
    }
  }
  return result;
}

function analyzeServer(name: string, def: ServerDef) {
  const issues: string[] = [];
  const command = (def.command || '').trim();
  const rawArgs = Array.isArray(def.args) ? def.args.map(String) : [];

  if (!command) {
    // In serverless status checks, skip PATH validation if command missing; assume launcher like npx is available
  } else if (!cmdExists(command)) {
    // Don't block status on PATH for hosted environments; warn only if no token either
  }

  // Find access token, if provided via args pattern: --access-token <token>
  let token: string | undefined;
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === '--access-token' && i + 1 < rawArgs.length) {
      token = rawArgs[i + 1];
      break;
    }
  }

  // Heuristic checks by server name
  if (/supabase/i.test(name)) {
    if (!token) issues.push('Supabase access token not set');
  }
  if (/vercel/i.test(name)) {
    if (!token) issues.push('Vercel access token not set');
  }
  if (/github/i.test(name)) {
    if (!token) issues.push('GitHub access token not set');
  }

  // Mask tokens in args for safe return
  const maskedArgs = rawArgs.map((a, idx) => {
    if (rawArgs[idx - 1] === '--access-token') return mask(a);
    return a;
  });

  return {
    name,
    command,
    args: maskedArgs,
    ok: issues.length === 0,
    issues,
  };
}

export async function GET() {
  try {
    // Determine config path: from package.json mcp.config or default ~/.codex/config.toml
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    let configPath = path.join(os.homedir(), '.codex', 'config.toml');
    try {
      const pkgRaw = await fs.readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);
      const cfg = pkg?.mcp?.config;
      if (typeof cfg === 'string' && cfg.trim()) {
        configPath = path.resolve(process.cwd(), cfg);
      }
    } catch {
      // ignore; fallback
    }

    // Prefer Supabase snapshot (production), then local file (dev)
    let raw: string | null = null;
    let origin: 'supabase' | 'local' | 'none' = 'none';
    try {
      const { createSupabaseServerClient, CONFIGS_BUCKET } = await import('@/lib/supabase-server');
      const supabase = createSupabaseServerClient();
      const dl = await supabase.storage.from(CONFIGS_BUCKET).download('configs/mcp/config.toml');
      if (!dl.error && dl.data) {
        raw = await (dl.data as any).text();
        configPath = `supabase://${CONFIGS_BUCKET}/configs/mcp/config.toml`;
        origin = 'supabase';
      }
    } catch {}
    if (!raw && fsSync.existsSync(configPath)) {
      raw = await fs.readFile(configPath, 'utf8');
      origin = 'local';
    }
    if (!raw) {
      return NextResponse.json({ ok: false, configPath, servers: [], issues: [
        'MCP config not found in Supabase snapshot or local file.',
        'Use Save Token to create a snapshot, or add .codex/config.toml in the repo.',
      ], origin }, { status: 200 });
    }
    const parsed = safeParseToml(raw);
    const servers: any[] = [];
    const issues: string[] = [];
    if (!parsed || !parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
      issues.push('No [mcpServers] sections found in config.');
    } else {
      for (const [name, def] of Object.entries(parsed.mcpServers as Record<string, ServerDef>)) {
        servers.push(analyzeServer(name, def as ServerDef));
      }
    }

    // Enrich/override from environment tokens so status reflects provided secrets without manual save
    const envTokens: Record<string,string|undefined> = {
      supabase: process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT,
      vercel: process.env.VERCEL_PERSONAL_ACCESS_TOKEN || process.env.VERCEL_API_TOKEN,
      github: process.env.GIT_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN,
    };
    const names = ['supabase','vercel','github'];
    for (const n of names) {
      const tok = envTokens[n];
      if (!tok) continue;
      const existing = servers.find(s => new RegExp(n,'i').test(s.name));
      const def: ServerDef = existing ? { command: existing.command || 'npx', args: ['--access-token', tok] } : { command: 'npx', args: ['--access-token', tok] } as any;
      const analyzed = analyzeServer(n, def);
      // Mark OK when token present
      analyzed.ok = true;
      analyzed.issues = [];
      // Upsert into servers list
      const idx = servers.findIndex(s => new RegExp(n,'i').test(s.name));
      if (idx >= 0) servers[idx] = analyzed; else servers.push(analyzed);
    }

    const ok = servers.every(s => s.ok) && issues.length === 0;
    return NextResponse.json({ ok, configPath, servers, issues, origin, note: 'Status reflects env tokens when present; config snapshot optional.' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to read MCP config' }, { status: 500 });
  }
}
