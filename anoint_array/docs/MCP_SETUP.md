# MCP Setup and Smoke Tests

This project uses MCP servers for provider operations (Supabase, Vercel, GitHub). Config lives in `.codex/config.toml` and reads credentials from your environment — no secrets are committed.

## 1) Prereqs
- Node 18+
- pnpm 8+
- Your MCP client/runner that reads `.codex/config.toml` (e.g., Codex CLI)
- Environment variables exported in your shell:
  - `SUPABASE_ACCESS_TOKEN=sbp_…`
  - `VERCEL_PERSONAL_ACCESS_TOKEN=vercel_pat_…`
  - `GIT_PERSONAL_ACCESS_TOKEN=ghp_…`
  - Recommended:
    - `VERCEL_PROJECT_ID=prj_rc4JpBUeOGNDdts7FApnqxopbeC0`
    - `SUPABASE_PROJECT_REF=znqtfdfvcrbwsefzmtam`

Tip: From repo root, you can also run `pnpm -C app tsx scripts/mcp-check.ts` to validate envs and see suggested commands.

## 2) One‑liners (Smoke Tests)
Run these from your MCP client/terminal after envs are exported.

- List available tools
  - `mcp list-tools`

- Vercel: list envs for the project
  - `mcp vercel env-list --project $VERCEL_PROJECT_ID`

- GitHub: whoami
  - `mcp github whoami`

- Supabase: simple SQL sanity
  - `mcp supabase sql "select now();"`
  - Optional table counts:
    - `mcp supabase sql "select count(*) as c from orders;"`

## 3) Troubleshooting
- Tool missing from `mcp list-tools`:
  - Ensure `.codex/config.toml` is present and the required env var for that tool is exported.
- 401/invalid token:
  - Regenerate the provider token and re‑export the env var (never commit secrets).
- Supabase project ref issues:
  - Export `SUPABASE_PROJECT_REF` (e.g., `znqtfdfvcrbwsefzmtam`). Some MCP servers infer it from credentials; setting it removes ambiguity.

## 4) Notes
- Production runtime uses Prisma Accelerate (prisma://) — keep `DATABASE_URL` prisma:// in Vercel and `DIRECT_URL` for migrations only.
- Keep secrets in Vercel env or local shell; do not commit them.

