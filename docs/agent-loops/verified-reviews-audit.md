# Verified Reviews Audit

## Task

Name: Verified reviews audit

Owner: Local Codex loop

Date: 2026-06-10

## Objective

Audit verified review eligibility and visibility so the beta keeps trustworthy reviews. Prefer a report or documentation-only output unless a small P0/P1 defect is obvious.

## Allowed Scope

- Read `AGENTS.md`.
- Read review-related docs and source files.
- Read access/workspace files only as needed to understand eligibility.
- Edit documentation under `docs/agent-loops/`.

## Forbidden Scope

- Do not change review schema, RLS, migrations, seed data, or production data.
- Do not weaken verified-review eligibility.
- Do not allow unverified public reviews.
- Do not add dependencies.
- Do not commit, push, deploy, or run package installation.

## Loop Or State Machine Fit

Use a loop for this audit.

Model review eligibility as a state machine:

```text
not_eligible -> eligible_after_active_access -> submitted -> visible
```

Moderation or invalid states should be explicit:

```text
hidden
rejected
duplicate_blocked
access_missing
```

## Acceptance Criteria

- [ ] Identify review eligibility checks.
- [ ] Confirm reviews depend on active or valid prior access.
- [ ] Confirm public visibility does not include unverified reviews.
- [ ] Run the configured validation command.
- [ ] Show `git status --short` at the end.

## Validation

```bash
npm run agent:validate
```
