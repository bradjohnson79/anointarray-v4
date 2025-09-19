# Stripe CLI & Webhook Setup

This project already includes a live webhook at `/api/payment/stripe/webhook`.

Use the Stripe CLI during development to forward events from your Stripe account to your local server and to generate a test signing secret (STRIPE_WEBHOOK_TEST_SECRET).

## 1) Install Stripe CLI

macOS (Homebrew):

```bash
brew install stripe/stripe-cli/stripe
```

Windows (Scoop):

```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

Linux (apt via packagecloud):

```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
curl -sSL https://packages.stripe.dev/api/security/keyring.gpg | sudo tee /usr/share/keyrings/stripe-keyring.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/stripe-keyring.gpg] https://packages.stripe.dev/stripe-cli-deb stable main" | sudo tee /etc/apt/sources.list.d/stripe-cli.list
sudo apt update && sudo apt install stripe
```

Verify:

```bash
stripe version
```

## 2) Login

```bash
pnpm stripe:login
```

## 3) Start the local dev server

```bash
pnpm dev
# app runs at http://localhost:3002
```

## 4) Start the webhook listener (Test mode)

Use the included script to listen and forward only the event(s) we need:

```bash
pnpm stripe:listen:test
```

Stripe will print something like:

```
Ready! Your webhook signing secret is whsec_xxx
```

Copy that and set it in `app/.env.local`:

```
STRIPE_WEBHOOK_TEST_SECRET="whsec_xxx"
```

Restart the dev server so the env is picked up.

## 5) Trigger a test event

```bash
pnpm stripe:trigger
```

You should see a 200 OK in the Stripe CLI output, and your app logs will show order creation and email attempts.

## 6) Production Webhook (Vercel)

In Stripe Dashboard → Developers → Webhooks:

- Endpoint URL (Live): `https://anointarray.com/api/payment/stripe/webhook`
- Events: `checkout.session.completed` (plus others if needed)
- Copy the **Signing secret** and set in Vercel:
  - `STRIPE_WEBHOOK_SECRET = whsec_...`
- Ensure Stripe API key exists in Vercel env:
  - `STRIPE_SECRET_KEY` (live) and/or `STRIPE_SECRET_TEST_KEY` (test)

Redeploy after saving envs.

## Notes

- Success redirect is handled by Stripe and returns to `/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`.
- The success page clears the cart in context + localStorage.
- The webhook creates the order and sends the emails (customer + admins) but is not required for the browser redirect; it’s for server-side order finalization and receipts.

