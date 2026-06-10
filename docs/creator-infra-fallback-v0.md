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
