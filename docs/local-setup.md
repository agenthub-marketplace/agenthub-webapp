# PRISM Local Setup

PRISM is a Lovable-exported React application using Vite, TanStack Start, TanStack Router, and Supabase.

## Prerequisites

- Git
- Node.js 20 recommended
- npm
- VS Code

## Clone

```powershell
git clone <YOUR_PRIVATE_REPOSITORY_URL>
cd prism-webapp
```

## Install Dependencies

This repository uses npm because `package-lock.json` is present.

```powershell
npm install
```

## Environment Variables

Create a local environment file from the example:

```powershell
Copy-Item .env.example .env.local
```

Fill `.env.local` manually. Never commit `.env`, `.env.local`, or any real secret values.

### Public Frontend Variables

Variables prefixed with `VITE_` are exposed to frontend code by Vite. Only browser-safe public values belong here:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

### Server-Only Variables

Server routes and Supabase Edge Functions may use non-`VITE_` variables. These must never be imported, printed, or exposed in frontend code.

Sensitive values include:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `LOVABLE_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TINK_CLIENT_SECRET`
- `MAKE_WEBHOOK_SECRET`
- `OPENFIGI_API_KEY`
- `FINNHUB_API_KEY`
- `GNEWS_API_KEY`

Use empty placeholders in `.env.example`; put real values only in local secret files or deployment secret managers.

## Run Locally

```powershell
npm run dev
```

Open the local URL printed by Vite.

## Useful Checks

```powershell
npm run lint
```

There is currently no `test` script in `package.json`.

## Common Issues

### Missing Supabase Environment Variables

If the app reports missing Supabase variables, verify `.env.local` exists and includes the required `VITE_SUPABASE_*` values. Restart the dev server after editing environment files.

### Server Route Requires a Secret

Some API routes depend on server-only values such as `FINNHUB_API_KEY`, `OPENFIGI_API_KEY`, `GNEWS_API_KEY`, `TINK_CLIENT_SECRET`, or `SUPABASE_SERVICE_ROLE_KEY`. Leave features that require these services unused locally unless you have safe development credentials.

### Wrong Node Version

Use Node 20 if local dependencies or Vite behave unexpectedly. Newer Node versions may work, but Node 20 is the recommended baseline for handoff.

### Secrets Accidentally Added

Run `git status` before every commit. `.env` and `.env.local` must stay untracked. If a secret was committed, rotate it immediately before pushing.
