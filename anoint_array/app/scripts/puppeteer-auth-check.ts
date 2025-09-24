import puppeteer from 'puppeteer';

// Lightweight auth smoke test for production using headless browser.
// Usage:
//   pnpm -C app tsx scripts/puppeteer-auth-check.ts
// Env:
//   NEXT_PUBLIC_APP_URL=https://anointarray.com (or https://www.anointarray.com)
//   TEST_EMAIL=info@anoint.me
//   TEST_PASSWORD=Admin123
//   DO_CREATE_TEST_USER=0|1 (optional)

async function sleep(ms: number) { return new Promise(r=>setTimeout(r, ms)); }

async function main() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://anointarray.com').replace(/\/$/, '');
  const email = process.env.TEST_EMAIL || 'info@anoint.me';
  const password = process.env.TEST_PASSWORD || 'Admin123';
  const doCreate = process.env.DO_CREATE_TEST_USER === '1';

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  let page = await browser.newPage();
  page.setDefaultTimeout(60000);
  const report: any = { base, steps: [] };
  try {
    // Optionally create a new user (safe only if non-admin email)
    if (doCreate && email !== 'info@anoint.me') {
      const signupUrl = `${base}/auth/signup`;
      await page.goto(signupUrl, { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[name="fullName"], #fullName', { timeout: 15000 });
      await page.type('input[name="fullName"]', 'Test User');
      await page.type('input[name="email"]', email);
      await page.type('input[name="password"]', password);
      await page.type('input[name="confirmPassword"]', password);
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      report.steps.push({ step: 'signup', ok: true });
      await page.close();
      page = await browser.newPage();
      page.setDefaultTimeout(60000);
      await sleep(500);
    }

    // Login
    const loginUrl = `${base}/auth/login`;
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="email"], #email, [data-test="login-email"]', { timeout: 15000 });
    await page.waitForSelector('input[name="password"], #password, [data-test="login-password"]', { timeout: 15000 });
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);
    const respPromise = page.waitForResponse((resp) => resp.url().includes('/api/auth/callback/credentials'));
    await page.click('button[type="submit"]');
    const resp = await respPromise;
    const status = resp.status();
    const body = await resp.json().catch(()=>({}));
    report.steps.push({ step: 'login', status, body });

    // Cookie check
    const cookies = await page.cookies();
    const sessionCookie = cookies.find((c: any) => typeof c.name === 'string' && c.name.includes('next-auth.session-token'));
    report.steps.push({ step: 'cookies', sessionDomain: sessionCookie?.domain || null, present: !!sessionCookie });

    // /api/me/profile
    const accountResp = await page.evaluate(async () => {
      const r = await fetch('/api/me/profile?diag=1', { cache: 'no-store' });
      let j: any = null; try { j = await r.json(); } catch {}
      return { status: r.status, body: j };
    });
    report.steps.push({ step: 'me.profile', ...accountResp });

    // Admin health (may 401 for non-admin)
    const healthResp = await page.evaluate(async () => {
      const r = await fetch('/api/admin/db/health', { cache: 'no-store' });
      let j: any = null; try { j = await r.json(); } catch {}
      return { status: r.status, body: j };
    });
    report.steps.push({ step: 'admin.db.health', ...healthResp });

    // Outcome
    const ok = (status === 200) && accountResp.status === 200 && !!sessionCookie;
    report.ok = ok;
    console.log(JSON.stringify(report, null, 2));
    if (!ok) process.exit(2);
  } catch (e: any) {
    report.error = e?.message || String(e);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
