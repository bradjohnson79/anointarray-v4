# Pre-Flight Checklist — ANOINT Array

Codex must run this **before** starting new work, migrations, or deployments.  
If any step fails, **stop** and request guidance.

---

## 0) Repo & Branch Sanity
- ✅ On the correct repo/folder (contains `package.json`, `next.config.js`, `app/`).
- ✅ Current branch is **feature/** or **fix/**; never start on `main`.
- ✅ `git fetch --all --prune && git status` is clean (no uncommitted changes).

---

## 1) MCP Availability
- `mcp list-tools` includes at minimum:
  - **vercel**, **supabase**, **github**
  - (optional) **upstash**, **puppeteer**, **semgrep**, **serena**
- If a required MCP is missing: stop and request to add it.

---

## 2) Environment Probe (no secrets printed)
- Read `.env.local` (mask values: `ABCD…WXYZ (len=xx)`).
- Vercel MCP: `vercel.env.list` for **Preview** and **Production**.
- **Required keys must exist in both scopes:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)
  - If ORM/raw SQL: `DATABASE_URL` (pooled, `?sslmode=require`)
  - Payment: `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NOWPAYMENTS_API_KEY`
  - `NEXT_PUBLIC_SITE_URL` (e.g., `https://anointarray.com`)
- If any are missing/mismatched → open a TODO and stop.

---

## 3) Runtime & Framework Checks
- **Node runtime required** on routes that use external SDKs (payments, Supabase server, storage):
  ```ts
  export const runtime = 'nodejs';

  	•	No DB/Redis/Supabase clients at module scope; instantiate per request.
	•	Confirm critical routes are not prerendered:
	•	/admin/**, /auth/**, /dashboard/** must include:

    export const dynamic = 'force-dynamic';
export const revalidate = 0;