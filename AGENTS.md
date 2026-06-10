<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AgentHub Agent Rules

These rules apply to all agentic development work in this repository.

## Product Invariants

- Preserve the `user`, `creator`, and `admin` journeys.
- Preserve marketplace discovery, agent activation/access, workspace execution, and verified reviews.
- Treat the workspace as the core product experience.
- Keep the closed-beta flow intact: creator submission -> admin review -> approved marketplace listing -> Stripe sandbox checkout -> active access -> workspace run -> stored run history -> verified review.
- Do not change product behavior unless the task explicitly asks for it.

## Security And Data Boundaries

- Do not modify RLS policies, Supabase migrations, Edge Functions, database schema, or seed data unless the task explicitly asks for database work.
- Do not expose service-role keys or privileged secrets to frontend/client code.
- OpenAI, Supabase privileged operations, Stripe secrets, and webhook secrets must stay server-side.
- Do not commit `.env*` files or generated secrets.
- Prefer read-only SQL for diagnostics. Never run destructive SQL from an agent loop.

## Development Scope

- Keep changes tightly scoped to the task file.
- Do not add dependencies unless the task explicitly allows it.
- Do not perform broad refactors, formatting sweeps, renames, or framework migrations.
- Do not touch existing feature files for local agent-loop setup tasks unless required to preserve repo scripts.
- Preserve existing Next.js App Router conventions and read the relevant local Next.js docs under `node_modules/next/dist/docs/` before editing Next.js code.

## Git And Deployment

- Never commit, push, deploy, or publish from an agent loop.
- Never run `git reset --hard`, destructive checkout, branch deletion, or history rewrite unless the human explicitly asks for it.
- Always show `git status --short` at the end of local agent-loop work.

## Validation

- Prefer the existing validation order when relevant:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run build`
- If a validation step is unavailable or fails for pre-existing reasons, report it clearly with the exact command.
- Do not mask failing validation by changing unrelated product code.

## Agent Loop Guidance

- Use bounded Codex loops for local development tasks that can be validated by deterministic commands.
- Treat `VALIDATE_CMD` as the independent verifier/rubric for the loop; do not rely on self-critique alone.
- Stop loops on repeated failure, no-progress, or unclear scope instead of spending more iterations.
- Prefer reusable task templates and skills over one-off prompt improvisation.
- Use explicit state machines for long-running, user-visible, or multi-party product workflows such as agent submission review, activation/access, workspace execution lifecycle, payouts, support, and verified reviews.
- A loop may run inside a state, but product state transitions must be explicit, observable, and guarded.
