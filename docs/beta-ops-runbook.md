# AgentHub beta ops runbook

Last updated: 2026-05-28

## Operating mode

The frontend is frozen for closed beta. Do not add new UI, pages, or product flows unless the issue is P0/P1.

Allowed hotfixes:

- blocking auth bug;
- broken checkout;
- inaccessible workspace;
- security or RLS issue;
- wording that blocks testers from completing the flow.

Everything else goes to the beta backlog.

## Day 0 checklist

Production target:

- URL: `https://agenthub-webapp.vercel.app`
- `ACCESS_MODE=paid`
- `PAYMENTS_PROVIDER=stripe`
- `STRIPE_MODE=test`
- `LLM_RUNS_ENABLED=true`
- OpenAI API key present server-side only
- Stripe webhook configured and receiving events

Create and approve these 5 beta agents through creator/admin UI, not SQL:

1. LinkedIn Content Studio
2. Sales Email Builder
3. Text Rewrite Assistant
4. Business SWOT Analyst
5. Meeting Notes Checklist

Each agent must have:

- `execution_mode = llm_prompt`;
- positive price;
- no upload requirement;
- no external tools;
- clear limitations;
- clear output promise;
- approved status;
- one successful user smoke test.

## Day 1 validation log

Status: validated on 2026-05-28.

Validated workflow:

1. Admin archived the existing agents to restart from a clean beta catalog.
2. Creator submitted 5 agents from templates.
3. Admin reviewed and approved the submitted agents.
4. User rented an approved agent through the current beta flow.
5. User opened the workspace.
6. User launched an LLM Runner v0 action.
7. User received a stored result in `agent_runs`.

Validated smoke example:

- Agent: Meeting Notes Checklist.
- Input: raw meeting notes for AgentHub private beta planning.
- Output quality: acceptable for beta. The runner extracted decisions, open questions, action items, owners, and follow-up items.
- Product conclusion: LLM Runner v0 is not fine-tuned. It uses the configured OpenAI model through a server-side prompt built from the approved agent version and workspace action.

Go / no-go:

- Closed beta Day 1 base: go.
- Next step: Day 2 limited tester launch with 3 to 5 internal testers.
- Fix policy remains unchanged: P0/P1 only during beta; P2/P3 go to feedback backlog.

## Day 2 limited tester launch

Status: ready to start.

Objective:

- Put the validated Day 1 flow in front of 3 to 5 internal testers.
- Measure whether testers understand the path without guidance:
  `marketplace -> rent -> Stripe sandbox -> workspace -> LLM run -> review`.
- Capture confusion and bugs in Notion.
- Do not add product features during the test window.

Tester scope:

- 3 to 5 people maximum.
- Use production only: `https://agenthub-webapp.vercel.app`.
- Use Stripe sandbox card: `4242 4242 4242 4242`.
- No real payment.
- No sensitive real data.
- Ask each tester to test 1 or 2 agents, not all 5.

Before inviting testers:

1. Run the minimal smoke test once with an internal account.
2. Confirm the 5 beta agents are visible in marketplace/search.
3. Confirm at least one LLM run still succeeds.
4. Confirm Notion feedback database is ready.
5. Confirm a rollback/hotfix owner is available during the test window.

Recommended agent assignment:

- Tester 1: Meeting Notes Checklist.
- Tester 2: Text Rewrite Assistant.
- Tester 3: LinkedIn Content Studio.
- Tester 4: Sales Email Builder.
- Tester 5: Business SWOT Analyst.

Tester instructions:

1. Sign up or log in.
2. Open marketplace/search.
3. Choose the assigned agent.
4. Click `Louer cet agent`.
5. Pay with Stripe sandbox card `4242 4242 4242 4242`.
6. Confirm redirect to workspace.
7. Run 1 or 2 actions with non-sensitive text.
8. Reload the page and check history.
9. Leave one review.
10. Report any issue or confusion in Notion.

Day 2 go/no-go:

- Go if all testers can complete checkout, workspace access, and at least one LLM run.
- Pause if any P0/P1 appears.
- Continue collecting only if issues are P2/P3.

Day 2 success criteria:

- 3+ testers complete the user flow.
- 0 P0.
- 0 open P1 at end of day.
- At least 3 successful LLM runs.
- At least 2 reviews submitted.
- Main confusion points are captured in Notion.

End of Day 2 actions:

1. Run `scripts/beta-sanity.sql` read-only.
2. Run `scripts/beta-daily-metrics.sql` read-only.
3. Count successful checkouts, workspaces opened, LLM runs, reviews.
4. Triage Notion feedback.
5. Decide whether Day 3 expands to 5 to 10 testers or stays in stabilization.

Parallel preparation, no implementation during tester window:

- Agent Contract Polish spec: `docs/agent-contract-polish-spec.md`.
- Purpose: prepare public listing preview, workspace preview, and clearer creator/admin contract wording for a later release.
- Rule: do not implement these screens during J2 unless tester feedback exposes a P0/P1 blocker.

## Minimal smoke test

Run this after every P0/P1 hotfix:

1. Login as user.
2. Open one approved agent.
3. Rent through Stripe sandbox with `4242 4242 4242 4242`.
4. Confirm success redirects to `/workspace/[rentalId]`.
5. Launch one LLM run.
6. Reload and confirm run history remains visible.
7. Leave one verified review.
8. Confirm logged-out users are sent to login before renting.

## Daily sanity checks

