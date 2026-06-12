# Creator Infra Fallback v0

## Purpose

Creator Infra Fallback lets AgentHub keep the commercial and trust layer while a
specialized creator runtime handles execution.

In v0 this is **not** an iframe, redirect, public external workspace, n8n flow,
or arbitrary creator code execution. It is the existing server-side
`creator_endpoint` runtime made explicit in the workspace and review language.

## Product Boundary

```text
AgentHub owns:
- user identity and access;
- Stripe/payment state;
- rental/access lifecycle;
- admin review;
- security review;
- endpoint approval;
- server-side request signing;
- timeout/error handling;
- minimal run history;
- verified reviews.

Creator infrastructure owns:
- the specialized execution behind an approved HTTPS endpoint;
- its own internal processing logic;
- the JSON response returned to AgentHub.
```

The user should never be sent directly to an unverified creator URL in v0.

## Runtime Mapping

Current v0 mapping:

```text
runtime_type = creator_endpoint
infraMode = creator_hosted
workspaceManifest.trust.creatorInfraDisclosure != null
```

Workflow agents can be `hybrid` when AgentHub orchestrates steps and may call an
approved creator endpoint from a workflow step.

## Fallback Decision Model

AgentHub should prefer native execution when the workspace can safely support
the agent. Creator infrastructure is used only when the agent requires a
capability AgentHub does not yet provide.

Use this decision order during creator/admin review:

```text
1. Can AgentHub run it as an Assistant IA guide?
   -> use llm_prompt / assistant.

2. Does it only need one private PDF/DOCX text extraction?
   -> use document-capable workspace.

3. Does it need a linear controlled sequence of AgentHub-owned steps?
   -> use workflow_automation.

4. Does it need proprietary creator logic, data, or infrastructure that
   AgentHub cannot safely host in beta?
   -> use creator_endpoint fallback.

5. Does it need browser-side secrets, arbitrary tools, unreviewed code,
   direct user redirect, iframe, or unbounded execution?
   -> reject or defer to a future runtime.
```

Fallback is appropriate when all of these are true:

- the user outcome is clear and reviewable;
- the endpoint can produce a bounded text/JSON result;
- AgentHub can keep access, run history, support state, and verified reviews;
- the creator can expose a stable HTTPS endpoint;
- an admin can test and approve the endpoint without seeing private user data;
- a security review can explain what data leaves AgentHub.

Fallback is not appropriate when:

- the creator needs direct browser credentials;
- the endpoint requires long-running sessions or websockets;
- the output cannot be represented in AgentHub run history;
- the creator cannot document data retention;
- the endpoint needs uncontrolled external actions;
- the creator asks users to leave AgentHub in v0.

## Compatibility Matrix

| Agent need | Native AgentHub runtime | Creator infra fallback |
| --- | --- | --- |
| Prompted text generation | `llm_prompt` | No |
| PDF/DOCX text extraction | document-capable workspace | No |
| Linear decision workflow | `workflow_automation` | Optional for approved webhook steps |
| Proprietary enrichment API | No | `creator_endpoint` |
| Private creator database lookup | No | `creator_endpoint` if endpoint is approved |
| OAuth into third-party SaaS | Not beta | Not v0 unless manually approved later |
| Long-running automation | Not beta | Not v0 |
| Arbitrary code/package | Not beta | Not v0 |
| Direct external workspace | Not beta | Future v1 only |

## User Workspace Behavior

For creator-hosted runtime workspaces, the user sees:

- "Fallback infrastructure creator" / "Creator infrastructure fallback";
- explanation that AgentHub keeps access, payment state, audit, history, and
  verified reviews;
- explanation that the endpoint receives only the server-side execution payload;
- explanation that AgentHub signs the request and handles timeout/failure
  states;
- the standard AgentHub result/history surface.

The user does not see:

- service role keys;
- endpoint signing secret;
- raw payload internals;
- private endpoint credentials;
- stack traces;
- direct browser calls to the creator endpoint.

## Endpoint Contract

The creator endpoint must:

- be public HTTPS;
- reject localhost, private IPs, link-local addresses, and credentials in URL;
- accept `POST`;
- return JSON within the beta timeout;
- return a text result that AgentHub can store in `agent_runs`;
- not require browser-side secrets;
- be approved by an admin before publication.

AgentHub sends requests server-side and signs them with:

```text
x-agenthub-timestamp
x-agenthub-signature
```

The endpoint should verify HMAC before trusting the payload.

## Admin Gates

Publication requires:

- creator allowlist for `creator_endpoint`;
- runtime setting enabled/run-enabled;
- creator endpoint submitted;
- endpoint URL safety checks;
- endpoint approved;
- agent endpoint asset approved;
- security review `passed` or `waived`;
- Security Precheck without deterministic blockers.

Admin review should expose a fallback readiness checklist before approval:

