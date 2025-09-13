import fs from 'fs/promises';
import path from 'path';

const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');
const PAYMENTS_CONFIG_PATH = path.join(process.cwd(), 'data', 'payments-config.json');

export type StripeConfig = {
  secretKey: string;
  useTest: boolean;
  base: string; // Stripe API base
  mcpBase?: string; // MCP HTTP proxy base (if set)
};

export async function resolveStripeConfig(): Promise<StripeConfig> {
  const mcpBase = (process.env.MCP_STRIPE_HTTP_URL || '').trim() || undefined;
  // storefront file first
  try {
    const raw = await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const useTest = !!cfg?.stripe?.testMode;
    const secretKey = (useTest ? cfg?.stripe?.testSecretKey : cfg?.stripe?.secretKey) || '';
    if (secretKey && secretKey !== '***') return { secretKey, useTest, base: 'https://api.stripe.com', mcpBase };
  } catch {}
  // payments-config.json fallback
  try {
    const raw = await fs.readFile(PAYMENTS_CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const useTest = !!cfg?.stripe?.testMode;
    const secretKey = (useTest ? cfg?.stripe?.testSecretKey : cfg?.stripe?.secretKey) || '';
    if (secretKey && secretKey !== '***') return { secretKey, useTest, base: 'https://api.stripe.com', mcpBase };
  } catch {}
  // env fallback
  const key = (process.env.STRIPE_SECRET_TEST_KEY || process.env.STRIPE_SECRET_KEY || '').trim();
  return { secretKey: key, useTest: !!process.env.STRIPE_SECRET_TEST_KEY, base: 'https://api.stripe.com', mcpBase };
}

export async function stripeFetch(conf: StripeConfig, pathOrUrl: string, init: RequestInit) {
  const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
  const path = isAbsolute ? pathOrUrl.replace(/^https?:\/\/[^/]+/, '') : pathOrUrl;
  if (conf.mcpBase) {
    const url = conf.mcpBase.replace(/\/$/, '') + path;
    return fetch(url, init);
  }
  const url = (conf.base.replace(/\/$/, '')) + path;
  return fetch(url, init);
}

export async function createStripeCheckoutSession(conf: StripeConfig, params: URLSearchParams) {
  const r = await stripeFetch(conf, '/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${conf.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  } as any);
  if (!r.ok) throw new Error(`Stripe checkout failed: ${await r.text()}`);
  return r.json();
}

