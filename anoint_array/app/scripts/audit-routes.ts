import fs from 'fs';
import path from 'path';

const critical = [/\/app\/app\/auth\//, /\/app\/app\/admin\//, /\/app\/app\/dashboard\//];
let fail = false;

function walk(dir: string, out: string[] = []){
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && entry.name === 'route.ts') out.push(p);
  }
  return out;
}
const files = walk(path.join('anoint_array','app','app'));
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
