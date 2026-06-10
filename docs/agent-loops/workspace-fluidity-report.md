# Workspace Fluidity Review Report

Date: 2026-06-10

## Scope

This pass inspected the workspace flow without changing product behavior. It read the current state doc, the workspace loop task, the loop runner docs, workspace routes, workspace action components, run endpoints, rental access loading, and verified review submission.

No P0/P1 runtime defect was fixed in this pass.

## Flow Map

- Workspace entry redirects:
  - `src/app/workspace/page.js` redirects to `/agenthub/workspace`.
  - `src/app/workspace/[rentalId]/page.js` redirects to `/agenthub/workspace/[rentalId]`.
  - `src/app/en/workspace/*` stays on the English workspace route.
- Workspace list:
  - `src/app/agenthub/workspace/page.js`
  - `src/app/en/workspace/page.js`
  - Both load `getUserRentals()` and `getUserPaymentOrders()`.
- Workspace detail:
  - `src/app/agenthub/workspace/[rentalId]/page.js`
  - `src/app/en/workspace/[rentalId]/page.js`
  - Both gate access through `getUserRentalById()`, `rental.accessOpen`, runtime flags, agent status, and server env.
- Workspace runners:
  - `WorkspaceRunActions.jsx` -> `POST /api/agent-runs`
  - `DocumentWorkspaceActions.jsx` -> `POST /api/agent-documents/upload`, then `POST /api/agent-runs/document`
  - `WorkflowWorkspaceActions.jsx` -> `POST /api/agent-runs/workflow`, then polling
  - `CreatorEndpointWorkspaceActions.jsx` -> `POST /api/agent-runs/endpoint`
- Run history:
  - `getUserAgentRuns()` reads latest `agent_runs` and joins linked `agent_run_files`.
- Verified review:
  - Workspace forms call `submitRentalReviewAction()`.
  - The action validates access ownership, reviewable status, one-review uniqueness, and self-review guardrails.

## Developer-Friction Observations

1. Workspace detail behavior is split between FR and EN implementations.

   The French route now delegates the main experience to `WorkspaceAgentExperience` and supports URL tabs (`overview`, `setup`, `use`, `details`, `review`). The English route still renders an older one-page layout inline. The runner gate logic is mostly duplicated across both routes. This makes future workspace changes harder to audit because a fix can land in one locale and silently miss the other.

2. Runtime eligibility logic is repeated across page and endpoint boundaries.

   The detail pages compute runner enablement from env flags, runtime settings, contract fields, agent status, and data policy. Each API endpoint then revalidates its own variant of the same eligibility. The duplication is defensible for server-side security, but developers need a single diagnostic checklist before changing workspace behavior.

3. User-facing disabled states intentionally hide exact backend failure reasons.

   The runner components show broad messages such as runtime disabled or generation unavailable, while endpoints emit precise codes like `agent-runtime-disabled`, `agent-requires-unsupported-inputs`, `run-already-in-progress`, and quota errors. This is acceptable for beta UX, but debugging requires checking endpoint logs or reproducing the request rather than relying on the workspace UI.

4. Review success navigation may surprise workspace testers.

   `submitRentalReviewAction()` accepts workspace return paths for errors, but after a successful review it redirects to the public agent page when the agent slug is available. That preserves current behavior, yet testers running the workspace flow may expect to remain on the workspace review tab. Do not change this without an explicit product decision, because reviews also affect public listing visibility.

5. The local loop runner is present and bounded, but it is recursive for this environment.

   `npm run agent:workspace` shells into `codex exec` with the task file and then runs `npm run agent:validate`. That is useful for local human-driven loops. From an already-running Codex delegation, a manual report pass is lower risk than spawning another Codex agent that may edit the same dirty worktree.

## Safe Next Step

If product work resumes later, first consolidate the FR/EN workspace-detail structure behind shared components or document a deliberate divergence. That should remain a separate task because it touches runtime workspace features and locale UX.

For now, keep this pass as documentation-only output and validate with:

```bash
npm run agent:validate
```
