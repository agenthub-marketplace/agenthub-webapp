# AgentHub Agent Manifest V1

## Purpose

Agent Manifest V1 is the product-level description of an AgentHub publication.
It is not a new runtime by itself. It is the shared contract used by:

- creators to describe what they are publishing;
- admin reviewers to understand what must be validated;
- security precheck to triage risk before human review;
- workspace rendering to choose the right setup and execution blocks;
- revenue analytics to segment sales by agent type and infrastructure mode.

The current implementation already has the raw ingredients through
`agent_versions`, Agent Contract fields, `runtime_type`, workflow assets, creator
endpoints, document capability, security reviews, and revenue beta analytics.
Manifest V1 standardizes those pieces before adding more product surface.

## Product Categories

AgentHub should describe publications with two product categories.

```text
guided_assistant
advanced_agent
```

### `guided_assistant`

The current `llm_prompt` path. Product wording should stay honest:

- Assistant IA guide;
- Assistant texte;
- document-capable assistant when PDF/DOCX input is enabled.

This is useful, creator-visible by default, and does not require advanced
security review unless the declared data policy makes it sensitive.

### `advanced_agent`

The beta standard for "real agent" publications.

At least one of the following must be true:

- `runtime_type = workflow_automation`;
- `runtime_type = creator_endpoint`;
- future `code_package` or equivalent sandbox runtime.

Advanced agents require stricter validation:

- creator runtime allowlist;
- runtime setting enabled;
- asset approval;
- security review passed or waived;
- observable run history;
- clear user-facing workspace state.

Document input alone is useful, but it is not the minimum standard for an
advanced agent in beta.

## Manifest Shape

Manifest V1 can first be derived server-side from existing fields. A persisted
JSON column can come later if deriving becomes too fragile.

```json
{
  "manifest_version": 1,
  "publication_type": "guided_assistant",
  "runtime_type": "llm_prompt",
  "execution_mode": "llm_prompt",
  "infra_mode": "agenthub_hosted",
  "workspace_mode": "guided",
  "listing": {},
  "setup_schema": {},
  "input_schema": {},
  "output_schema": {},
  "workspace_blocks": [],
  "runtime_requirements": {},
  "data_policy": {},
  "security_profile": {},
  "pricing_profile": {}
}
```

## Required Fields

### Identity

```text
manifest_version
agent_id
agent_version_id
creator_id
publication_type
runtime_type
execution_mode
infra_mode
```

Rules:

- `runtime_type` remains the routing field.
- `execution_mode` remains compatibility detail for current runners.
- `infra_mode` decides whether AgentHub or creator infrastructure executes the
  specialized work.

Allowed `infra_mode` values:

```text
agenthub_hosted
creator_hosted
hybrid
```

### Listing

Derived from the public listing and Agent Contract:

```text
name
slug
category_id
category_label
short_description
detailed_description
target_user
capabilities
limitations
deliverables
output_promise
example_output
risk_level
```

This is what marketplace users evaluate before renting.

### Setup Schema

Describes what the user must prepare after activation.

```json
{
  "setup_type": "none | context | document | credentials | external_account",
  "items": ["Company context", "Target audience"],
  "required_before_run": true,
  "sensitive_data_warning": false
}
```

Examples:

- Assistant IA guide: context only.
- Agent document: document upload plus context.
- Agent API creator: context plus optional external account note.
- Future code/package: credentials or sandbox configuration may be required.

### Input Schema

V1 should stay simple and form-friendly.

```json
{
  "mode": "text | document | text_and_document",
  "fields": [
    {
      "key": "input_text",
      "label": "Votre besoin",
      "type": "textarea",
      "required": true,
      "max_chars": 4000
    }
  ],
  "file": {
    "enabled": false,
    "mime_types": [],
    "max_bytes": 3500000
  }
}
```

Future expansion can add select fields, credentials, OAuth, or structured
objects, but v1 should avoid a full form builder.

