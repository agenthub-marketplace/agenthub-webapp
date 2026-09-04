# Creator Submission Guardrails

## Task

Name: Creator submission guardrails

Owner: Local Codex loop

Date: 2026-06-10

## Objective

Audit creator submission guardrails for closed beta readiness. Focus on preserving quality control before marketplace publication.

## Allowed Scope

- Read `AGENTS.md`.
- Read creator submission docs and source files.
- Read admin review files only as needed.
- Edit documentation under `docs/agent-loops/`.

## Forbidden Scope

- Do not change creator forms, runtime configuration, review outcomes, schema, migrations, RLS, or data.
- Do not loosen validation or quality gates.
- Do not add dependencies.
- Do not commit, push, deploy, or run package installation.

## Loop Or State Machine Fit

Use a loop for the audit.

Creator submission is part of the review state machine:

```text
draft -> submitted -> under_review -> changes_requested | approved | rejected
```

Publication should remain admin-controlled.

## Acceptance Criteria

- [ ] Identify creator submission entry points.
- [ ] Identify validation and required fields.
- [ ] Confirm admin approval remains required before marketplace visibility.
- [ ] Report gaps without broad refactoring.
- [ ] Run the configured validation command.
- [ ] Show `git status --short` at the end.

## Validation

```bash
npm run agent:validate
```
