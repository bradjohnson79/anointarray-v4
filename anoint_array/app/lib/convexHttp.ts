import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

let cachedClient: ConvexHttpClient | null = null;
let cachedUrl: string | null = null;

function ensureClient(url: string): ConvexHttpClient {
  if (!cachedClient || cachedUrl !== url) {
    cachedClient = new ConvexHttpClient(url);
    cachedUrl = url;
  }
  return cachedClient;
}

function resolveAdminKey(): string {
  let adminKey = process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_DEPLOY_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN || '';
  if (!adminKey) {
    throw new Error('Convex is not configured (missing CONVEX_ADMIN_KEY or CONVEX_TEAM_ACCESS_TOKEN)');
  }
  if (adminKey.includes('|')) {
    adminKey = adminKey.split('|').pop() || adminKey;
  }
  return adminKey;
}

export async function callConvex(params: { functionPath: string; args: any }) {
  const url = process.env.CONVEX_URL || '';
  if (!url) {
    throw new Error('Convex is not configured (missing CONVEX_URL)');
  }

  const client = ensureClient(url.replace(/\/$/, ''));
  // ConvexHttpClient exposes setAdminAuth at runtime, but the current type
  // definitions don’t include it. Cast to any so we can elevate privileges
  // for administrative function calls (signup, admin tools, etc.).
  (client as any).setAdminAuth(resolveAdminKey());

  try {
    return await client.function(
      makeFunctionReference(params.functionPath),
      undefined,
      params.args || {},
    );
  } catch (error: any) {
    const message = error?.message || String(error);
    throw new Error(message);
  }
}
