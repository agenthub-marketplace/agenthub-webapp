# AgentHub current state

Last updated: 2026-06-10

## Summary

The original IT plan is now outdated. AgentHub is no longer a static marketplace mock or a simple direct-access beta. The product now has a real authenticated flow, Stripe sandbox checkout, direct workspace access, verified reviews, and an internal text-only Assistant IA guidé runner.

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
- Assistant IA guidé runner exists internally.
- `agent_runs` exists for stored run history.
- Agent document input has a beta foundation: private Storage bucket, PDF/DOCX server extraction, `agent_run_files`, document run endpoint, and workspace panel. `document_file` remains a compatibility/feature-flag value.
- `workflow_automation` has a beta foundation: creator allowlist, reviewed webhook endpoints, workflow definitions, durable workflow queue, step trace, and Supabase Edge worker.
- `creator_endpoint` has a beta foundation: creator allowlist, reviewed API endpoints, version-bound endpoint config, server-side signed proxy, `agent_endpoint_runs`, and workspace panel.
- Workspace is now the core product experience.

## Assistant IA guidé runner scope

The Assistant IA guidé runner is an internal text-only runner, not the full execution gateway and not the beta standard for advanced agents.

Included:

- OpenAI called server-side only.
- Text input by default.
- Controlled document input beta for PDF/DOCX when the Agent Contract requires a document.
- No streaming.
- No public upload.
- No external tools.
- No n8n.
- No creator code execution.
- User must own an active access.
- Agent version must use `execution_mode = 'llm_prompt'`.
- Outputs are stored in `agent_runs`.
- Recent run history is visible in the workspace.

Still later:

- Full execution gateway beyond the controlled runtime betas.
- n8n or external automation.
- Autonomous agents.
- Public creator-visible document/file upload.
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

- Closed internal beta: Day 1 base validated.
- Public limited beta: not launched yet.
- Real paid V1: later.

Day 1 validation on 2026-05-28:

- Admin archive flow was used to clean the existing agent catalog.
- Creator template submission flow was validated with 5 agents.
- Admin review and approval flow was validated.
- User rent/access/workspace flow was validated.
- Assistant IA guidé was validated with Meeting Notes Checklist on realistic meeting notes.
- The product remains a prompt-orchestrated text runner, not fine-tuned agents and not the full execution gateway.

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

The next milestone is moving from isolated runtime support to a workspace that
can support every approved agent type with clear guardrails:

- Agent Manifest V1 as the shared source of truth for creator submission,
  admin review, security precheck, workspace rendering, and revenue analytics.
- Security Precheck Agent to triage submissions before admin review, without
  replacing human decisions.
- Dynamic workspace blocks so each runtime has the right setup, input,
  execution, result, history, and review experience.
- Creator-hosted infrastructure support for agents that cannot be fully served
  by AgentHub-hosted runtimes.
- Revenue ledger planning before Stripe Connect payouts.

Operational references:

- Closed beta test plan: `docs/beta-closed-test-plan.md`.
- Beta ops runbook: `docs/beta-ops-runbook.md`.
- Read-only sanity SQL: `scripts/beta-sanity.sql`.
- Agent Manifest V1: `docs/agent-manifest-v1.md`.
- Security Precheck Agent: `docs/security-precheck-agent.md`.
- Workspace Dynamic Blocks: `docs/workspace-dynamic-blocks.md`.
- Next implementation sequence: `docs/agenthub-next-implementation-plan.md`.

Current rule: the frontend is frozen except for P0/P1 fixes. Backend, data, and beta operations are the active focus. Next operational step is a Day 2 limited tester launch with 3 to 5 internal testers.
