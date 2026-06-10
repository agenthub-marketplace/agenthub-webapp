# Agent Loop Task Template

Use this template for local Codex agent-loop tasks. Keep tasks narrow, reversible, and validated by commands. Do not use this format to request production deploys, database changes, RLS changes, or broad product refactors.

## Task

Name:

Owner:

Date:

## Objective

Describe the smallest useful outcome.

## Allowed Scope

- Files or folders the loop may edit:
- Files or folders the loop may read:
- Commands the loop may run:

## Forbidden Scope

- No commits, pushes, deploys, package installs, or dependency changes.
- No database schema, migration, RLS, seed, or production data changes.
- No changes to user, creator, admin, marketplace, activation/access, workspace, or verified review behavior unless explicitly listed in Allowed Scope.
- No secrets in frontend code, logs, docs, or commits.

## Context

Relevant docs:

- `AGENTS.md`
- `docs/AGENTHUB_CURRENT_STATE.md`

Relevant product invariants:

- Preserve user, creator, and admin journeys.
- Preserve marketplace, activation/access, workspace, and verified reviews.

## Loop Or State Machine Fit

Use a bounded loop when the task is local, deterministic, and has a clear validation command.

Use a state machine when the task models product lifecycle, external side effects, human approval, retries, billing, access, or long-running background work.

For AgentHub, product workflows should generally be state machines. Local code-maintenance tasks can use loops.

## Rubric And Feedback

The loop must have external feedback. Prefer a deterministic validation command or a small rubric file with checkable criteria. Do not rely on the same agent's self-critique as the only judge.

Recommended loop shape:

1. Read this task and `AGENTS.md`.
2. Make the smallest scoped change.
3. Run `VALIDATE_CMD`.
4. If validation fails, repair based on the output.
5. Stop when validation passes, `MAX_ITERS` is reached, or the workspace stops changing.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Validation command passes or the failure is documented.
- [ ] `git status --short` is shown at the end.

## Validation

Default command:

```bash
npm run agent:validate
```

Override example:

```bash
VALIDATE_CMD="npm run lint" MAX_ITERS=2 npm run agent:loop -- docs/agent-loops/TEMPLATE.md
```

## Notes For Codex

- Read `AGENTS.md` before editing.
- Keep each iteration focused.
- Stop when validation passes or `MAX_ITERS` is reached.
- Stop early when validation fails but no progress is being made.
- Report changed files, commands run, and remaining limits.
