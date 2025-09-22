import path from 'path';
import { runConvex } from '../lib/convexCli';

async function main() {
  const puppeteer = await import('puppeteer');
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.anointarray.com';
  const list: any = await runConvex<any>('products:list', {});
  const items = Array.isArray(list) ? list : (Array.isArray((list as any)?.result) ? (list as any).result : []);
  const sample = items.slice(0, 3);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const results: any[] = [];
  try {
    const page = await browser.newPage();
    for (const p of sample) {
      const slug = String(p.slug);
      const url = base.replace(/\/$/, '') + '/products/' + encodeURIComponent(slug);
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = resp ? resp.status() : null;
      const html = await page.content();
      const ok = status === 200 && (html.includes(p.name) || html.includes(slug));
      results.push({ slug, url, status, ok });
    }
  } finally {
    await browser.close();
  }
  const allOk = results.every(r => r.ok);
  console.log(JSON.stringify({ ok: allOk, results }, null, 2));
  if (!allOk) process.exit(2);
}

main().catch((e)=>{ console.error(e?.message || e); process.exit(1); });

