# Workspace Dynamic Blocks

## Purpose

AgentHub workspace should adapt to the publication being used. The user should
not feel the runtime complexity. They should see the right setup, input,
execution, result, history, and review flow for the agent they rented.

Today the workspace already supports guided assistant, document input,
workflow automation, and creator endpoint paths. Dynamic Blocks V1 standardizes
the building blocks so future agents do not require bespoke workspace pages.

## Product Principle

```text
User buys an outcome.
Workspace guides setup.
Runtime executes safely.
History and review stay consistent.
```

The workspace should answer four questions immediately:

1. What did I activate?
2. What do I need to prepare?
3. How do I run it?
4. Where is the result/history?

Before rental, the marketplace and agent detail pages should expose the same
runtime family in user-facing language:

```text
Assistant IA guidé
Agent document
Agent workflow
Agent API
Workspace guidé
```

This avoids selling every listing as a generic "agent" while the setup and
workspace behavior differ. The public label is advisory for discovery only; API
routes and workspace contracts remain the execution source of truth.

## Standard Block Registry

### `access_status`

Purpose: show whether the user can run the agent right now.

Content:

- access status;
- stopped/suspended/blocked/runtime disabled states;
- recovery action when available;
- link to public listing.

Used by all workspaces. If this block is blocked, it appears before any run UI.

### `agent_goal`

Purpose: show what the user activated and what outcome the agent promises.

Content:

- agent name;
- runtime/product type;
- short promise;
- price paid or credits display;
- primary deliverable summary.

Used by all workspaces.

### `setup_checklist`

Purpose: guide the user before the first run.

Content:

- setup items from Agent Manifest;
- whether setup is optional or required;
- sensitive-data warning when relevant;
- beta limits such as no OCR or endpoint timeout.

Used by:

- guided assistant with context;
- document-capable assistant;
- workflow automation;
- creator endpoint.

### `required_inputs`

Purpose: make the expected input format explicit.

Content:

- input field labels;
- examples;
- max characters;
- required/optional fields.

V1 can remain text-first. It does not need a full form builder yet.

### `primary_runner`

Purpose: show the main action panel for this runtime.

Content:

- textarea;
- document picker/upload when relevant;
- character count;
- action selector when there are several actions;
- launch button copy matched to runtime;
- disabled/loading/error states.

Used by:

- `llm_prompt`;
- document-capable assistant after extraction;
- `workflow_automation`;
- `creator_endpoint`.

### `document_upload`

Purpose: collect one private document for document-capable agents.

Content:

- accepted formats PDF/DOCX;
- max size 3.5 MB for API upload;
- no OCR warning;
- no sensitive real docs warning during beta;
- upload button.

Used by document-capable assistant or internal `document_file` compatibility.

### `extraction_status`

Purpose: make server-side file extraction understandable.

States:

```text
uploading
extracting
extracted
failed
```

User copy should distinguish:

- unsupported file;
- too large;
- no extractable text;
- runtime disabled;
- access not active.

### `workflow_progress`

Purpose: show an advanced workflow run is progressing.

States:

```text
queued
running
succeeded
failed
cancelled
```

Content:

- current status;
- current/last step label if available;
- final result when complete;
- readable error code on failure.

Used by `workflow_automation`.

### `run_status`

Purpose: show the current execution lifecycle in a runtime-agnostic way.

It can wrap or summarize runtime-specific status blocks:

- `extraction_status`;
- `workflow_progress`;
- `endpoint_status`;
- LLM generation pending/succeeded/failed.

The workspace should never leave the user with only a spinner and no state.

### `next_actions`

Purpose: turn the runtime state into concrete user guidance.

Content:

- 2 to 3 ordered actions derived from `workspaceRecipe.nextActions`;
- runtime-specific language for assistant, document, workflow, or creator API;
- a single unblock action when execution is disabled;
- no secrets, endpoint URLs, internal asset ids, or private payload details.

Examples:

- assistant: describe need -> generate response -> retrieve result in history;
- document: upload text PDF/DOCX -> verify extraction -> run document action;
- workflow: provide context -> launch workflow -> review final result and steps;
- creator endpoint: acknowledge creator-hosted boundary -> send request -> handle
  endpoint unavailability.

This block belongs in the global workspace readiness summary first. Runners can
later consume the same list to highlight the next clickable control.

### `endpoint_status`

Purpose: show that AgentHub is calling creator infrastructure server-side.

Content:

- endpoint approved/available state when safe to show;
- "called by AgentHub server" explanation;
- timeout/failure message;
- no direct URL exposure unless intentionally visible to the user.

States:

```text
ready
running
succeeded
failed
endpoint_unavailable
runtime_disabled
```

Used by `creator_endpoint`.

### `result_viewer`

Purpose: show the final answer/output.

Content:

- Markdown output;
- copy result action;
- timestamp;
- runtime label;
- file name or workflow summary when relevant.

All beta runtimes should end here.

### `deliverables`

Purpose: remind the user what output they should expect.

Content:

- expected sections;
- file/result format;
- what is not included;
- quality caveats if the runtime is beta.

### `limitations`

Purpose: keep risk and capability boundaries visible.

Content:

- no OCR;
- no web scraping;
- no regulated final advice;
- creator-hosted data disclosure;
- beta runtime limits.

### `run_history`

Purpose: let the user retrieve previous work.

Content:

- latest runs;
- status;
- action label;
- created/completed time;
- "view full result" interaction;
- future "view all" link when more than five runs exist.

History must stay scoped to the owning user/access.

### `review_prompt`

Purpose: convert a valid access into a verified review.

Rules:

