# Document/File Runtime Beta

## Summary

`document_file` is a controlled beta runtime for single-document PDF/DOCX analysis. It is not a full execution gateway.

Included:

- PDF text extraction;
- DOCX raw text extraction;
- private Supabase Storage;
- one file per run;
- server-side extraction only;
- LLM result stored in `agent_runs`;
- file metadata stored in `agent_run_files`.

Excluded:

- OCR;
- multi-file upload;
- client-side parsing;
- public files;
- direct client storage access;
- n8n;
- external tools;
- creator endpoints.

## Environment

```env
DOCUMENT_RUNS_ENABLED=false
DOCUMENT_MAX_FILE_BYTES=3500000
DOCUMENT_MAX_EXTRACTED_CHARS=30000
DOCUMENT_FILE_RETENTION_DAYS=7
DOCUMENT_ALLOWED_MIME_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

`DOCUMENT_RUNS_ENABLED=false` is the default. Enable only for internal beta tests after migration and RLS checks pass.

## Limits

- Max file size: 3.5 MB.
- Reason: Vercel Functions have a 4.5 MB request/response payload limit.
- Larger files require a future direct-to-Supabase Storage signed upload flow and separate server extraction.
- PDF must contain extractable text. Scanned/image-only PDFs return `no_extractable_text`.
- DOCX extraction uses raw text only and ignores formatting.

## Storage Model

- Bucket: `agent-documents`.
- Bucket visibility: private.
- Upload path: `user_id/rental_request_id/{uuid}-{safe-filename}`.
- No public URL is generated.
- No signed read URL is returned to the browser.
- Original files expire after 7 days by default. Cleanup automation is a later task.

## RLS Model

`agent_run_files`:

- anon: no access;
- authenticated user: select only own safe metadata;
- authenticated user: no insert/update/delete;
- creator: no private user file visibility unless they are the owner;
- admin: safe metadata read via `public.is_admin()`;
- service role: route-only insert/update/delete.

Normal clients are not granted `storage_path` or `extracted_text`.

## Runtime Rules

Document upload and document runs require:

- authenticated user;
- active access owned by the user;
- `runtime_type = 'document_file'`;
- `execution_mode = 'llm_prompt'`;
- runtime setting `enabled = true`;
- runtime setting `run_enabled = true`;
- approved agent;
- no external tools.

`document_file` remains disabled by default in `agent_runtime_settings`.

## Smoke Test

1. Apply migrations locally with `npx supabase db reset`.
2. Enable `DOCUMENT_RUNS_ENABLED=true` locally.
3. Enable `document_file` runtime locally in `agent_runtime_settings`.
4. Create an internal test agent version with `runtime_type = 'document_file'` and `execution_mode = 'llm_prompt'`.
5. Rent the agent with a test user.
6. Upload a small DOCX.
7. Run a document action.
8. Confirm `agent_runs` stores the output.
9. Confirm `agent_run_files.agent_run_id` links to the run.
10. Repeat with a text PDF.
11. Confirm a scanned/empty PDF fails with `no_extractable_text`.

## Future V1

- Direct-to-storage upload for larger files.
- Background extraction job.
- OCR as an explicit paid/controlled capability.
- File cleanup job.
- Admin diagnostics for failed extraction.
- More granular document retention controls.
