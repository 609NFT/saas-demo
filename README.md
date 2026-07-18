# SaaS Starter

A real working SaaS scaffold: email/password auth, signed sessions, Stripe checkout + a fulfillment webhook (set `STRIPE_WEBHOOK_SECRET` to fulfill upgrades), and a dashboard shell. JSON-file persistence — no database addon needed.

## What's inside

```
saas/
  server.js                  # express app + session + route mounts
  middleware/auth.js         # requireAuth — guards /api routes
  lib/users.js               # JSON file user store at lib/data/users.json + bcryptjs hashing
  lib/billing.js             # Stripe wrapper (lazy-loads when STRIPE_SECRET_KEY is set)
  routes/auth.js             # POST /api/signup, /api/login, /api/logout, GET /api/me
  routes/billing.js          # POST /api/checkout (auth required), GET /api/plans
  public/index.html          # marketing landing page
  public/signup.html         # signup form
  public/login.html          # login form
  public/pricing.html        # plans grid with upgrade buttons
  public/dashboard.html      # auth-gated dashboard
  public/app.js              # shared frontend (fetch wrappers, form bindings)
  public/styles.css          # design system
```

## Start it locally

```bash
npm install
npm start
```

Open http://localhost:3000.

## Enabling Stripe

The checkout endpoint is wired up but lazy. Without env vars it returns a configuration hint. To enable real Stripe checkout, set these env vars (in VibeKit, use `/env`):

- `STRIPE_SECRET_KEY` — your Stripe secret key
- `STRIPE_PRICE_PRO` — Stripe Price ID for the Pro plan
- `STRIPE_PRICE_TEAM` — Stripe Price ID for the Team plan
- `STRIPE_WEBHOOK_SECRET` — signing secret for the `POST /api/webhook` endpoint. **Until this is set the webhook fails closed (503) and a charged user is never upgraded.** Point a Stripe webhook at `/api/webhook` for the `checkout.session.completed` event, then paste its signing secret here.
- `SESSION_SECRET` — random string used to sign session cookies. **Required in production:** if unset, a random secret is generated at startup and sessions reset on every restart.

Behind TLS (e.g. VibeKit's nginx), set `NODE_ENV=production` so the session cookie is marked `Secure`.

## Persistence

Users live in `lib/data/users.json` on the container's EFS-backed workspace, so they survive restarts. Sessions are in-memory (express-session default) — they reset on container restart. That's intentional for a starter; if you need persistent sessions, ask the agent to swap to a session store.

## Ask the agent

Tell the agent what to change. Examples:

- "Add OAuth via GitHub to the signup page."
- "Replace the JSON user store with the VibeKit Postgres addon."
- "Add a settings page where users can change their password."
