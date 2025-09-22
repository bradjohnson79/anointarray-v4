import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

async function ensureDir(p: string) {
  await fsp.mkdir(p, { recursive: true });
}

function stripHtml(html: string): string {
  // Remove script/style
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Replace breaks/headings with newlines for readability
  html = html.replace(/<(h\d|p|br|li|ul|ol|section|article)[^>]*>/gi, '\n$&');
  // Remove all tags
  html = html.replace(/<[^>]+>/g, '');
  // Decode basic entities
  html = html.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  // Collapse whitespace
  html = html.replace(/\u00A0/g, ' ').replace(/[ \t\x0B\f\r]+/g, ' ');
  html = html.replace(/\n\s*\n\s*/g, '\n\n');
  return html.trim();
}

function urlToPath(baseDir: string, url: string) {
  const u = new URL(url);
  let p = u.pathname;
  if (p.endsWith('/')) p += 'index';
  if (!p.endsWith('.html')) p += '.html';
  const fp = path.join(baseDir, 'html', p);
  const tp = path.join(baseDir, 'txt', p.replace(/\.html$/, '.txt'));
  return { htmlPath: fp, txtPath: tp };
}

async function main() {
  const MAX = Number(process.env.MAX_DOC_PAGES || '200');
  const baseUrl = process.env.CONVEX_DOCS_SITEMAP || 'https://docs.convex.dev/sitemap.xml';
  const baseDir = path.join(process.cwd(), 'data', 'vendor', 'convex-docs');
  await ensureDir(path.join(baseDir, 'html'));
  await ensureDir(path.join(baseDir, 'txt'));

  const res = await fetch(baseUrl);
  if (!res.ok) throw new Error(`Failed to fetch sitemap: ${res.status}`);
  const xml = await res.text();
  const urls: string[] = [];
  // Pull <loc> entries
  const re = /<loc>(.*?)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const loc = m[1].trim();
    if (/^https:\/\/docs\.convex\.dev\//.test(loc)) urls.push(loc);
  }
  // De-dup and constrain
  const list = Array.from(new Set(urls)).slice(0, MAX);

  const manifest: any[] = [];
  let ok = 0, fail = 0;
  for (const url of list) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error(String(r.status));
      const html = await r.text();
      const { htmlPath, txtPath } = urlToPath(baseDir, url);
      await ensureDir(path.dirname(htmlPath));
      await ensureDir(path.dirname(txtPath));
      await fsp.writeFile(htmlPath, html, 'utf8');
      const txt = stripHtml(html);
      await fsp.writeFile(txtPath, txt, 'utf8');
      manifest.push({ url, htmlPath, txtPath, bytes: html.length });
      ok++;
    } catch (e: any) {
      manifest.push({ url, error: e?.message || String(e) });
      fail++;
    }
  }

  const out = { ok, fail, total: list.length, baseDir, generatedAt: new Date().toISOString(), items: manifest };
  await fsp.writeFile(path.join(baseDir, 'manifest.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ ok, fail, savedDir: baseDir }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

