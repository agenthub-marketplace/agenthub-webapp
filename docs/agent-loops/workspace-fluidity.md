# Workspace Fluidity Agent Loop

## Task

Name: Workspace fluidity review

Owner: Local Codex loop

Date: 2026-06-10

## Objective

Improve developer understanding of workspace friction without changing product behavior. The first pass should inspect the workspace flow and produce a concise report or small documentation-only improvement.

## Allowed Scope

- Read `AGENTS.md`.
- Read `docs/AGENTHUB_CURRENT_STATE.md`.
- Read workspace-related docs and source files.
- Edit documentation under `docs/agent-loops/` if the improvement is documentation-only.

## Forbidden Scope

- Do not change runtime workspace features.
- Do not change marketplace, activation/access, payments, reviews, creator submission, or admin review behavior.
- Do not modify Supabase schema, migrations, RLS, Edge Functions, or data.
- Do not add dependencies.
- Do not commit, push, deploy, or run package installation.

## Context

AgentHub's current beta flow depends on a smooth path from paid or beta access into `/workspace`, LLM workspace actions, stored `agent_runs`, and verified reviews. The frontend is frozen except for P0/P1 fixes, so this task is intentionally scoped to local analysis and documentation.

The loop-engineering sources point to a practical split:

- Bounded loops are useful for local development work where an agent can iterate against validation commands.
- State machines are better for observable product lifecycles with controlled transitions.
- A loop needs feedback: a verifier, rubric, tests, or logs. Without it, repeated agent calls compound mistakes and cost.
- Reusable task templates and skills matter more than clever one-off prompts.

For this task, use a loop. For future workspace execution lifecycle changes, model the product flow as a state machine.

## Acceptance Criteria

- [ ] Identify any workspace developer-friction observations without modifying product behavior.
- [ ] If editing, limit changes to `docs/agent-loops/`.
- [ ] Run the configured validation command.
- [ ] Show `git status --short` at the end.

## Validation

```bash
npm run agent:validate
```

## Notes For Codex

- This is a safe first example for the local loop runner.
- Prefer reporting observations over changing source code.
- If a real P0/P1 product issue is found, stop and report it instead of fixing it inside this loop.
