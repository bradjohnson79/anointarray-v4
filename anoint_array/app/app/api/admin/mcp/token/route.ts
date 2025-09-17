import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';

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
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

    if (!fsSync.existsSync(configPath)) {
      return NextResponse.json({ error: `Config not found at ${configPath}` }, { status: 404 });
    }

    const raw = await fs.readFile(configPath, 'utf8');
    const sectRe = new RegExp(String.raw`(^\[mcpServers\.${name}\][\s\S]*?)(?=^\[|\Z)`, 'm');
    const sectMatch = raw.match(sectRe);
    if (!sectMatch) {
      return NextResponse.json({ error: `Server section mcpServers.${name} not found` }, { status: 404 });
    }
    const section = sectMatch[1];

    // Find args array in section
    const argsRe = /^args\s*=\s*\[([^\]]*)\]/m;
    const argsMatch = section.match(argsRe);
    let args: string[] = [];
    let newArgsLine = '';
    if (argsMatch) {
      args = parseQuotedArray(argsMatch[1]);
      // Update token after --access-token or append pair
      let idx = args.findIndex((a) => a === '--access-token');
      if (idx !== -1) {
        if (idx + 1 < args.length) args[idx + 1] = token; else args.push(token);
      } else {
        args.push('--access-token', token);
      }
      newArgsLine = stringifyArgs(args);
    } else {
      // Insert new args line with just the token; preserves existing lines
      args = ['--access-token', token];
      newArgsLine = stringifyArgs(args);
    }

    // Replace in section
    let newSection: string;
    if (argsMatch) newSection = section.replace(argsRe, newArgsLine);
    else newSection = section.trimEnd() + `\n` + newArgsLine + `\n`;

    const updated = raw.replace(sectRe, newSection);
    await fs.writeFile(configPath, updated, 'utf8');
    return NextResponse.json({ ok: true, configPath, name });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update token' }, { status: 500 });
  }
}

