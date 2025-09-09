# ANOINT Array — Autonomous Sitemap & Support Guide

This document is a high‑level, human‑readable map of the ANOINT Array website and app. It is designed for the AI Support Agent to use as a “road map” when guiding visitors. It summarizes the site structure, key pages and sections, the main user flows (shopping cart and seal generator), and where to escalate issues.

---

## Top‑Level Overview

- Public site runs at `/` with multiple sections on a single home page and dedicated product pages under `/products/[slug]`.
- Members have a dashboard under `/dashboard` (login required).
- Admins have a dashboard under `/admin` (admin role required) with management tools.
- Payments are supported for store products (Stripe, PayPal, NowPayments) and for the Seal Generator product flow.
- Files (images, assets, PDFs) can be served via `/api/files/...` endpoints.

---

## Public Site Map

### Home (`/`)
The home page is a long, scrolling page with the following sections (anchor links):

- `#hero` — Headline, call‑to‑action, brand identity.
- `#products` — Product Grid (fetches `/api/products`). Users can view featured items and open details.
- `#vip` — VIP Waitlist section (POST `/api/vip-waitlist`).
- `#array-generator` — Overview of the personalized Seal Array generator.
- `#about` — Brand & technology background.
- `#affiliates` — Simple affiliate program overview.
- `#testimonials` — Social proof.
- `#contact` — Contact form (POST `/api/contact`).

Navigation component can scroll to these anchors. The shopping cart modal is accessible from the header.

### Product Details (`/products/[slug]`)
Displays a single product with:
- Title, price, category badge, images (and optional variants), description.
- “Add to Cart” button (cart is managed by the site’s Payment Context).
- Variants (if present): style, price, and quantity options.

### Authentication
- Login: `/auth/login` (NextAuth Credentials)
- Signup: `/auth/signup` (creates a user, then login)
- Post‑login redirect rules:
  - Admins → `/admin`
  - Members → `/dashboard`

---

## Member Dashboard (`/dashboard`)

- Overview: `/dashboard` — snapshot of account and quick links.
- Profile: `/dashboard/profile` — update basic profile information.
- Orders: `/dashboard/orders` — view order history and statuses.
- Downloads: `/dashboard/downloads` — access digital purchases.
- Seal Array Generator: `/dashboard/seal-generator` — guided flow that:
  1) collects personal details and configuration,
  2) calls the Oracle API (`/api/oracle/generate-seal`) to assemble a personalized seal and summary,
  3) handles payment via `/api/payment/create-seal-payment` (Stripe, PayPal, NowPayments) and success redirects.

---

## Admin Dashboard (`/admin`)

Core administration tools (admin role required):

- Overview: `/admin` — stats & quick actions.
- User Management: `/admin/users` — list users; change role (User/Admin); activate/deactivate.
- Product Management: `/admin/products` — CRUD products; manage images; feature/unfeature; now supports product variants (style, price, quantity). Uses `/api/products` and `/api/products/[id]`.
- Order Management: `/admin/orders` — list and update orders, see taxes/customs snapshots.
- File Manager: `/admin/file-manager` — upload and delete product images. Files are served via `/api/files/...`.
- Generator Settings: `/admin/generator-settings` — configuration for the Seal Generator (separate from storefront payments).
- Contact Messages: `/admin/contacts` — view messages (if implemented).
- Analytics: `/admin/analytics` — (placeholder) charts & KPIs.
- Settings: `/admin/settings` — three tabs:
  1) Payments (Storefront): configure Stripe/PayPal/NowPayments for Shopping Cart products via `/api/admin/storefront/payments`.
  2) Immunity: run a site scan/repair placeholder via `/api/admin/immunity/scan` (for future self‑healing integration).
  3) AI Support: toggle widget, set system description, maintain knowledgebase (URLs) and upload local manuals.

### AI Support Knowledgebase
- Local KB storage:
  - PDFs: `data/support-kb/pdfs`
  - Markdown: `data/support-kb/md`
