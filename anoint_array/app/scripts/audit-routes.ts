import { globSync } from 'glob';
import fs from 'fs';

const critical = [/\/app\/app\/auth\//, /\/app\/app\/admin\//, /\/app\/app\/dashboard\//];
let fail = false;

const files = globSync('app/**/route.ts', { cwd: 'anoint_array/app', absolute: true });
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const isCritical = critical.some(r => r.test(f));
  if (isCritical) {
    const hasDynamic = /export\s+const\s+dynamic\s*=\s*'force-dynamic'/.test(s);
    const hasRevalidate = /export\s+const\s+revalidate\s*=\s*0/.test(s);
    if (!hasDynamic || !hasRevalidate) {
      console.error(`[guard:routes] ${f} missing dynamic/revalidate (critical)`);
      fail = true;
    }
  }
}

if (fail) process.exit(3);
console.log('[guard:routes] ok');

