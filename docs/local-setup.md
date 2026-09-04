# Local Setup

## Prerequisites

- Node `>=22.12.0 <23`
- npm `>=10`

The project includes `.nvmrc` with Node `22`.

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

The app runs on the default Next.js dev URL unless the port is already in use.

## Environment setup

Create `.env.local` from `.env.example` for local development.

Public frontend variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCESS_MODE` (`free_beta` or `paid`)
- `PAYMENTS_PROVIDER` (`none` or `stripe`)
- `STRIPE_MODE` (`test` while using sandbox keys)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_CLIENT_ID`
- `AGENT_GATEWAY_SECRET`
- `AGENT_WEBHOOK_SECRET`

Do not commit `.env.local` or real secrets.

For local product testing without Stripe, use `ACCESS_MODE=free_beta` and `PAYMENTS_PROVIDER=none`.
For Stripe sandbox, use `ACCESS_MODE=paid`, `PAYMENTS_PROVIDER=stripe`, `STRIPE_MODE=test`, and provide the Stripe secret and webhook secret.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Common issues

- Missing Supabase variables are acceptable for the placeholder app. The safe clients return `null` until configured.
- Use Node 22 if dependency installation fails on another runtime.
- Do not run `npm audit fix --force` without reviewing breaking changes first.
