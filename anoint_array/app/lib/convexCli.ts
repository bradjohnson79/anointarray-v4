import { execFile } from 'child_process';

function getDeploymentFromKey(deployKey?: string | null): string | null {
  if (!deployKey) return null;
  const m = String(deployKey).match(/^([^|]+)\|/);
  return m ? m[1] : null;
}

export async function runConvex<T=any>(functionPath: string, args: any): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const deployKey = process.env.CONVEX_DEPLOY_KEY || null;
    const deployment = process.env.CONVEX_DEPLOYMENT || getDeploymentFromKey(deployKey) || null;
    const env = { ...process.env } as NodeJS.ProcessEnv;
    if (deployKey) env.CONVEX_DEPLOY_KEY = deployKey;
    if (deployment) env.CONVEX_DEPLOYMENT = deployment;
    // Stringify args safely
    const json = JSON.stringify(args || {});
    // Use npx convex run <function> <json>
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = execFile(cmd, ['-y', 'convex@latest', 'run', functionPath, json], { env }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        const trimmed = stdout.trim();
        const firstBrace = trimmed.indexOf('{');
        const jsonText = firstBrace >= 0 ? trimmed.slice(firstBrace) : trimmed;
        const parsed = JSON.parse(jsonText);
        resolve(parsed as T);
      } catch (e: any) {
        reject(new Error('Failed to parse Convex output: ' + (e?.message || String(e)) + ' :: ' + stdout));
      }
    });
    // Safety timeout
    setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new Error('Convex CLI call timed out'));
    }, 60_000);
  });
}

