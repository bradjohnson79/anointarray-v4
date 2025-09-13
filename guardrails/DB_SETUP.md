# Supabase DB Setup — ANOINT Array

This document defines the standard for configuring and repairing the database connection for ANOINT Array in Supabase and Vercel. Follow these steps exactly for all environments.

---

## Correct DATABASE_URL Format (Pooled)

Always use the pooled connection on port 6543 with SSL:

```
DATABASE_URL="postgresql://postgres:<DB_PASSWORD>@db.znqtfdfvcrbwsefzmtam.supabase.co:6543/postgres?sslmode=require"
```

- Use port `6543` (pooled).
- Append `?sslmode=require`.
- Reference `postgres` database unless otherwise specified.

> Recovery: If Prisma still errors, verify password, pool limits, and SSL. For emergency local dev only, you may use port `5432` (non‑pooled) — never in production.

---

## Verification Targets

Verify connection strings in all of the following:

- `.env.local`
- `.env.production` (if present)
- Vercel environment variables (Preview + Production)

All must use the pooled URL shown above. Remove any lingering `5432` URLs from production.

---

## MCP Steps (Supabase + Vercel)

1) Supabase MCP — Sanity
   - `SELECT version();`
   - `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`
   - Optional non‑destructive: `prisma db push` (idempotent)

2) Vercel MCP — Env Update
   - `DATABASE_URL` → pooled URL (port 6543, sslmode=require)
   - Confirm in both Preview and Production

3) Redeploy (Safe)
   - Trigger redeploy only after envs are updated
   - Clear build cache

4) Runtime Test
   - `/api/debug/db` should return `{ ok: true }`
   - `/api/products` should return `200` JSON

5) Transcript Logging
   - Record in `TRANSCRIPT.md`:
     - Old `DATABASE_URL` (masked)
     - New `DATABASE_URL` (masked)
     - Verification result
     - Vercel deployment ID

---

## Recovery Procedure

If Prisma still errors after the steps above:

- Validate DB password (rotate in Supabase if needed, update Vercel env)
- Confirm pooling host + port `6543` and `sslmode=require`
- Check pool size (default 15)
- If rollback is needed for local development only, set `DATABASE_URL` to the non‑pooled port `5432` (NEVER in production)

