# Agent Workflow Runtime Beta

## Summary

`workflow_automation` is the AgentHub Code beta runtime for short, reviewed workflow chains.

It is not a full execution gateway. It supports:

- internal LLM steps;
- approved creator webhook steps;
- durable queue state;
- Supabase Edge worker execution;
- stored run history.

It does not support:

- n8n;
- arbitrary creator code;
- unreviewed external tools;
- file upload changes;
- Stripe, payouts, emails, or persistent notifications.

## Activation Gates

All gates must be open before a workflow can run:

- `WORKFLOW_RUNS_ENABLED=true`;
- `WORKFLOW_WORKER_SECRET` set server-side and in Supabase Edge secrets;
- `WORKFLOW_WEBHOOK_SIGNING_SECRET` set server-side and in Supabase Edge secrets only when a workflow uses `webhook:` steps;
- `agent_runtime_settings.workflow_automation.enabled=true`;
- `agent_runtime_settings.workflow_automation.run_enabled=true`;
- creator allowlisted in `creator_runtime_access`;
- agent version has `runtime_type = workflow_automation`;
- workflow definition approved;
- webhook endpoints approved when webhook steps exist.

Default migration state keeps the runtime disabled.

## Schema

Tables:

- `creator_runtime_access`: allowlist creators for beta runtimes.
- `creator_webhook_endpoints`: creator webhook endpoints submitted and approved by admin.
- `agent_version_workflows`: workflow definition bound to an approved agent version.
- `agent_workflow_runs`: durable workflow queue and result state.
- `agent_workflow_steps`: step-level trace and output.

Existing `agent_runs` remains the public run history parent.

## Workflow DSL v0

Creator beta UI accepts one step per line:

```text
llm: Prepare the brief
llm: Draft the recommendation
webhook: Send to the reviewed creator endpoint
```

Rules:

- 2 to 5 steps;
- allowed step types: `llm`, `webhook`;
- no loops;
- no branching;
- no fan-out;
- webhook steps use one reviewed endpoint for v0.

Stored definition is normalized as JSON:

```json
{
  "version": 1,
  "steps": [
    { "key": "workflow_1_prepare", "label": "Prepare the brief", "type": "llm_step" }
  ]
}
```

## Webhook Signing

AgentHub sends:

- `x-agenthub-timestamp`;
- `x-agenthub-signature`.

Signature payload:

```text
timestamp + "." + raw_json_body
```

Signature algorithm:

```text
HMAC-SHA256 using WORKFLOW_WEBHOOK_SIGNING_SECRET
```

Webhook payload includes:

- run ids;
- step key/label;
- agent/version ids;
- user input;
- previous outputs, truncated.

Payload never includes:

- Supabase service role;
- OpenAI key;
- Stripe details;
- payment details;
- browser tokens.

## Runtime Behavior

`POST /api/agent-runs/workflow`:

- requires authenticated user;
- verifies active access ownership;
- verifies `runtime_type = workflow_automation`;
- verifies workflow runtime setting enabled/run-enabled;
- verifies approved workflow;
- creates `agent_runs`, `agent_workflow_runs`, and queued steps;
- triggers Supabase Edge Function `agent-workflow-worker`.

`GET /api/agent-runs/workflow?runId=...`:

- user-scoped status polling;
- returns workflow status and safe step details;
- may re-trigger the worker while queued/running.

Edge Function `agent-workflow-worker`:

- requires `x-agenthub-worker-secret`;
- claims one queued/stale run atomically through `claim_next_agent_workflow_run`;
- executes steps in order;
- finalizes parent `agent_runs`.

## RLS Model

- User reads only own workflow runs/steps.
- Creator reads own endpoint/workflow definitions only.
- Creator does not read user run outputs.
- Admin can moderate endpoints/workflows.
- Service role/worker writes runtime state.
- Anon has no workflow table access.

## Smoke Test

1. Enable a creator in `creator_runtime_access`.
2. Enable runtime setting for `workflow_automation`.
3. Set `WORKFLOW_RUNS_ENABLED=true`, `WORKFLOW_WORKER_SECRET`, `OPENAI_API_KEY`, and `OPENAI_MODEL` locally and in the Edge worker environment.
4. Creator submits workflow agent with two `llm:` steps.
5. Admin approves workflow assets.
6. Admin approves agent.
7. User rents agent.
8. User opens workspace and launches workflow.
9. Verify status reaches `succeeded`.
10. Verify result appears in workspace history.
11. For webhook workflows only, also set `WORKFLOW_WEBHOOK_SIGNING_SECRET` and repeat with one `webhook:` step against a reviewed HTTPS test endpoint.

## Known Limitations

- Edge worker is short-running and processes one run per invocation.
- No automatic retry scheduler yet.
- No n8n or external SaaS connectors.
- No creator secrets.
- No per-endpoint signing secret in v0.
- Webhook response is truncated to 12k chars.
- Workflow definitions are intentionally simple.