### Output Schema

The workspace needs to know what to display.

```json
{
  "format": "markdown",
  "primary_result_label": "Resultat genere",
  "sections": ["summary", "recommendations", "next_steps"],
  "max_output_chars": 12000,
  "store_in_agent_runs": true
}
```

All beta runtimes must store a user-visible final result in `agent_runs`.

### Workspace Blocks

The manifest selects blocks from the standard workspace block registry:

```text
access_status
agent_goal
setup_checklist
required_inputs
primary_runner
document_upload
extraction_status
workflow_progress
endpoint_status
run_status
result_viewer
run_history
deliverables
limitations
review_prompt
support_state
```

Detailed block rules live in `docs/workspace-dynamic-blocks.md`.

### Runtime Requirements

```json
{
  "requires_openai": true,
  "requires_document_extraction": false,
  "requires_workflow_worker": false,
  "requires_creator_endpoint": false,
  "requires_runtime_allowlist": false,
  "requires_asset_approval": false,
  "requires_security_review": false
}
```

Derived examples:

- `llm_prompt`: OpenAI required.
- document-capable assistant: OpenAI + document extraction required.
- `workflow_automation`: OpenAI/worker and possibly webhook approval required.
- `creator_endpoint`: endpoint approval and signing secret required.

### Data Policy

This should remain visible to creator/admin and summarized to users.

```json
{
  "stores_user_data": true,
  "requires_files": false,
  "external_tools": [],
  "creator_receives_user_input": false,
  "sensitive_data_allowed": false,
  "retention_days": null
}
```

For `creator_hosted`, `creator_receives_user_input = true` and the marketplace
listing should make that clear.

### Security Profile

```json
{
  "precheck_required": true,
  "precheck_status": "pending | running | passed | warning | failed | error | stale",
  "security_review_required": false,
  "security_review_status": "not_required | pending | in_review | passed | failed | waived",
  "risk_score": 0,
  "blocking_findings": [],
  "warnings": []
}
```

Security precheck is machine-assisted. Security review remains a human admin
decision for sensitive runtimes.

### Pricing Profile

```json
{
  "pricing_type": "task | project",
  "currency": "eur",
  "fixed_price_cents": 1200,
  "creator_share_basis_points": null,
  "platform_fee_basis_points": null,
  "payout_status": "not_enabled"
}
```

During beta, this remains GMV/sandbox oriented. Real payout fields should be
activated only after Stripe Connect and a revenue ledger exist.

## Derivation Rules

The initial manifest should be derived from current data:

- `agent_versions.runtime_type`;
- `agent_versions.execution_mode`;
- `agent_versions.workspace_mode`;
- `agent_versions.setup_requirements`;
- `agent_versions.output_promise`;
- `agent_versions.data_policy`;
- `agent_version_workflows` when `runtime_type = workflow_automation`;
- `agent_version_creator_endpoints` when `runtime_type = creator_endpoint`;
- `security_reviews` for sensitive assets;
- `agents` listing and pricing fields.

## Validation Rules

Manifest validation should fail closed.

```text
unknown runtime -> invalid
disabled runtime -> invalid for approval
advanced runtime without allowlist -> invalid submission
advanced runtime without asset approval -> cannot approve
advanced runtime without security review passed/waived -> cannot approve
creator_hosted without approved endpoint -> cannot approve
```

## Implementation Path

1. Add a server-only `buildAgentManifest(agentVersionId)` helper that derives
   Manifest V1 from current tables.
2. Use it in admin review first, read-only.
3. Use it in workspace page rendering to select block groups.
4. Feed it into the Security Precheck Agent.
5. Persist a snapshot only if derivation becomes expensive or needs audit
   history.

## Non-Goals For V1

- No new public runtime.
- No full workflow builder.
- No creator code execution.
- No payout activation.
- No direct client access to creator endpoints or private files.
- No automatic admin approval from machine output.
