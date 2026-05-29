# AgentHub Code Runtime Roadmap

## Current Runtime Model

AgentHub now separates two concepts:

- `runtime_type`: product-level routing for AgentHub Code runtime families.
- `execution_mode`: compatibility/internal execution detail used by the existing workspace runner.

`runtime_type` is the main field for deciding which runtime family an agent belongs to. `execution_mode` stays in place so the current LLM Runner v0 does not break.

## Active Runtime

### `llm_prompt`

Status: active for closed beta.

This is the only creator-visible and executable runtime for now.

Current guardrails:

- text input only;
- OpenAI call happens server-side;
- no upload;
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

### `document_file`

Status: beta foundation, disabled by default.

This runtime is for PDF/DOCX document agents. It is not creator-visible by default and must only be enabled for controlled internal smoke tests after local migration/RLS verification.

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
- creator-visible document agents;
- external document tools.

### `workflow_automation`

Future internal workflow automation runtime.

Expected future model:

- `agent_workflow_runs` table;
- states: `queued`, `running`, `succeeded`, `failed`;
- internal allowlisted actions first;
- strict timeout and retry limits;
- kill switch admin-side;
- audit logs for each action.

Not implemented now:

- n8n;
- external workflows;
- external actions;
- long-running job queue;
- autonomous workflow execution.

### `creator_endpoint`

Future creator API endpoint runtime.

Expected future model:

- `creator_endpoints` table;
- creator endpoint URLs validated and reviewed;
- secrets stored server-side only;
- AgentHub server proxy required;
- HMAC signing;
- timeout limits;
- retry limits;
- response size limits;
- admin kill switch;
- never called directly from the browser.

Not implemented now:

- creator endpoint calls;
- creator-provided secrets;
- endpoint proxying;
- endpoint retry queue.

## Runtime Settings

Runtime availability is controlled by `agent_runtime_settings`:

- `enabled`: runtime can be approved by admin.
- `creator_visible`: runtime can be selected by creators.
- `run_enabled`: runtime can execute.

Closed beta settings:

- `static_guided`: enabled, not creator-visible, not run-enabled.
- `llm_prompt`: enabled, creator-visible, run-enabled.
- `document_file`: disabled.
- `workflow_automation`: disabled.
- `creator_endpoint`: disabled.

Normal users and creators should not read this table directly. Server code may read it through admin/server paths or the service role where appropriate.

## Approval Rules

Admin approval must fail closed:

- unknown runtime: blocked;
- disabled runtime: blocked;
- future runtime while disabled: blocked;
- `llm_prompt`: allowed only when enabled;
- `static_guided`: allowed only when enabled, but it remains non-executable.

## Runner Rules

LLM Runner v0 executes only when:

- `runtime_type = 'llm_prompt'`;
- `execution_mode = 'llm_prompt'`;
- runtime setting has `enabled = true`;
- runtime setting has `run_enabled = true`;
- access is active/open;
- user owns the access;
- agent is approved or the access is tied to an approved version;
- no file is required;
- no external tool is declared.

All other runtime types must refuse cleanly.
