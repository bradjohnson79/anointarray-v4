# Coding Standards — ANOINT Array

## Runtime Rules
- All API routes that use external SDKs (Stripe, PayPal, Supabase server client, NOWPayments) **must run in Node.js runtime**:
  ```ts
  export const runtime = 'nodejs';

  Env Usage
	•	NEXT_PUBLIC_* → public/browser-safe variables (e.g., NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).
	•	Secret variables (SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, payment secrets) → server-side only. Never used in client code.

Client Instantiation
	•	Do not create database, Supabase, or Redis clients at module scope. Always create them per request inside API handlers or server actions.

Error Handling
	•	Every handler must use try/catch and return structured JSON:

    try {
  // logic
} catch (err:any) {
  console.error('[api:error]', err.message);
  return NextResponse.json({ ok:false, error: err.message }, { status:500 });
}

Logging
	•	Mask all secrets when logging: ABCD…WXYZ (len=xx).
	•	Use structured logging with context { route, code, msg }.

    ---

### `/guardrails/ENVIRONMENT_RULES.md`
```markdown
# Environment Rules — ANOINT Array

## Required Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL (pooled, if ORM/raw SQL)
- STRIPE_SECRET_KEY
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- NOWPAYMENTS_API_KEY

## Best Practices
- Audit with `vercel.env.list` (Preview + Production) before every deploy.
- Keep Preview and Production environments in sync.
- Redeploy with **Clear Build Cache** after env changes.
- Never echo secrets in logs. Always mask them.