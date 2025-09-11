# Database Rules — ANOINT Array

## Row Level Security
- All tables must have RLS enabled.
- User-owned rows: `auth.uid() = user_id`.
- Admin rows: `is_admin = true` policy.

## Connections
- Use **pooled connection string** (`pgbouncer`) in Vercel/serverless.
- Append `?sslmode=require` to all Postgres URLs.

## Migrations
- Write idempotent migrations (safe to re-run).
- Run `prisma generate` on `postinstall` and `build`.

## Sanity Checks (before deploy)
- `select version();`
- `select count(*) from auth.users;`
- Verify expected core tables exist.