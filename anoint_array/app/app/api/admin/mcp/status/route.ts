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

  if (!command) issues.push('Missing command');
  else if (!cmdExists(command)) issues.push(`Command not found in PATH: ${command}`);

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
    if (!token) issues.push('Supabase access token not set (--access-token sbp_…)');
    else if (!/^sbp_/.test(token) && !/^supaboard_|^supabase_/.test(token) && !/\*{3,}/.test(token)) {
      // Allow masked, or sbp_ prefix typical of PATs; otherwise warn
      // Some users may use other prefixes; warn lightly
      issues.push('Supabase token may be invalid (expected sbp_… or masked)');
    }
  }
  if (/vercel/i.test(name)) {
    if (!token) issues.push('Vercel access token not set (--access-token vercel_pat_…)');
    else if (!/^vercel_pat_/.test(token) && !/\*{3,}/.test(token)) {
      issues.push('Vercel token may be invalid (expected vercel_pat_… or masked)');
    }
  }
  if (/github/i.test(name)) {
    if (!token) issues.push('GitHub access token not set (--access-token ghp_…)');
    else if (!/^ghp_/.test(token) && !/\*{3,}/.test(token)) {
      issues.push('GitHub token may be invalid (expected ghp_… or masked)');
    }
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

    const exists = fsSync.existsSync(configPath);
    if (!exists) {
      return NextResponse.json({ ok: false, configPath, servers: [], issues: [
        `Config not found at ${configPath}`,
        'Ensure .codex/config.toml exists and includes [mcpServers.*] sections.',
      ] }, { status: 200 });
    }

    const raw = await fs.readFile(configPath, 'utf8');
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

    const ok = servers.every(s => s.ok) && issues.length === 0;
    return NextResponse.json({ ok, configPath, servers, issues });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to read MCP config' }, { status: 500 });
  }
}

