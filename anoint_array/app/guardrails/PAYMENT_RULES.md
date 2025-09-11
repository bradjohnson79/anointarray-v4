# Payments Rules — ANOINT Array

## Stripe
- Metadata values must be ≤ 500 characters.
- Only pass small tokens (`order_token`, `cart_hash`) in metadata.
- Store full cart, addresses, and tax breakdown in Redis/DB server-side.
- All Stripe routes must use Node.js runtime:
  ```ts
  export const runtime = 'nodejs';

  	•	Stripe webhooks must be verified with STRIPE_WEBHOOK_SECRET.
	•	On webhook events, finalize orders only after payment_intent.succeeded or checkout.session.completed.

PayPal
	•	Use createOrder + captureOrder endpoints server-side only.
	•	Store order tokens in DB/Redis; don’t pass full JSON in custom fields.
	•	Webhooks required: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED.
	•	Verify signatures with headers (paypal-transmission-id, etc.).

NOWPayments
	•	Use createInvoice → returns a short invoice link.
	•	Store invoice ID server-side.
	•	Validate webhook authenticity with NOWPayments IPN secret.
	•	Orders only marked paid after webhook confirms.

General Rules
	•	No secrets in client code.
	•	Always wrap in try/catch and log { provider, code, message }.
	•	All payment APIs must fail gracefully with 400/403 (not raw 500).

    ---

### `/guardrails/SECURITY_RULES.md`
```markdown
# Security Rules — ANOINT Array

## Secrets
- Never hardcode secrets in code.
- Only use `NEXT_PUBLIC_*` in browser.
- Service role keys (`SUPABASE_SERVICE_ROLE_KEY`, payment secrets) are server-only.
- Mask all secrets in logs.

## HTTPS & SSL
- Always append `?sslmode=require` to Postgres URLs.
- All APIs accessed via HTTPS.

## Error Messages
- No stack traces or SQL errors in client responses.
- Return structured JSON: `{ ok:false, error: "message" }`.

## Auth & Sessions
- Supabase Auth must have `site_url` and redirect URLs configured.
- Use SSR client with cookies for server-side auth.
- Expire tokens properly.

## Policies
- Every table must enable Row Level Security.
- Default deny unless policy grants access.
- Test RLS before deploy with Supabase MCP.

## General
- Validate token lengths (min 32 chars for secrets).
- Restrict file uploads by MIME type and size.
- No public bucket writes without auth.