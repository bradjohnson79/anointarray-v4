import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { createSupabaseServerClient, CONFIGS_BUCKET } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function stringifyArgs(args: string[]): string {
  const quoted = args.map((a) => '"' + a.replace(/"/g, '\\"') + '"');
  return `args = [${quoted.join(',')}]`;
}

function parseQuotedArray(content: string): string[] {
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

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const token = String(body?.token || '').trim();
    if (!name || !token) return NextResponse.json({ error: 'Missing name or token' }, { status: 400 });

    // Resolve config path from package.json mcp.config or fallback to ~/.codex/config.toml
    let configPath = path.join(os.homedir(), '.codex', 'config.toml');
    try {
      const pkgRaw = await fs.readFile(path.resolve(process.cwd(), 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgRaw);
      const cfg = pkg?.mcp?.config;
      if (typeof cfg === 'string' && cfg.trim()) configPath = path.resolve(process.cwd(), cfg);
    } catch {}

    const updateToml = (raw: string) => {
      const sectRe = new RegExp(String.raw`(^\[mcpServers\.${name}\][\s\S]*?)(?=^\[|\Z)`, 'm');
      const sectMatch = raw.match(sectRe);
      let section = sectMatch ? sectMatch[1] : `\n[mcpServers.${name}]\n`;
      const argsRe = /^args\s*=\s*\[([^\]]*)\]/m;
      const argsMatch = section.match(argsRe);
      let args: string[] = [];
      let newArgsLine = '';
      if (argsMatch) {
        args = parseQuotedArray(argsMatch[1]);
        let idx = args.findIndex((a) => a === '--access-token');
        if (idx !== -1) {
          if (idx + 1 < args.length) args[idx + 1] = token; else args.push(token);
        } else {
          args.push('--access-token', token);
        }
        newArgsLine = stringifyArgs(args);
      } else {
        args = ['--access-token', token];
        newArgsLine = stringifyArgs(args);
      }
      let newSection: string;
      if (argsMatch) newSection = section.replace(argsRe, newArgsLine);
      else newSection = section.trimEnd() + `\n` + newArgsLine + `\n`;
      if (sectMatch) return raw.replace(sectRe, newSection);
      return (raw.trimEnd() + `\n` + newSection + `\n`).replace(/^\s+$/,'');
    };

    // Try to write local (dev); fallback to Supabase snapshot on failure (e.g., Vercel read-only)
    if (fsSync.existsSync(configPath)) {
      try {
        const raw = await fs.readFile(configPath, 'utf8');
        const updated = updateToml(raw);
        await fs.writeFile(configPath, updated, 'utf8');
        return NextResponse.json({ ok: true, configPath, name, mode: 'local' });
      } catch (e: any) {
        // fall through to Supabase snapshot
      }
    }

    // Fall back to Supabase storage snapshot (production)
    const supabase = createSupabaseServerClient();
    const objectPath = 'configs/mcp/config.toml';
    let existing = '';
    try {
      const dl = await supabase.storage.from(CONFIGS_BUCKET).download(objectPath);
      if (!dl.error && dl.data) existing = await (dl.data as any).text();
    } catch {}
    const base = existing || `# MCP config snapshot\n[mcpServers.${name}]\ncommand = \"pnpm\"\n`;
    const updated = updateToml(base);
    const blob = new Blob([updated], { type: 'text/plain' });
    const up = await supabase.storage.from(CONFIGS_BUCKET).upload(objectPath, blob, { upsert: true, contentType: 'text/plain' });
    if (up.error) return NextResponse.json({ error: up.error.message || 'Failed to save config snapshot' }, { status: 500 });
    return NextResponse.json({ ok: true, configPath: `supabase://${CONFIGS_BUCKET}/${objectPath}`, name, mode: 'supabase' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update token' }, { status: 500 });
  }
}
