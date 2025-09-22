# 🔐 Codex Guardrail — Access Token Formats & Auth Key Practices

## 🧠 Purpose

Prevent Codex from misusing outdated token formats, generating invalid auth headers, or misreading environment variable scopes — especially when deploying with modern platforms like **Vercel**, **Supabase**, or **Convex**.

---

## ✅ Valid Token Formats

### ✅ Vercel Personal Access Token (PAT)

- **Must start with**: `vercel_pat_`
- **Expected length**: ~70+ characters
- **Use case**: Used in CLI or API scripts via `--token` or `VERCEL_TOKEN` env

```bash
# GOOD:
npx vercel --token $VERCEL_PAT

# BAD (invalid short token):
npx vercel --token ax9kT91VkLHVB9Ao6j9otDtr

## ❌ Outdated Deploy Token (DEPRECATED)

**Old behavior Codex must avoid:**

```ts
// ❌ DEPRECATED
const CONVEX_DEPLOY_TOKEN = "convex_deploy_xyz123..."