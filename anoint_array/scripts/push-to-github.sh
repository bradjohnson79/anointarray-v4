#!/usr/bin/env bash
set -euo pipefail

# Reads GIT_HTTPS and GIT_PERSONAL_ACCESS_TOKEN from the current shell env (or .env.local manually exported)
# Usage:
#   export GIT_HTTPS="https://github.com/OWNER/REPO.git"
#   export GIT_PERSONAL_ACCESS_TOKEN="ghp_..."
#   bash anoint_array/scripts/push-to-github.sh

if [[ -z "${GIT_HTTPS:-}" || -z "${GIT_PERSONAL_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: Missing GIT_HTTPS or GIT_PERSONAL_ACCESS_TOKEN in environment." >&2
  echo "Set them (e.g., export from anoint_array/app/.env.local) and re-run." >&2
  exit 1
fi

REPO_URL="$GIT_HTTPS"
TOKEN="$GIT_PERSONAL_ACCESS_TOKEN"

# Insert PAT into https URL using x-access-token format safely
SUFFIX=${REPO_URL#https://}
AUTH_URL="https://x-access-token:${TOKEN}@${SUFFIX}"

echo "Preparing git repo..."
 git init
 git config user.email "ci@anointarray.local" || true
 git config user.name "ANOINT Array CI" || true
 git branch -M main || true
 git remote remove origin 2>/dev/null || true
 git remote add origin "$AUTH_URL"

echo "Staging files..."
 git add -A
 git commit -m "Initial import from local workspace" || echo "Commit skipped (no changes)"

echo "Pushing to GitHub..."
 git push -u origin main
 echo "Done."
