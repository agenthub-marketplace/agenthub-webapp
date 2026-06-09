# Agent API Runtime Beta

`creator_endpoint` is the fourth AgentHub Code runtime family for controlled beta tests where AgentHub calls a creator-owned HTTPS API endpoint.

It is not a full execution gateway. It does not run creator code inside AgentHub, does not call endpoints from the browser, and does not expose secrets client-side.

## Default State

Disabled by default:

```env
CREATOR_ENDPOINT_RUNS_ENABLED=false
CREATOR_ENDPOINT_SIGNING_SECRET=
CREATOR_ENDPOINT_TIMEOUT_MS=15000
CREATOR_ENDPOINT_MAX_RESPONSE_CHARS=12000
CREATOR_ENDPOINT_RUNS_PER_RENTAL_PER_DAY=5
CREATOR_ENDPOINT_RUNS_PER_USER_PER_DAY=15
```

Database runtime setting also stays disabled by default:

```text
agent_runtime_settings.creator_endpoint.enabled = false
agent_runtime_settings.creator_endpoint.creator_visible = false
agent_runtime_settings.creator_endpoint.run_enabled = false
```

## Data Model

Tables:

- `creator_runtime_access`: allowlists creators for `creator_endpoint`.
- `creator_api_endpoints`: creator-submitted HTTPS endpoints, reviewed by admin.
- `agent_version_creator_endpoints`: binds one approved endpoint config to one agent version.
- `agent_endpoint_runs`: stores endpoint run state linked to `agent_runs`.

The user-facing run output is stored in `agent_runs.output_text`.

## Server Flow

`POST /api/agent-runs/endpoint`:

1. requires authenticated user;
2. verifies the user owns active access;
3. verifies `runtime_type = creator_endpoint`;
4. verifies runtime settings `enabled=true` and `run_enabled=true`;
5. verifies agent is approved;
6. verifies endpoint config and endpoint are approved;
7. signs the JSON payload server-side;
8. calls the endpoint with timeout;
9. stores the result in `agent_runs` and `agent_endpoint_runs`.

## Endpoint Contract

AgentHub sends:

```json
{
  "run_id": "uuid",
  "agent_version_id": "uuid",
  "locale": "fr",
  "input_text": "user input",
  "agent": {
    "id": "uuid",
    "name": "Agent name",
    "summary": "Agent summary"
  }
}
```

Headers:

```text
x-agenthub-timestamp: unix timestamp seconds
x-agenthub-signature: hex hmac sha256 over `${timestamp}.${body}`
```

The endpoint must return JSON:

```json
{
  "output_text": "Text result to show to the user"
}
```

## Security Rules

- HTTPS only.
- No localhost/private IP endpoints.
- No direct client calls.
- No service role exposure.
- No payment details in payload.
- No Stripe details in payload.
- Timeout: max 15s in beta.
- Response text capped at 12k characters.
- Creator cannot read private user run rows through RLS.

## Smoke Test

Enable only in local/internal beta:

1. set `CREATOR_ENDPOINT_RUNS_ENABLED=true`;
2. set `CREATOR_ENDPOINT_SIGNING_SECRET`;
3. set `agent_runtime_settings.creator_endpoint.enabled=true`;
4. set `agent_runtime_settings.creator_endpoint.run_enabled=true`;
5. allowlist a creator in `creator_runtime_access`;
6. create an approved endpoint row;
7. create an agent version with `runtime_type='creator_endpoint'` and `execution_mode='llm_prompt'`;
8. approve endpoint config;
9. rent the agent;
10. run from workspace;
11. verify `agent_runs` and `agent_endpoint_runs`.

## Known Limits

- One endpoint per agent version.
- Text input only.
- No files.
- No streaming.
- No retries.
- No public creator UI exposure by default.
- No autonomous external actions beyond the approved endpoint call.
