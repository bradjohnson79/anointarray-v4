# Transcript Rules — ANOINT Array

Codex must maintain a continuous transcript of all actions, so that the project can resume in the event of a crash, shutdown, or interruption.

---

## Purpose
- Ensure no context is lost between sessions.
- Provide a clear, human-readable log of all actions taken by Codex.
- Allow project recovery from the exact last known step.

---

## Transcript File
- File name: `TRANSCRIPT.md` in project root.
- Format: Markdown with date/time, action type, details, and results.

---

## Logging Requirements
For **every action Codex commits**:
1. Append a new entry in `TRANSCRIPT.md`.
2. Each entry must contain:
   - **Timestamp** (UTC)
   - **Action type** (e.g., schema change, API route edit, env update, MCP call)
   - **Files changed** (with paths)
   - **MCP servers used**
   - **Inputs** (summarized, secrets masked)
   - **Outputs/results**
   - **Next step or TODO** (if applicable)

Example:
```markdown
### [2024-06-01 14:32 UTC]
**Action**: Supabase schema update  
**MCP**: supabase.sql  
**Files Changed**: `/app/api/auth/signup/route.ts`  
**Inputs**: `create policy "profiles self read" ...`  
**Outputs**: ✅ Policy created  
**Next Step**: Verify via MCP `select * from pg_policies where tablename='profiles';`