# 🛡️ Anoint Array Guardrails: Supabase + Next.js

> **Purpose:** Define the core principles, architecture, and development rules for maintaining a clean, stable, and scalable application using **Supabase** as backend + **Next.js** as frontend.

---

## 🧱 Core Stack

| Layer       | Tool                        |
|-------------|-----------------------------|
| Database    | Supabase (Postgres)         |
| Auth        | Supabase Auth               |
| Storage     | Supabase Storage (public)   |
| Frontend    | Next.js (App Router)        |
| Serverless  | Next.js API routes (no Prisma) |
| Data Access | Supabase JS Client (`@supabase/supabase-js`) |
| Hosting     | Vercel                      |

---

## ✅ General Rules

- ❌ **No Prisma** — all DB interaction happens via Supabase JS Client
- ✅ Use **Service Role Key** in secure API routes (NEVER on client)
- ✅ Use **Anon Key** for public client-side access
- ❌ No direct TCP (5432) usage
- ✅ No use of Accelerate, poolers, or proxy hacks
- ✅ Keep all data fetches HTTP-based (via Supabase client)

---

## 📁 Project Structure

/app
/api               # All API routes (e.g. /products, /checkout)
/components        # UI building blocks
/lib               # Supabase client, helpers, config utils
/styles            # Tailwind / global CSS
/(pages|routes)    # Page components / layouts
/public              # Static assets

---

## 🔑 Environment Variables

| Key                          | Use                              |
|------------------------------|-----------------------------------|
| `SUPABASE_URL`               | Supabase project URL              |
| `SUPABASE_ANON_KEY`          | Public key (client use)           |
| `SUPABASE_SERVICE_ROLE_KEY` | Private key (API routes only)     |

> These must be set in **Vercel Production + Preview** environments.

---

## ⚙️ Supabase Client Usage

**`lib/supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

📦 API Route Pattern

Example: /api/products

import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    console.error('[Supabase Error]', error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, products: data }), {
    status: 200,
  });
}

Auth Guardrails
	•	✅ Use Supabase session client on frontend (createBrowserClient() or createServerClient())
	•	✅ Use cookies for auth state management
	•	✅ Secure server-side actions with SERVICE_ROLE_KEY
	•	✅ Use Row Level Security (RLS) on Supabase tables
	•	❌ Never expose SERVICE_ROLE_KEY to the browser

⸻

🖼️ Image + File Handling
	•	✅ Use Supabase Storage (product-images, downloads, etc.)
	•	✅ Public buckets for public images
	•	✅ Private buckets for downloads (served via signed URLs)
	•	✅ Use /api/files/[...filename] to proxy or stream images from Supabase

⸻

🧪 Dev & Deploy Notes
	•	Always redeploy with cache cleared after env updates
	•	Use /api/debug/db to test Supabase connectivity
	•	Use /api/debug/session to validate auth state
	•	Feature toggles can live in Supabase app_config table

⸻

🧼 Code Quality
	•	✅ Use TypeScript + ESLint + Prettier
	•	✅ Keep logic out of components (use hooks or lib)
	•	✅ Avoid multi-source data fetch in one component
	•	✅ Keep route code DRY and segmented by feature

⸻

🚫 Forbidden
	•	❌ Prisma
	•	❌ Direct Postgres TCP connections (5432)
	•	❌ Mixing DB layers (no half-Prisma, half-Supabase)
	•	❌ Leaking service keys into frontend
	•	❌ Deploying without .env parity in Vercel

⸻

🚀 Goal

To build a fully dynamic, fast, secure, and zero-friction web application that balances the power of Supabase with the flexibility of Next.js — while keeping the codebase lean, testable, and maintainable for Codex-driven development.