Use `scripts/beta-sanity.sql` in the Supabase SQL editor or with a read-only database session.

Check:

- 5 expected beta agents present and approved;
- Agent Contract readiness for non-archived agents;
- old pending payments;
- paid payments without access;
- duplicate open payments;
- duplicate active access;
- failed LLM runs;
- stale running LLM runs;
- LLM usage by user and by agent;
- duplicate reviews;
- reviews on invalid access;
- auth users without profiles;
- unconfirmed auth users.

Agent Contract readiness should flag any agent with:

- missing output promise;
- missing deliverables or limitations;
- non-positive price;
- `forbidden_beta` risk;
- `llm_prompt` configured with file requirements;
- external tools configured while the runner remains v0 text-only.

Do not run destructive SQL in production.

## Daily metrics

Use `scripts/beta-daily-metrics.sql` once per day during the closed beta.

It reports:

- daily checkout/payment/access/LLM/review funnel proxy;
- current payment and access states;
- agent-level beta performance;
- agents with access but no successful LLM run;
- user-level beta activity;
- manual review queue for old pending payments, paid payments without access, and stale running runs.

There is no dedicated workspace-open event yet, so use active accesses and LLM runs as backend-side proxies.

## Day 3 backend observability

Goal:

- convert tester activity into measurable backend facts;
- catch silent failures before expanding the beta.

Run:

1. `scripts/beta-sanity.sql`;
2. `scripts/beta-daily-metrics.sql`;
3. Notion triage for every P0/P1/P2.

No-go conditions:

- paid payment without access;
- duplicate active access;
- stale running LLM run affecting users;
- repeated LLM failures on the same approved agent;
- any privacy/RLS issue.

Exit criteria:

- no P0;
- no open P1;
- failure causes are understood and logged;
- decide whether Day 4 is agent-quality work or stabilization.

## Day 4 agent quality pass

Goal:

- improve the 5 beta agents through creator/admin workflow, not SQL;
- keep the frontend frozen.

Use the `agent_contract_quality` section from `scripts/beta-sanity.sql`.

Each beta agent should have:

- `approved` status;
- `execution_mode = llm_prompt`;
- positive price;
- output promise;
- deliverables;
- limitations;
- no file requirement;
- no external tools;
- at least one successful LLM run.

If an agent fails quality checks:

1. creator edits/resubmits through the existing UI;
2. admin reviews and approves;
3. user smoke-tests one LLM action.

No direct SQL edits to production agents.

## Day 5 security and privacy pass

Goal:

- verify data isolation before inviting more testers.

Checklist:

- user A cannot open user B workspace;
- user A cannot read user B payment/access/run data;
- creator dashboard does not show user private inputs or LLM run output;
- public marketplace excludes non-approved, suspended, and archived agents;
- Stripe/OpenAI/Supabase service keys remain server-only;
- webhook is still the only paid access creator.

If any item fails, stop beta expansion and treat it as P0/P1 depending on severity.

## Day 6 expand to 5-10 testers

Go conditions:

- 0 P0;
- 0 open P1;
- Stripe sandbox success and cancel both work;
- all 5 beta agents have at least one successful run;
- Notion triage is current.

Operating rules:

- invite up to 10 testers;
- assign one primary agent per tester;
- ask for one checkout, one run, one review;
- collect confusion in Notion;
- do not implement P2/P3.

End of day:

- run daily sanity and metrics SQL;
- count completed flows;
- summarize top 3 issues.

## Day 7 closed beta readout

Collect:

- testers invited;
- checkouts started/completed;
- active accesses created;
- LLM runs succeeded/failed;
- reviews left;
- P0/P1/P2 count;
- top confusion points;
- best and weakest beta agents.

Decision:

- expand if flow is stable and value is understood;
- stabilize another week if checkout/workspace/LLM issues repeat;
- start next release planning if feedback clusters around Agent Contract polish, analytics, or creator/admin preview.

## Feedback tracking

Notion is the source of truth for closed beta feedback.

Minimum properties:

- Type: Bug, UX, Copy, Product, Security
- Severity: P0, P1, P2, P3
- Role: Public, User, Creator, Admin
- Flow: Auth, Marketplace, Checkout, Workspace, LLM Runner, Review, Admin Review
- URL
- Steps
- Expected
- Actual
- Account email
- Agent slug
- Rental ID
- Payment ID
- Screenshot
- Status
- Owner

Severity rules:

- P0: prod inaccessible, login globally broken, checkout globally broken, paid access not created, user A sees user B data, secret exposed.
- P1: creator submit broken, admin review broken, workspace inaccessible, all eligible LLM runs broken, verified reviews broken, suspended agent visible or purchasable.
- P2: confusing UX, unclear wording, dashboard state unclear, template copy issue.
- P3: polish and future suggestions.

Triage:

- P0/P1: fix immediately and run the minimal smoke test.
- P2: group in beta backlog.
- P3: defer.

## End of closed beta readout

Collect:

- checkout started;
- checkout completed;
- workspace opened;
- LLM runs succeeded and failed;
- reviews left;
- P0/P1/P2 count;
- top tester confusion points.

Decision:

- expand to more testers if P0/P1 are cleared and the 5 beta agents are usable;
- otherwise stabilize before public limited beta.

## Out of scope during closed beta

- Stripe Connect;
- creator payouts;
- uploads;
- emails;
- persistent notifications;
- n8n;
- external tools;
- full execution gateway;
- frontend redesign.
