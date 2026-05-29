# AgentHub Agent Contract Polish Spec

Last updated: 2026-05-28

## Objective

Prepare the next creator/admin improvement without changing the product flow yet.

The goal is to make agent quality easier to validate before publication:

- creators understand what they are submitting;
- admins understand what they are approving;
- both can preview what users will see after approval;
- no new execution feature is introduced in this phase.

## Current state

Agent Contract v1 already exists through these fields:

- `workspace_mode`;
- `setup_requirements`;
- `output_promise`;
- `execution_mode`;
- `data_policy`;
- capabilities, limitations, required inputs, deliverables.

The current weak points are presentation and validation clarity:

- `workspace_mode` and `execution_mode` are easy to confuse;
- `output_promise` is not visible enough as the user-facing promise;
- limitations are entered as text but not previewed in the final user context;
- creator cannot preview the public agent page before submission;
- creator/admin cannot preview the workspace before approval.

## Scope

### 1. Public listing preview before submission

Add a preview block in creator submit/edit later that shows an approximate public card/detail view:

- agent name;
- short description;
- category;
- price;
- creator label;
- risk/validation badge copy;
- output promise summary;
- limitations summary.

Purpose:

- help creators catch poor copy before submitting;
- reduce low-quality admin submissions.

### 2. Workspace preview before submission

Add a preview block that simulates `/workspace/[rentalId]` without requiring a rental:

- workspace mode label;
- setup requirements;
- output promise examples;
- deliverables;
- limitations;
- 3 to 5 workspace actions;
- whether the agent is static guided or LLM Runner text.

Purpose:

- make the "thing the user receives" concrete before approval.

### 3. Better Agent Contract wording

Replace technical labels with product wording:

- `workspace_mode` -> "Expérience utilisateur après activation";
- `execution_mode` -> "Type d’exécution";
- `output_promise` -> "Promesse de résultat";
- `setup_requirements` -> "Ce que l’utilisateur doit préparer";
- `data_policy` -> "Données utilisées";
- `limitations` -> "Limites à afficher à l’utilisateur".

Keep raw technical values available in smaller admin/debug text if useful.

### 4. Admin review checklist polish

Admin review should make these questions explicit:

- Is the user promise clear?
- Is the price coherent with the promised output?
- Are the limitations visible and honest?
- Is the setup clear after activation?
- Is execution mode correct?
- Does data policy match the experience?
- Is there any forbidden beta risk?

## Screens to touch later

Do not implement in this spec commit unless explicitly requested.

Future implementation screens:

1. `src/app/creator/agents/new/new-agent-content.jsx`
   - add public listing preview;
   - add workspace preview;
   - improve labels and helper copy.

2. `src/app/creator/agents/[id]/edit/edit-agent-content.jsx`
   - same previews for resubmission after requested changes.

3. `src/app/admin/admin-content.jsx`
   - improve Agent Contract review panel;
   - add public listing preview;
   - add workspace preview;
   - make execution mode vs workspace mode visually distinct.

4. `src/lib/agent-contract.ts`
   - centralize product labels and descriptions if duplication grows.

5. `src/lib/workspace-actions.ts`
   - reuse the same action derivation for preview and real workspace.

6. Optional future component:
   - `src/components/agents/AgentListingPreview.jsx`;
   - `src/components/workspace/WorkspacePreview.jsx`.

## Backend preparation already available

The front remains frozen for the beta, but the backend/ops groundwork can already be reused later:

1. `src/lib/agent-contract-quality.ts`
   - pure TypeScript quality evaluator;
   - no React, no UI dependency, no database access;
   - checks price, risk, capabilities, inputs, deliverables, limitations, output promise, LLM runner compatibility, file requirements, and external tools;
   - returns blocker/warning counts plus individual checks;
   - can later power creator previews, admin checklists, or read-only reports.

2. `scripts/beta-sanity.sql`
   - read-only SQL checks for beta operations;
   - includes Agent Contract readiness signals for non-archived agents;
   - highlights agents that are not ready for closed beta because of missing promise, missing limitations, non-positive price, forbidden risk, file requirements, or external tools.

This keeps the next implementation focused: wire existing quality signals into creator/admin screens later, instead of inventing validation rules in UI components.

## Out of scope

- No LLM prompt editing by creators.
- No full execution gateway.
- No upload.
- No external tools.
- No Stripe changes.
- No schema change unless a later implementation proves a missing field.
- No marketplace redesign.
- No admin scoring automation.

## Acceptance criteria

When implemented later:

- Creator can understand the public listing before submit.
- Creator can understand the workspace the user will receive.
- Admin can distinguish:
  - workspace experience;
  - execution mode;
  - output promise;
  - limitations;
  - setup requirements.
- Admin can approve/reject/request changes with less ambiguity.
- The preview uses only data already stored in Agent Contract v1.

## Recommended next ticket

Implement preview components with no schema changes:

```text
AgentListingPreview
WorkspacePreview
```

Use them first in creator submit, then reuse in edit and admin review.