- Endpoints used by Admin Settings UI:
  - List KB files: `GET /api/admin/support/kb/files`
- Upload KB files: `POST /api/admin/support/kb/upload` (up to 10 files per batch; `.pdf`, `.md`, or `.png` images)
  - Trigger update/indexing: `POST /api/admin/support/kb/update` (placeholder return)

---

## Payments (Storefront)

Shopping cart purchases use:

- Stripe Checkout (cards)
- PayPal (sandbox/live)
- NowPayments (crypto)

Configuration (storefront/payments) is separate from the Generator’s payment settings. Storefront config is managed under `/admin/settings` → Payments and persisted to `data/storefront-payments.json` via `/api/admin/storefront/payments`.

Success/Cancel URLs in flows are typically under the dashboard (e.g., orders page or seal‑generator page) and use `NEXTAUTH_URL` as base.

---

## File Serving & Uploads

- Public file serving (local and S3 fallback) is via `/api/files/[...filename]`.
- Glyphs for seal previews: `/api/files/glyphs/[filename]`.
- Generated seal JSON for previews: `/api/files/generated-seals/[filename]`.
- Admin File Manager images are uploaded through `/api/upload` (Admin only) and listed by `/api/file-manager/images`.

---

## Support Agent Guidance

Use this file as a *road map* to guide visitors:

1) Understand the visitor’s intent (shopping vs. generator vs. help).
2) Offer direct links or clear steps to reach the right section (e.g., “Go to Products → pick a category” or “Open your Member Dashboard → Seal Generator”).
3) When asked about a product:
   - Mention features, category, price, and where to see more images.
   - If variants exist, explain styles and price differences.
4) When asked about the Seal Generator:
   - Summarize the steps (details → configuration → AI assembly → payment → preview/download).
5) For account issues (login, signup): direct them to `/auth/login` or `/auth/signup`.
6) For order questions: guide to `/dashboard/orders` after login.
7) For downloads: guide to `/dashboard/downloads` (digital products only).

### Broken Links or Site Issues

- If a customer reports a broken page or link:
  - Apologize and collect the URL + what they were trying to do.
  - Inform that an automated site scan can be initiated by an admin.
  - If interacting as an admin‑capable agent, trigger `/api/admin/immunity/scan` (POST) and report back status once complete.
  - Otherwise, notify the user that the issue has been escalated and will be resolved shortly.

### Tone & Safety

- Be concise, friendly, and helpful; avoid medical claims. Focus on product descriptions as presented on the site.
- Do not request or expose private keys, secrets, or sensitive personal data.
- Never invent order data; ask users to log in and check `/dashboard/orders`.

---

## Quick Links (Paths)

- Home: `/`  (sections: `#products`, `#vip`, `#array-generator`, `#about`, `#affiliates`, `#testimonials`, `#contact`)
- Product list API: `/api/products` (public), `/api/products?admin=true` (admin)
- Product details page: `/products/[slug]`
- Login: `/auth/login`  | Signup: `/auth/signup`
- Member Dashboard: `/dashboard`
  - Profile: `/dashboard/profile`
  - Orders: `/dashboard/orders`
  - Downloads: `/dashboard/downloads`
  - Seal Generator: `/dashboard/seal-generator`
- Admin Dashboard: `/admin`
  - Users: `/admin/users`
  - Products: `/admin/products`
  - Orders: `/admin/orders`
  - File Manager: `/admin/file-manager`
  - Generator Settings: `/admin/generator-settings`
  - Settings: `/admin/settings` (Payments, Immunity, AI Support)

---

## Glossary

- “Storefront” — regular product catalog & shopping cart.
- “Seal Generator” — personalized array product flow in Member Dashboard.
- “Variants” — per‑product options (style/price/quantity) editable by Admin.
- “Immunity” — site resilience scan/repair tooling (admin‑initiated).

---

Updated: Keep this file in `data/support-kb/md/` so the AI Support agent can ingest and use it as a living site map.
