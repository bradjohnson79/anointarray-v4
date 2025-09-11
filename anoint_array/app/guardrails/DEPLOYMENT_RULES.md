# Deployment Rules — ANOINT Array

## Branch Discipline
- Work in feature/* → PR to develop → PR to main.
- Never push directly to main.

## MCP Only
- Use MCP servers (supabase, vercel, github). No raw CLI or curl.

## Critical Routes
- /admin, /auth, /dashboard must be:
  ```ts
  export const dynamic = 'force-dynamic';
  export const revalidate = 0;

  Pre-Deploy Checklist
	•	MCP env audit.
	•	Runtime scan.
	•	Supabase schema/RLS sanity.
	•	Lint, typecheck, tests.
	•	Metadata size ≤ 500 chars.
	•	Prisma generate/migrations.
	•	Smoke test: signup + simple checkout.

Breaking Changes
	•	No breaking schema, API, or route changes without explicit authorization.