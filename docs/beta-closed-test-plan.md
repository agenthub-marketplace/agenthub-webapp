# AgentHub closed beta test plan

Last updated: 2026-05-28

## Objective

Validate the closed beta flow and perceived value:

```text
marketplace -> Stripe sandbox checkout -> active access -> workspace -> LLM run -> verified review
```

Closed beta validates the flow and perceived value, not real revenue.

## Test environment

- URL: `https://agenthub-webapp.vercel.app`
- Mode: Stripe sandbox/test mode
- Success card: `4242 4242 4242 4242`
- Declined card: `4000 0000 0000 9995`
- No real charges are made in Stripe test mode.
- Do not enter real sensitive data, confidential documents, medical data, legal secrets, financial account data, or personal HR evaluation data.
- Frontend changes are frozen except P0/P1 fixes.

## Roles

- Public visitor: browses public pages and marketplace.
- User: rents/activates an agent, opens workspace, runs LLM actions, leaves a review.
- Creator: creates agents from templates and resubmits after changes.
- Admin: reviews, requests changes, approves, rejects, suspends, restores.

## Beta agents to test

1. LinkedIn Content Studio
2. Sales Email Builder
3. Text Rewrite Assistant
4. Business SWOT Analyst
5. Meeting Notes Checklist

Day 1 validation:

- Existing catalog was archived by admin to restart from a clean beta baseline.
- Creator submission from templates works.
- Admin review and approval works.
- User rental/access works.
- Workspace Assistant IA guidé works on Meeting Notes Checklist with a realistic raw-notes input.
- The generated output was acceptable for closed beta: decisions, action items, owners, open questions, and follow-up items were extracted.

Each test agent should have:

- positive price;
- `execution_mode = llm_prompt`;
- no file requirement;
- no external tools;
- clear output promise;
- clear limitations;
- approved status before user testing.

## User test flow

1. Sign up or log in.
2. Open marketplace/search.
3. Open an approved beta agent.
4. Click `Louer cet agent`.
5. Complete Stripe sandbox checkout with `4242 4242 4242 4242`.
6. Confirm success redirects to `/workspace/[rentalId]`.
7. Run 2 or 3 workspace actions with short, non-sensitive input.
8. Reload the workspace and verify run history remains visible.
9. Open a full result from history.
10. Leave one verified review.
11. Confirm a second review is blocked.
12. Stop access.
13. Confirm stopped access moves to history and active access disappears.

## Creator test flow

1. Log in as creator.
2. Open creator dashboard.
3. Start a new agent from one of the five templates.
4. Confirm fields are prefilled.
5. Edit price, output promise, capabilities, limitations.
6. Confirm execution mode is `Assistant texte`.
7. Submit for review.
8. If admin requests changes, edit and resubmit.
9. Confirm creator does not see private user run inputs, notes, Stripe details, or user-only workspace history.

## Admin test flow

1. Log in as admin.
2. Open review queue.
3. Take an agent in review.
4. Confirm Agent Contract fields are readable:
   - workspace experience;
   - setup requirements;
   - execution mode;
   - output promise;
   - risk and limitations.
5. Request changes and confirm creator sees feedback.
6. Approve a clean test agent.
7. Reject a bad test agent.
8. Suspend and restore an approved agent.
9. Confirm suspended agents are hidden from marketplace and not purchasable.

## Assistant IA guidé test flow

1. Use an approved agent with `execution_mode = llm_prompt`.
2. Rent the agent.
3. Open workspace.
4. Confirm `Démarrer avec cet agent` shows 3 to 5 actions.
5. Select an action.
6. Enter short text input.
7. Launch the agent.
8. Confirm result appears and is stored.
9. Reload and confirm history still shows the run.
10. Try rapid double click and confirm no uncontrolled duplicate run is created.
11. Stop the access and confirm run is no longer launchable from that access.

## Feedback format

For each issue, collect:

- Type: Bug, UX, Copy, Product, Security.
- Severity: P0, P1, P2, P3.
- Role: Public, User, Creator, Admin.
- Flow: Auth, Marketplace, Checkout, Workspace, Review, Creator submit, Admin review.
- Environment: Prod.
- URL.
- Steps to reproduce.
- Expected.
- Actual.
- Account email.
- Browser/device.
- Screenshot or Loom.
- Agent slug.
- Rental ID.
- Payment ID.
- Stripe session ID.

Use `docs/beta-ops-runbook.md` for triage cadence and `scripts/beta-sanity.sql` for daily backend checks.

## Severity rules

P0:

- production inaccessible;
- login impossible globally;
- checkout globally broken;
- paid access not created after webhook;
- user A can see user B data;
- secret or service role exposed.

P1:

- creator submission broken;
- admin review broken;
- workspace inaccessible after paid access;
- LLM runs broken for all eligible agents;
- verified review broken;
- suspended agent visible or purchasable.

P2:

- confusing UX;
- unclear payment/access wording;
- dashboard state unclear;
- template copy needs improvement;
- runner history hard to understand.

P3:

- visual polish;
- minor copy;
- future suggestion;
- non-blocking template improvement.

## Out of scope

- Real charges.
- Stripe Connect.
- Creator payouts.
- Uploads.
- Emails.
- Persistent notifications.
- n8n.
- External tools.
- Full execution gateway.
- Chat realtime.
- Streaming.
- Public beta launch.
