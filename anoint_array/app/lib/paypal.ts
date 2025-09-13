import fs from 'fs/promises';
import path from 'path';

const STORE_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'storefront-payments.json');
const PAYMENTS_CONFIG_PATH = path.join(process.cwd(), 'data', 'payments-config.json');

export type PaypalConfig = {
  useSandbox: boolean;
  clientId: string;
  clientSecret: string;
  base: string; // PayPal API base (sandbox/live)
  mcpBase?: string; // optional MCP HTTP proxy base (if set)
};

export async function resolvePaypalConfig(): Promise<PaypalConfig> {
  const mcpBase = (process.env.MCP_PAYPAL_HTTP_URL || '').trim() || undefined;
  // Try storefront config first
  try {
    const raw = await fs.readFile(STORE_PAYMENTS_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const useSandbox = !!cfg?.paypal?.testMode;
    const clientId = (useSandbox ? cfg?.paypal?.testClientId : cfg?.paypal?.clientId) || '';
    const clientSecret = (useSandbox ? cfg?.paypal?.testClientSecret : cfg?.paypal?.clientSecret) || '';
    const base = useSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';
    if (clientId && clientSecret) return { useSandbox, clientId, clientSecret, base, mcpBase };
  } catch {}
  // payments-config.json fallback
  try {
    const raw = await fs.readFile(PAYMENTS_CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const useSandbox = !!cfg?.paypal?.testMode;
    const clientId = (useSandbox ? cfg?.paypal?.testClientId : cfg?.paypal?.clientId) || '';
    const clientSecret = (useSandbox ? cfg?.paypal?.testClientSecret : cfg?.paypal?.clientSecret) || '';
    const base = useSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';
    if (clientId && clientSecret) return { useSandbox, clientId, clientSecret, base, mcpBase };
  } catch {}
  // Env fallback (sandbox)
  return {
    useSandbox: true,
    clientId: (process.env.PAYPAL_CLIENT_ID_SANDBOX || '').trim(),
    clientSecret: (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || '').trim(),
    base: 'https://api.sandbox.paypal.com',
    mcpBase,
  };
}

export async function paypalFetch(conf: PaypalConfig, pathOrUrl: string, init: RequestInit) {
  const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
  const path = isAbsolute ? pathOrUrl.replace(/^https?:\/\/[^/]+/, '') : pathOrUrl;
  if (conf.mcpBase) {
    const url = conf.mcpBase.replace(/\/$/, '') + path;
    return fetch(url, init);
  }
  const base = conf.base.replace(/\/$/, '');
  const url = isAbsolute ? (conf.base.replace(/\/$/, '') + path) : (base + path);
  return fetch(url, init);
}

export async function getPaypalAccessToken(conf: PaypalConfig): Promise<string> {
  const auth = Buffer.from(`${conf.clientId}:${conf.clientSecret}`).toString('base64');
  const r = await paypalFetch(conf, '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`PayPal token failed: ${await r.text()}`);
  const j = await r.json();
  return j.access_token as string;
}

export async function createPaypalOrder(conf: PaypalConfig, accessToken: string, payload: any) {
  const r = await paypalFetch(conf, '/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`PayPal order failed: ${await r.text()}`);
  return r.json();
}

export async function capturePaypalOrder(conf: PaypalConfig, accessToken: string, orderId: string) {
  const r = await paypalFetch(conf, `/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) throw new Error(`PayPal capture failed: ${await r.text()}`);
  return r.json();
}

