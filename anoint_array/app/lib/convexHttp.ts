function resolveAdminKey(): string {
  let adminKey =
    process.env.CONVEX_ADMIN_KEY ||
    process.env.CONVEX_DEPLOY_KEY ||
    process.env.CONVEX_TEAM_ACCESS_TOKEN ||
    '';
  if (!adminKey) {
    throw new Error('Convex is not configured (missing CONVEX_ADMIN_KEY or CONVEX_TEAM_ACCESS_TOKEN)');
  }
  if (adminKey.includes('|')) {
    adminKey = adminKey.split('|').pop() || adminKey;
  }
  return adminKey;
}

export async function callConvex(params: { functionPath: string; args: any }) {
  const url = (process.env.CONVEX_URL || '').replace(/\/$/, '');
  if (!url) {
    throw new Error('Convex is not configured (missing CONVEX_URL)');
  }

  const endpoint = `${url}/api/run/${encodeURIComponent(params.functionPath)}`;
  const token = resolveAdminKey();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Convex ${token}`,
    },
    body: JSON.stringify({ args: params.args || {} }),
  });

  const text = await response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Convex response was not valid JSON: ${text}`);
  }

  if (!response.ok) {
    throw new Error(parsed?.error || parsed?.message || `Convex call failed (${response.status})`);
  }

  return parsed;
}
