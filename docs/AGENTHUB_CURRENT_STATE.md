# AgentHub current state

Last updated: 2026-05-27

## Summary

The original IT plan is now outdated. AgentHub is no longer a static marketplace mock or a simple direct-access beta. The product now has a real authenticated flow, Stripe sandbox checkout, direct workspace access, verified reviews, and an internal text-only LLM Runner v0.

The current beta target is:

```text
creator creates an agent from template
-> admin reviews and approves
-> approved agent appears in marketplace
-> user pays through Stripe sandbox
-> active access is created
-> user opens the workspace
-> user launches LLM workspace actions
-> results are stored in agent_runs
-> user can leave a verified review
```

## What exists now

- Emergent UI is the active frontend base.
- Supabase Auth is integrated.
- Roles exist: `user`, `creator`, `admin`.
- Protected routes are integrated.
- Creator submission exists.
- Admin review exists: request changes, approve, reject, suspend, restore.
- Marketplace is backed by Supabase and limited to approved, non-suspended agents.
- Stripe Checkout sandbox foundation exists.
- `payments` table exists.
- Stripe webhook exists.
- Checkout success, cancel, and status pages exist.
- Price snapshot is captured server-side.
- `agent_version_id` is frozen at checkout/access creation time.
- Direct access and `/workspace` exist.
- Verified reviews exist.
- LLM Runner v0 exists internally.
- `agent_runs` exists for stored run history.
- Workspace is now the core product experience.

## LLM Runner v0 scope

LLM Runner v0 is an internal text-only runner, not the full execution gateway.

Included:

- OpenAI called server-side only.
- Text input only.
- No streaming.
- No upload.
- No external tools.
- No n8n.
- No creator code execution.
- User must own an active access.
- Agent version must use `execution_mode = 'llm_prompt'`.
- Outputs are stored in `agent_runs`.
- Recent run history is visible in the workspace.

Still later:

- Full execution gateway.
- n8n or external automation.
- Creator endpoints.
- Autonomous agents.
- File upload.
- Tool calling.
- Advanced cost analytics.

## Payments and access

Stripe sandbox is the production test path for closed beta.

- `ACCESS_MODE=paid` and `PAYMENTS_PROVIDER=stripe` are the target production test settings.
- `free_beta` is only a controlled fallback/dev mode, not the main production test flow.
- Paid access is created only after webhook confirmation.
- The success page reads status and redirects when access exists.
- Duplicate active access is blocked.
- Stopped access is kept in user history and can be re-rented according to product rules.

## Progress framing

- Closed internal beta: advanced / almost ready.
- Public limited beta: not launched yet.
- Real paid V1: later.

## Later phases

These are intentionally out of scope for the current closed beta preparation:

- Stripe Connect.
- Creator payouts.
- Uploads.
- Transactional emails.
- Persistent notifications.
- Full execution gateway.
- n8n.
- External tools.
- Public beta growth mechanics.
- Real revenue launch.

## Immediate next focus

The next milestone is a closed beta with a small number of clean LLM-ready agents:

- 5 strong templates, not 20 weak ones.
- Clear creator submission flow.
- Admin approval quality control.
- Stripe sandbox checkout.
- Workspace LLM actions.
- Stored run history.
- Verified review after access.
- Notion or equivalent feedback tracking.