- show only when reviewable;
- prevent duplicate review;
- explain if review is already submitted;
- keep the current product decision on whether access alone is enough or a
  successful run is required.

### `support_state`

Purpose: explain blocked or non-runnable states.

Examples:

- access stopped;
- agent suspended;
- activation blocked;
- payment paid but access missing;
- runtime disabled;
- endpoint not approved;
- workflow not approved;
- OpenAI unavailable.

This block should use precise copy for beta debugging without exposing secrets.

Current implementation:

- `workspaceRecipe.blocks` emits `support_state` in the `use` tab when a
  runtime blocker, trust warning, or creator-infra disclosure should be seen
  before execution;
- the block is required only when execution is actually blocked;
- it stays hidden when no support signal is active.

## Runtime Block Recipes

### Assistant IA guide (`llm_prompt`)

```text
access_status
agent_goal
setup_checklist
required_inputs
primary_runner
run_status
result_viewer
run_history
deliverables
limitations
review_prompt
support_state
```

### Document-capable assistant

```text
access_status
agent_goal
setup_checklist
document_upload
extraction_status
primary_runner
run_status
result_viewer
run_history
deliverables
limitations
review_prompt
support_state
```

### Agent workflow (`workflow_automation`)

```text
access_status
agent_goal
setup_checklist
required_inputs
primary_runner
workflow_progress
run_status
result_viewer
run_history
deliverables
limitations
review_prompt
support_state
```

### Agent API (`creator_endpoint`)

```text
access_status
agent_goal
setup_checklist
required_inputs
primary_runner
endpoint_status
run_status
result_viewer
run_history
deliverables
limitations
review_prompt
support_state
```

### Future code/package agent

```text
access_status
agent_goal
setup_checklist
required_inputs
primary_runner
sandbox_status
execution_logs_filtered
run_status
result_viewer
run_history
deliverables
limitations
review_prompt
support_state
```

Not implemented now.

## Ordering Rules

Recommended visual order:

1. `access_status`
2. `agent_goal`
3. `setup_checklist`
4. `required_inputs`
5. `primary_runner`
6. `run_status`
7. `result_viewer`
8. `run_history`
9. `deliverables`
10. `limitations`
11. `review_prompt`
12. `support_state` when needed

If an access is blocked or invalid, `support_state` should appear before the
normal execution block.

## Disabled State Copy

Use specific messages. Avoid one generic "runtime disabled" message for every
case.

Examples:

```text
Le runtime workflow n'est pas active pour cette beta.
Le workflow de cet agent n'a pas encore ete approuve.
L'endpoint creator n'a pas encore ete approuve.
L'endpoint creator n'a pas repondu dans le delai beta.
La generation IA est indisponible: configuration serveur manquante.
Cet acces est arrete. Relouez l'agent pour le relancer.
```

The UI should not expose:

- OpenAI keys;
- service role;
- endpoint signing secret;
- full private payloads;
- raw stack traces.

## Implementation Path

### V0: Documentation And Diagnostics

- Keep current workspace components.
- Use this registry to name the blocks and identify gaps.
- Improve copy and state ordering in small patches.

### V1: Shared Block Components

Create shared components:

```text
WorkspaceAgentSummary
WorkspaceAccessStatus
WorkspaceAgentGoal
WorkspaceSetupChecklist
WorkspaceTextInput
WorkspacePrimaryRunner
WorkspaceDocumentUpload
WorkspaceWorkflowProgress
WorkspaceEndpointStatus
WorkspaceRunStatus
WorkspaceResultViewer
WorkspaceRunHistory
WorkspaceDeliverables
WorkspaceLimitations
WorkspaceReviewPrompt
WorkspaceSupportState
```

### Current V1: Workspace Manifest Helper

The first manifest-driven step is implemented without a migration:

```text
src/server/agents/workspace-manifest.ts
```

It derives a `WorkspaceManifestV1` from:

- agent data already loaded for the active access;
- Agent Contract;
- runtime type;
- document input mode;
- locale.

Current manifest fields:

```text
version
runtime kind
infra mode
tabs
setup title/description/required inputs/warnings
runner title/description/primary action
history labels
trust disclosures
```

`/agenthub/workspace/[rentalId]` and `/en/workspace/[rentalId]` pass this
manifest to `WorkspaceAgentExperience`. The component still keeps the previous
labels and layout as fallback when no manifest is provided.

Runtime-specific behavior now starts at the manifest level:

- assistant: standard setup/use/details/review flow;
- document: document/analysis wording and no-OCR/data warnings;
- workflow: workflow tab wording and worker/progress warnings;
- creator endpoint: API agent wording and creator-infra disclosure.

### V2: Manifest-Driven Rendering

Add a server helper:

```text
buildWorkspaceRecipe(agentManifest, accessState)
```

It returns:

```json
{
  "blocks": [],
  "disabled_reason": null,
  "runtime_panel": "llm | document | workflow | endpoint"
}
```

The workspace page renders blocks from this recipe rather than manually
branching across every runtime.

## Current Gaps To Track

From the workspace fluidity audit:

- French workspace has the strongest internal navigation; English workspace is
  less aligned.
- Activation/bloque states can appear below an empty active-access state.
- Runtime disabled messages are too generic.
- Creator endpoint runs need polling or a status read path similar to workflow.
- Recent history is limited to five runs without a full history view.

These are P2 beta improvements unless a specific user journey becomes blocked.

## Non-Goals

- No node editor.
- No n8n.
- No public file URLs.
- No direct browser calls to creator endpoints.
- No full form builder.
- No runtime/schema migration implied by this document alone.
