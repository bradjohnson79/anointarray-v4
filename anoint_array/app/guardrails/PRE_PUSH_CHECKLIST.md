# Pre-Push Checklist — ANOINT Array

Codex must run these checks before any commit is pushed:

1. **Environment Audit**
   - Run `vercel.env.list` (Preview + Production).
   - Verify required envs exist (Supabase, Stripe, PayPal, NOWPayments, Redis).
   - Mask secrets in logs.

2. **Runtime Scan**
   - Ensure payment/auth/storage routes use:
     ```ts
     export const runtime = 'nodejs';
     ```

3. **Database Sanity**
   - Supabase MCP: `select version();`, `select count(*) from auth.users;`.
   - Verify `profiles`, `products`, `orders`, and `healing_arrays` exist.
   - Confirm RLS is enabled.

4. **Critical Route Guard**
   - No prerendering of `/admin`, `/auth`, `/dashboard`.
   - Must be `force-dynamic` with `revalidate = 0`.

5. **Payment Metadata**
   - No metadata values > 500 chars.
   - Store cart/address server-side.

6. **Lint, Type, Test**
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`

7. **Migrations**
   - Run `prisma generate`.
   - Confirm migrations are idempotent.

8. **Error Handling**
   - Every API route wrapped in try/catch with structured error response.

9. **MCP Smoke Tests**
   - Supabase: insert/select test row.
   - Vercel: prebuild test.
   - Optional: simulate signup + checkout flow.

10. **Commit & Push**
   - Only proceed if all checks pass.
   - Otherwise, stop and request fixes.