```text
[ ] Creator is allowlisted for creator_endpoint
[ ] Runtime setting enabled/run_enabled in target environment
[ ] Endpoint URL is HTTPS and not private/local
[ ] Endpoint health check passes or failure is explicitly waived in security review
[ ] Endpoint row is approved
[ ] Agent endpoint asset is approved
[ ] Security review passed/waived
[ ] User-facing data disclosure is present
[ ] Failure copy is understandable
[ ] No direct browser call, iframe, or redirect is required
```

Any unchecked item should block publication unless the admin explicitly records
a waiver in the security review. In the admin advanced-agent diagnostic, a
`creator_endpoint` should not be marked ready unless the endpoint health check
passes or the security review is `waived`.

`/code/admin/endpoints` also displays the latest saved health check from
`audit_logs` after reload. This is intentionally a diagnostic signal only:

- the raw endpoint response is not stored;
- only `ok`, `code`, response size, endpoint id and timestamp are retained;
- admins can rerun the signed POST check manually;
- API routes still enforce runtime settings, endpoint approval, access
  ownership and server-side signing at execution time.

## Workspace Readiness Score

The workspace can show an internal readiness score derived from the same gates.
This is an ops/admin signal first, not a public marketing claim.

Suggested scoring:

```text
100 ready
- 25 runtime disabled
- 20 creator not allowlisted
- 20 endpoint not approved
- 15 security review missing
- 10 endpoint health check missing or stale
- 10 no user-facing disclosure
- 10 latest run failed
```

Score interpretation:

- `90-100`: runnable for controlled beta;
- `70-89`: runnable only with admin awareness;
- `<70`: block or keep hidden from marketplace.

The score must never bypass API route checks. It only helps admin/support see
why an agent is not ready.

## Workspace Compatibility Signal

`/code/admin/ops/advanced-agents` also derives a workspace compatibility signal
from the same server-side data. This signal answers a different question than
the readiness score:

```text
Can the current AgentHub workspace execute this agent, or does the agent require
creator infrastructure before it can be tested safely?
```

The signal is intentionally read-only and does not create new product state.

Current modes:

| Mode | Meaning | Typical runtime |
| --- | --- | --- |
| `agenthub_hosted` | AgentHub can execute the run inside its own workspace/runtime. | LLM-only `workflow_automation` |
| `hybrid_creator_infra` | AgentHub orchestrates the workspace but calls approved creator webhooks for some steps. | workflow with `webhook_step` |
| `creator_infra_required` | AgentHub keeps access, payment, history and review, but execution depends on a creator HTTPS endpoint. | `creator_endpoint` |

Current statuses:

| Status | Meaning |
| --- | --- |
| `ready` | Runtime, asset, security review, publication and endpoint/webhook health gates are satisfied. |
| `review_required` | A small number of gates still need admin review before beta execution. |
| `blocked` | Multiple or critical gates are missing; do not send testers to this workspace yet. |

The signal checks:

- runtime setting enabled/run_enabled;
- runtime asset approval;
- security review `passed` or `waived`;
- marketplace publication status;
- endpoint health for `creator_endpoint`;
- webhook health for workflow steps that call creator webhooks.

It must never override the API route checks. It exists so admins can see whether
the next action is:

- finish AgentHub-hosted workflow setup;
- validate a hybrid webhook dependency;
- move the agent to creator infra fallback;
- block publication until a missing review or health check is resolved.

## Failure Handling

AgentHub must surface readable states:

- endpoint unavailable;
- timeout;
- invalid JSON;
- non-2xx response;
- runtime disabled;
- access stopped/cancelled;
- agent suspended/archived.

The failure is stored in run history when a run exists.

## Smoke Test

Use this test before allowing a creator endpoint agent into a beta cohort:

1. Admin allowlists the creator for `creator_endpoint`.
2. Creator submits an agent from the API template with a public HTTPS endpoint.
3. Admin runs endpoint health check.
4. Admin approves endpoint and endpoint asset.
5. Admin passes or waives security review with notes.
6. Admin approves the agent.
7. User rents via Stripe sandbox.
8. User opens workspace and sees creator-infra disclosure.
9. User sends non-sensitive input.
10. AgentHub server calls endpoint with HMAC headers.
11. Endpoint returns bounded JSON with `output_text`.
12. AgentHub stores the result in `agent_runs`.
13. User reloads and sees history.
14. User leaves a verified review.

Go/no-go:

- no direct browser call to endpoint;
- no endpoint URL or secret visible to the user;
- failed endpoint produces readable error;
- creator cannot read private user run payload from AgentHub tables;
- admin can suspend endpoint or agent after the test.

## Future v1

Potential future external workspace support needs a separate design:

- approved `creator_workspace_url`;
- strict redirect/iframe policy;
- session handoff tokens;
- CSP and frame controls;
- scoped audit event;
- revocation/kill switch;
- user-facing disclosure before leaving AgentHub;
- stronger security review.

Do not add iframe or redirect support until those controls exist.
