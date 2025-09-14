# Transcript — Customs & Compliance persistence fix

Date: 2025-09-03

Summary of changes
- Fixed Product API to persist and return Customs & Compliance fields so edits “stick”.

Files changed
- app/app/api/products/[id]/route.ts
  - PATCH: now accepts and updates `hsCode`, `countryOfOrigin`, `customsDescription`, `defaultCustomsValueCad`, `massGrams`.
  - GET/PATCH selectors: include those fields; serialize `defaultCustomsValueCad` to Number.
- app/app/api/products/route.ts
  - GET (admin=true): select customs fields and convert `defaultCustomsValueCad` to Number in the response.
  - POST: accept customs fields on create; select and serialize them in response.

Impact
- Edit Product → Customs & Compliance values now persist.
- Product list for Admin includes customs fields so the edit modal initializes correctly.

Verification steps
1) Open `/admin/products` and click Edit on a physical product.
2) Fill HS Code, Country of Origin, Description, Default Customs Value (CAD), Mass (grams) → Save.
3) Re-open Edit; fields should be present. Optionally refresh the page and re-open to confirm persisted.
4) Network: PATCH `/api/products/:id` body contains customs fields; response echoes them.

Notes
- DB schema already had these fields (see app/prisma/schema.prisma Product model). The issue was the API not reading/writing them.
## 2025-09-14 — DB Connectivity Policy Update (Pooled + MCP)

- Switched Prisma runtime to use pooled `DATABASE_URL` (Supabase pgBouncer 6543) or Prisma Data Proxy (`prisma://`) instead of direct 5432.
- Kept `DIRECT_URL` only for migrations. `schema.prisma` continues to declare `directUrl = env("DIRECT_URL")`.
- Updated `app/lib/prisma.ts` to prefer pooled/Data Proxy and enable Accelerate when present; disallows falling back to `DIRECT_URL` in production.
- Normalized scripts to prefer `DATABASE_URL` with fallback to `DIRECT_URL` for local/dev.
- Verified with MCP/Prisma sweep: schema aligned, `products.sortOrder` present, FK checks good.
