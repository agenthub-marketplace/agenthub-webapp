# AgentHub Agentic Development Workflow

This directory contains bounded Codex loop tasks for moving AgentHub forward without changing product behavior accidentally.

## Operating Model

AgentHub uses two different control patterns:

- Agent loops for local development work that can be bounded, validated, and stopped.
- State machines for product workflows that users, creators, admins, payments, access, or reviews depend on.

The loop runner is for development acceleration only. It must not commit, push, deploy, modify the database, modify RLS, install dependencies, or expose secrets.

## Daily Cadence

1. Pick one task file from this directory.
2. Run it with a small iteration budget.
3. Review the diff manually.
4. Run validation.
5. Keep only scoped changes.

Recommended default:

```bash
MAX_ITERS=2 VALIDATE_CMD="npm run agent:validate" npm run agent:loop -- docs/agent-loops/workspace-fluidity.md
```

Windows/npm shortcut examples:

```bash
npm run agent:workspace
npm run agent:activation
npm run agent:reviews
npm run agent:admin-states
npm run agent:creator-guards
```

## Priority Queue

1. `workspace-fluidity.md`
2. `activation-flow-audit.md`
3. `verified-reviews-audit.md`
4. `admin-review-state-map.md`
5. `creator-submission-guardrails.md`

## Loop Fit

Use a loop when:

- The task is local to the repo.
- The allowed scope is narrow.
- A validation command can judge progress.
- Failure can be safely reported without product side effects.

Examples:

- Documentation alignment.
- Route or code audits.
- Small P0/P1 fixes with clear acceptance criteria.
- Test additions.
- Consistency checks between docs and implementation.

## State Machine Fit

Use a state machine when:

- The workflow has business states.
- A user, creator, admin, payment, review, or access record depends on the transition.
- The process has retries, cancellation, human approval, or async work.
- The state must be persisted, audited, and guarded server-side.

AgentHub state-machine candidates:

- Creator submission and admin review.
- Agent publication/suspension/restoration.
- Checkout and active access creation.
- Workspace run lifecycle.
- Verified review eligibility and visibility.
- Future payouts, support, workflow automation, and endpoint execution lifecycles.

## Review Gate

Before keeping a loop result, confirm:

- User, creator, and admin journeys are preserved.
- Marketplace, activation/access, workspace, and verified reviews are preserved.
- No RLS, migration, schema, seed, or Edge Function change was made unless explicitly requested.
- No dependency was added.
- No secret moved client-side.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass or failures are documented.
