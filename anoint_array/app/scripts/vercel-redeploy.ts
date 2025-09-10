// Usage:
//   VERCEL_API_TOKEN=xxx PROJECT_ID=prj_xxx TARGETS=preview,production pnpm tsx scripts/vercel-redeploy.ts
// Tries to rebuild the latest deployments for selected targets with cache cleared.

type Target = 'development' | 'preview' | 'production';

const token = process.env.VERCEL_API_TOKEN || '';
const projectId = process.env.PROJECT_ID || '';
const targets = (process.env.TARGETS || 'preview,production').split(',').map(s => s.trim()).filter(Boolean) as Target[];

if (!token || !projectId) {
  console.error('Missing VERCEL_API_TOKEN or PROJECT_ID');
  process.exit(1);
}

async function vercel(pathname: string, init?: RequestInit): Promise<Response> {
  const url = `https://api.vercel.com${pathname}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  return fetch(url, { ...init, headers: { ...headers, ...(init?.headers as any) } });
}

async function latestDeployment(target: Target) {
  // v6 deployments API remains widely supported
  const res = await vercel(`/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=${target}&limit=1`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to list deployments (${target}): ${t}`);
  }
  const j: any = await res.json();
  const dep = (j.deployments && j.deployments[0]) || j[0];
  if (!dep) return null;
  return dep as { id: string; url: string; state: string; created: number };
}

async function rebuild(deploymentId: string) {
  // Try v13 rebuild endpoint with cache disabled
  let res = await vercel(`/v13/deployments/${deploymentId}/rebuild`, {
    method: 'POST',
    body: JSON.stringify({ withCache: false }),
  });
  if (res.ok) return await res.json();

  // Fallback to older path or different body shapes
  res = await vercel(`/v13/deployments/${deploymentId}/rebuild`, { method: 'POST' });
  if (res.ok) return await res.json();

  const t = await res.text();
  throw new Error(`Rebuild failed: ${t}`);
}

(async () => {
  try {
    for (const target of targets) {
      const dep = await latestDeployment(target as Target);
      if (!dep) { console.log(`No ${target} deployment found.`); continue; }
      console.log(`Rebuilding ${target}: ${dep.id} (${dep.url}) with cache cleared…`);
      try {
        const out = await rebuild(dep.id);
        console.log(`Triggered rebuild for ${target}:`, out?.job?.id || 'ok');
      } catch (e: any) {
        console.error(`Rebuild error for ${target}:`, e?.message || e);
        console.error('If rebuild is unsupported, run: npx vercel --prod --force (and for preview: npx vercel --force)');
      }
    }
  } catch (e: any) {
    console.error('Redeploy script failed:', e?.message || e);
    process.exit(1);
  }
})();

