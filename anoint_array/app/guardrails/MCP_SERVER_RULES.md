# MCP Server Rules — ANOINT Array

Codex **must** use MCP servers for all provider operations in this project.  
**No raw CLIs or direct curl** calls to provider APIs. If an MCP tool is missing, **stop** and request it.

---

## 0) Purpose

- Provide a **uniform contract** for Codex to interact with providers (Supabase, Vercel, GitHub, Upstash, Puppeteer, Semgrep, Serena).
- Ensure **security, idempotency, and reproducibility** across all automated actions.
- Prevent drift and “creative” shortcuts (e.g., using direct CLI when MCP exists).

---

## 1) Registration & Config (TOML)

MCP servers are registered in `.codex/config.toml` in **TOML** format.  
Since this project uses **pnpm**, each server uses `pnpm dlx` to execute the package.

```toml
# Supabase
[mcpServers.supabase]
command = "pnpm"
args = ["dlx","@supabase/mcp-server-supabase@latest","--access-token","sbp_********"]

# Vercel
[mcpServers.vercel]
command = "pnpm"
args = ["dlx","@vercel/mcp-server-vercel@latest","--access-token","vercel_pat_********"]

# GitHub
[mcpServers.github]
command = "pnpm"
args = ["dlx","@github/mcp-server-github@latest","--access-token","ghp_********"]

# Optional (if enabled)
[mcpServers.upstash]   # Redis/KV helper
[mcpServers.puppeteer] # Headless browser smoke tests
[mcpServers.semgrep]   # Static code analysis
[mcpServers.serena]    # Repo cleanup/refactor/orchestration

2) Security & Secrets
	•	Never print raw secrets or tokens. Mask as ABCD…WXYZ (len=xx).
	•	Secrets must not be written to code files or logs.
	•	If an action requires a missing secret, stop and request it by name only.
	•	Use type: "encrypted" for provider env writes (Vercel MCP).

⸻

3) Discovery & Fallback Policy
	1.	Discover tools
	•	mcp list-tools must show supabase, vercel, github (and any required optional tools).
	2.	If missing
	•	Do not fall back to CLI or raw curl.
	•	Open a blocking TODO: MCP server <name> missing; cannot proceed.
	3.	No silent fallback: any attempt to bypass MCP is a violation.

⸻

4) Standard Workflow (Provider-Agnostic)
	1.	Pre-flight MCP
	•	Confirm servers: mcp list-tools
	•	Read .env.local (mask values)
	•	Verify required envs exist for both Preview and Production via Vercel MCP
	2.	Plan
	•	Outline steps, inputs, outputs, and rollback options
	3.	Execute
	•	Use specific MCP methods (vercel.env.set, supabase.sql, github.create_pr, etc.)
	4.	Verify
	•	Confirm results using read/list methods of the same MCP
	5.	Log
	•	Log minimal context; no secrets
	6.	Rollback
	•	If action fails mid-way, revert changes via MCP where possible or stop and request guidance

⸻

5) Retry, Idempotency & Limits
	•	Retries: exponential backoff ×3 on transient 5xx/timeouts from MCP-backed providers.
	•	Idempotency: write operations must be idempotent or guarded (check if exists; no duplicate creations).
	•	Pagination: when listing, handle multi-page results safely (loop until done).

⸻

6) Provider Playbooks

6.1 Supabase MCP

Allowed
	•	supabase.sql → schema, RLS policies, sanity queries
	•	supabase.auth-get-settings / auth-set-settings → site URL + redirects
	•	supabase.storage-* → create buckets, list, set policies
	•	Small seed data ops

Forbidden
	•	Creating the Supabase project
	•	Large imports (use pg_dump/pg_restore or Supabase Import)
	•	Exposing SERVICE_ROLE key in client code

Notes
	•	All tables must enable RLS (Row Level Security).
	•	Use pooled connection strings for serverless DB access (in app code).
	•	Auth URL config must include: https://anointarray.com, https://www.anointarray.com, http://localhost:3000, /auth/callback, /reset-password.

⸻

6.2 Vercel MCP

Allowed
	•	vercel.env.list / env.set / env.delete
	•	vercel.deployments.create (Preview), deployments.alias (Production)
	•	vercel.logs for diagnostics

Forbidden
	•	vercel CLI invocation
	•	Printing env values in logs

Notes
	•	Scope env vars to Preview and Production.
	•	After env changes: redeploy with Clear build cache.

⸻

6.3 GitHub MCP

Allowed
	•	Branch ops, PR creation, PR status, branch protection
	•	File creation/update via MCP methods

Forbidden
	•	Pushing directly to main
	•	Bypassing branch protections

Notes
	•	Always open PR → develop → pass checks → PR → main.

⸻

6.4 Upstash MCP (optional)

Allowed
	•	redis.get/set/incr/ttl for tokens, rate limits, short-lived caches

Notes
	•	Never store PII. Keep values small. Use TTLs.

⸻

6.5 Puppeteer MCP (optional)

Allowed
	•	Headless smoke tests (signup, checkout, admin page loads)
	•	Screenshot capture for failure analysis

Notes
	•	Use only for non-destructive E2E verification (Preview builds).

⸻

6.6 Semgrep MCP (optional)

Allowed
	•	Static analysis for security/quality before PR merge

Notes
	•	Fail the gate on high-severity issues.

⸻

6.7 Serena MCP (optional)

Allowed
	•	Safe refactors, dead-code removal, import normalization
	•	Must output diffs and respect project build constraints

Notes
	•	Run after code compiles and tests pass.

⸻

7) Error Handling & Reporting
	•	Wrap MCP calls in try/catch at the script level.
	•	Report:
	•	MCP method used
	•	Minimal error text
	•	Next corrective action
	•	If an MCP indicates insufficient scope or invalid token, stop and request proper scope/rotation.

⸻

8) Allowed vs Prohibited Operations

Allowed
	•	Provider operations via MCP only
	•	Idempotent schema/policy changes
	•	Env audits, deploys, PRs through MCP

Prohibited
	•	Raw CLI to providers (vercel, supabase, gh, curl)
	•	Printing secrets or embedding tokens in code
	•	Large DB imports via MCP (use pg tools)
	•	Direct pushes to main

⸻

9) Quick MCP Test Commands
	•	Supabase ping

    mcp supabase sql "select now();"
mcp supabase auth-get-settings

Vercel env:
mcp vercel env-list
mcp vercel env-set KEY VALUE ["preview","production"] encrypted

GitHub:
mcp github whoami
mcp github create-pull-request --base develop --head feat/xyz --title "feat: xyz" --body "…"

10) Troubleshooting
	•	“token not valid” → scope mismatch or expired PAT. Regenerate/relink MCP server.
	•	MCP not listed → misconfigured config.toml. Fix section; restart Codex.
	•	Provider 500s → run /guardrails/PRE_FLIGHT.md and /guardrails/PRE_PUSH_CHECKLIST.md.
	•	Schema errors → verify RLS, tables, and idempotent migrations via supabase.sql.

⸻

11) Compliance

Codex must treat this file and all docs in /guardrails/ as binding.
If a rule cannot be satisfied, Codex must stop and request explicit guidance before proceeding.