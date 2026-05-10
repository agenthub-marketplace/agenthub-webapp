# AgentHub

AgentHub is a web-first marketplace where creators can publish verified AI agents and users can rent those agents for concrete tasks, durations, or projects.

This repository is the project foundation for the MVP. It intentionally does not implement payments, real Supabase auth flows, or agent execution yet.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase planned for auth, PostgreSQL, and storage
- Stripe Connect planned for marketplace payments
- Vercel planned for deployment

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` for local values. Do not commit secrets.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

See `docs/` for architecture, product scope, security principles, database draft, and local setup details.
