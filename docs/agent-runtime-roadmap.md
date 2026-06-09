# AgentHub Code Runtime Roadmap

## Current Runtime Model

AgentHub now separates two concepts:

- `runtime_type`: product-level routing for AgentHub Code runtime families.
- `execution_mode`: compatibility/internal execution detail used by the existing workspace runner.

Product-facing publication types should be explicit. A simple `llm_prompt` run is now presented as **Assistant IA guidé**, not as a full advanced agent.

The beta progression is:

```text
Assistant IA guidé
-> Agent document
-> Agent workflow
-> Agent API
-> later: sandboxed code/package agent
```

`runtime_type` remains the internal routing field. `execution_mode` stays in place so the current assistant runner does not break. `document_file` is retained as a compatibility/feature-flag value for the document input capability.

## Real Agent Beta Templates

For the closed beta, the first templates that should be presented as advanced agents are:

- Support Triage Agent (`workflow_automation`): classifies a support request, decides priority/category, then produces a customer reply and internal checklist.
- Lead Qualification Agent (`workflow_automation`): decides lead qualification, score, and next commercial action before drafting follow-up.
- CRM Enrichment API Agent (`creator_endpoint`): normalizes a CRM enrichment request, decides if the API call is relevant, then calls an approved creator endpoint server-side.

These templates are creator-visible only when the creator is allowlisted for the matching runtime. They still require admin review, asset approval, and security review before publication.

## Active Runtime

### `llm_prompt`

Status: active for closed beta.

This is the default creator-visible Assistant IA guidé runtime for now.

Current guardrails:

- text input only;
- document input may be enabled as a controlled capability when the agent contract requires a document;
- OpenAI call happens server-side;
- no public upload;
- no external tools;
- no creator code;
- no creator endpoint call;
- output stored in `agent_runs`;
- user must own an active access;
- agent/access must be eligible;
- runtime setting must be enabled and run-enabled.

## Compatibility Runtime

### `static_guided`

Status: enabled, not executable.

This represents legacy/static guided workspace agents. They can be reviewed if enabled, but they do not run code or LLM actions.

## Future Runtimes

The following runtime families are prepared in schema and settings, but disabled. They must not be creator-visible or executable until a dedicated implementation phase.

### Agent document (`document_file` compatibility)

Status: beta foundation, disabled by default.

Document input is a useful intermediate capability, but it is not the minimum standard for a beta “agent avancé”. The `document_file` value remains in schema/settings as a compatibility and feature-flag layer for controlled internal smoke tests after local migration/RLS verification.

Beta limits:

- PDF/DOCX only;
- text extraction only;
- no OCR;
- one file per run;
- maximum upload size is 3.5 MB through the Next.js API route because Vercel Functions have a 4.5 MB request/response payload limit;
- larger files require a future direct-to-Supabase Storage signed upload flow plus separate server extraction;
- private bucket only;
- no public URL;
- no client-side parsing;
- no external tools;
- no n8n;
- no creator endpoint;
- no sensitive real documents during beta.

Storage model:

- bucket: `agent-documents`;
- bucket is private;
- original file is stored temporarily for 7 days by default;
- extracted text is stored in `agent_run_files` and linked to `agent_runs`;
- `storage_path` and `extracted_text` are not granted to normal authenticated clients.

Implemented beta guardrails:

- private Supabase Storage bucket;
- no public files;
- server-side upload authorization;
- server-side text extraction;
- MIME allowlist;
- file size limits;
- antivirus or content scanning if needed;
- extracted text snapshot stored for the run;
- user-scoped access and RLS;
- no direct client access to private files.

Not implemented now:

- OCR;
- multi-file upload;
- direct-to-storage large file upload;
- background extraction jobs;
- separate creator-visible document runtime;
- external document tools.

### Agent workflow (`workflow_automation`)

Status: beta foundation, disabled by default.

This runtime is for short, reviewed workflow chains. It is more powerful than `llm_prompt`, so it stays behind three gates: creator allowlist, runtime setting, and environment flag.

Beta model:

- creator must be allowlisted in `creator_runtime_access`;
- workflow definition is stored in `agent_version_workflows`;
- execution is queued in `agent_workflow_runs`;
- step trace is stored in `agent_workflow_steps`;
- worker runs in Supabase Edge Function `agent-workflow-worker`;
- states: `queued`, `running`, `succeeded`, `failed`, `cancelled`;
- steps are linear only;
- supported step types: `llm_step`, `webhook_step`;
- webhook endpoints must be reviewed in `creator_webhook_endpoints`;
- webhook calls are signed by AgentHub with HMAC headers.

Beta limits:

- 2 to 5 steps;
- max 2 webhook steps;
- no branching, loops, fan-out, or retries beyond manual relaunch;
- no n8n;
- no arbitrary creator code;
- no browser-side webhook call;
- no secrets in client payloads;
- short timeout per webhook step.

Not implemented now:

- full execution gateway;
- unreviewed external tools;
- long-running job orchestration;
- background retry queues;
- creator endpoint runtime.

### Agent API (`creator_endpoint`)

Status: beta foundation, disabled by default.

This runtime lets AgentHub call one reviewed creator-owned HTTPS endpoint through a server-side proxy. It is not creator-visible by default and is only for controlled internal beta agents.

Beta model:

- creator must be allowlisted in `creator_runtime_access`;
- creator endpoint URLs are stored in `creator_api_endpoints`;
- one endpoint config is linked to an agent version through `agent_version_creator_endpoints`;
- runs are traced in `agent_endpoint_runs` and linked to `agent_runs`;
- calls happen from `POST /api/agent-runs/endpoint`;
- payload is signed with HMAC headers;
- endpoint must return JSON with `output_text`.

Beta limits:

- text input only;
- one endpoint per agent version;
- HTTPS only;
- no localhost/private IP endpoints;
- no direct browser calls;
- no files;
- no streaming;
- timeout capped at 15s;
- response capped at 12k characters;
- no payment or secret data in endpoint payload.

Not implemented now:

- creator-provided secrets;
- retry queue;
- public creator UI exposure;
- autonomous external action framework.

## Runtime Settings

Runtime availability is controlled by `agent_runtime_settings`:

- `enabled`: runtime can be approved by admin.
- `creator_visible`: runtime can be selected by creators.
- `run_enabled`: runtime can execute.

Closed beta settings:

- `static_guided`: enabled, not creator-visible, not run-enabled.
- `llm_prompt`: enabled, creator-visible, run-enabled as Assistant IA guidé.
- `document_file`: disabled, used only as the document input capability gate.
- `workflow_automation`: disabled unless explicitly enabled for beta.
- `creator_endpoint`: disabled unless explicitly enabled for beta.

Normal users and creators should not read this table directly. Server code may read it through admin/server paths or the service role where appropriate.

## Approval Rules

Admin approval must fail closed:

- unknown runtime: blocked;
- disabled runtime: blocked;
- future runtime while disabled: blocked;
- `llm_prompt`: allowed only when enabled;
- `static_guided`: allowed only when enabled, but it remains non-executable.

## Runner Rules

Assistant IA guidé text runs execute only when:

- `runtime_type = 'llm_prompt'`;
- `execution_mode = 'llm_prompt'`;
- runtime setting has `enabled = true`;
- runtime setting has `run_enabled = true`;
- access is active/open;
- user owns the access;
- agent is approved or the access is tied to an approved version;
- no file is required;
- no external tool is declared.

Agent document runs execute only when the publication is `llm_prompt` with document-required contract data, or a legacy/internal `document_file` publication, and the document input capability is enabled.

All unrelated runtime types must refuse cleanly.
