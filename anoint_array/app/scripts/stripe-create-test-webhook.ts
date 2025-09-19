/**
 * Creates a Stripe Test-mode webhook endpoint pointing to the live domain and
 * pushes the returned signing secret to Vercel as STRIPE_WEBHOOK_TEST_SECRET.
 *
 * Usage:
 *   STRIPE_SECRET_TEST_KEY=sk_test_... \
 *   VERCEL_API_TOKEN=vercel_pat_... \
 *   PROJECT_ID=prj_... \
 *   pnpm tsx scripts/stripe-create-test-webhook.ts
 */

async function main() {
  const stripeKey = process.env.STRIPE_SECRET_TEST_KEY || '';
  const vercelToken = process.env.VERCEL_API_TOKEN || process.env.VERCEL_PERSONAL_ACCESS_TOKEN || '';
  const projectId = process.env.PROJECT_ID || process.env.VERCEL_PROJECT_ID || '';
  if (!stripeKey) throw new Error('Missing STRIPE_SECRET_TEST_KEY');
  if (!vercelToken) throw new Error('Missing VERCEL_API_TOKEN or VERCEL_PERSONAL_ACCESS_TOKEN');
  if (!projectId) throw new Error('Missing PROJECT_ID or VERCEL_PROJECT_ID');

  const url = 'https://anointarray.com/api/payment/stripe/webhook';

  // 1) Create Stripe webhook endpoint (Test mode)
  const params = new URLSearchParams();
  params.set('url', url);
  params.append('enabled_events[]', 'checkout.session.completed');
  const stripeRes = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const stripeBody: any = await stripeRes.json();
  if (!stripeRes.ok) throw new Error(`Stripe error: ${stripeRes.status} ${JSON.stringify(stripeBody)}`);
  const secret = stripeBody.secret as string | undefined;
  const endpointId = stripeBody.id as string;
  if (!secret) {
    console.warn('Stripe returned no secret; ensure this is Test mode. You may need to reveal the secret in Dashboard.');
  }
  console.log(`Stripe Test webhook created: ${endpointId} -> ${url}`);
  if (secret) console.log(`Signing secret: ${secret.slice(0,4)}…${secret.slice(-4)} (len=${secret.length})`);

  if (!secret) return; // stop if no secret available

  // 2) Push to Vercel env as STRIPE_WEBHOOK_TEST_SECRET for preview+production
  const target = ['preview','production'];
  // Delete existing
  const list = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env?decrypt=false`, {
    headers: { Authorization: `Bearer ${vercelToken}` }
  });
  const envs: any[] = ((await list.json()).envs) || [];
  const existing = envs.filter(e => e.key === 'STRIPE_WEBHOOK_TEST_SECRET');
  for (const e of existing) {
    await fetch(`https://api.vercel.com/v10/projects/${projectId}/env/${e.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${vercelToken}` }
    });
  }
  const create = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'STRIPE_WEBHOOK_TEST_SECRET', value: secret, target, type: 'encrypted' })
  });
  if (!create.ok) {
    const t = await create.text();
    throw new Error(`Failed to set Vercel env: ${t}`);
  }
  console.log('Pushed STRIPE_WEBHOOK_TEST_SECRET to Vercel (preview, production). Redeploy to apply.');
}

main().catch(e => { console.error(e); process.exit(1); });

