# AgentHub closed beta week operating plan

Last updated: 2026-05-28

## Principle

No new frontend work during this beta week.

Allowed changes:

- P0/P1 backend or security hotfixes;
- auth/session fixes;
- checkout/webhook/access fixes;
- LLM Runner stability fixes;
- read-only ops scripts and documentation;
- creator/admin data cleanup through the product UI.

Not allowed:

- new UI;
- redesign;
- new product flow;
- Stripe Connect;
- payouts;
- upload;
- emails;
- persistent notifications;
- n8n;
- external tools;
- full execution gateway.

## Day 1 - Base validation

Status: validated.

Goal:

- validate the clean catalog setup;
- validate creator submit -> admin approve -> user rent -> workspace -> LLM run.

Exit criteria:

- 5 intended beta agents can be created from templates;
- at least 1 agent is fully smoke-tested;
- LLM Runner v0 returns and stores output;
- no P0/P1 remains open.

## Day 2 - Limited tester launch

Goal:

- invite 3 to 5 internal testers;
- test production only;
- capture feedback in Notion;
- do not fix P2/P3 during the test window.

Required checks before launch:

- production loads;
- Stripe sandbox checkout works;
- at least one LLM run succeeds;
- Notion feedback base is ready;
- rollback/hotfix owner is available.

Exit criteria:

- 3+ testers complete checkout -> workspace -> LLM run;
- 0 P0;
- 0 open P1;
- confusion points are captured in Notion.

## Day 3 - Backend observability and data quality

Goal:

- turn beta observations into measurable backend facts;
- run daily read-only SQL reports;
- identify silent issues before adding more testers.

Actions:

1. Run `scripts/beta-sanity.sql`.
2. Run `scripts/beta-daily-metrics.sql`.
3. Review:
   - pending payments older than 30 minutes;
   - paid payments without access;
   - duplicate active accesses;
   - failed LLM runs;
   - stale running LLM runs;
   - agents with no successful run;
   - reviews duplicated by access.
4. Add every issue to Notion with severity.
5. Fix only P0/P1.

Exit criteria:

- no paid payment without access;
- no duplicated active access;
- no stale running run blocking users;
- LLM run failure rate understood;
- all P0/P1 are closed or beta is paused.

## Day 4 - Agent quality pass

Goal:

- improve the 5 beta agents through creator/admin workflow, not SQL;
- keep the frontend frozen.

Actions:

1. Use `agent_contract_quality` from `scripts/beta-sanity.sql`.
2. For every beta agent, check:
   - output promise;
   - deliverables;
   - limitations;
   - positive price;
   - `execution_mode = llm_prompt`;
   - no file requirement;
   - no external tools.
3. If an agent is weak, ask creator to edit/resubmit through the UI.
4. Admin approves only after the contract is clear.
5. Run one LLM smoke per updated agent.

Exit criteria:

- 5 agents are approved and ready for closed beta;
- each agent has at least one successful LLM run;
- each agent has clear limitations and output promise;
- no direct SQL agent edits were used.

## Day 5 - Security and privacy pass

Goal:

- verify beta data isolation before expanding testers.

Actions:

1. Test user A cannot open user B workspace.
2. Test user A cannot read user B payment/access/run data through exposed pages or API.
3. Verify creator dashboard only shows non-sensitive analytics/access data.
4. Confirm archived/suspended agents are not public or purchasable.
5. Confirm `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, and OpenAI key are server-only.
6. Run daily SQL reports.

Exit criteria:

- no cross-user data exposure;
- creators cannot see private user inputs or LLM run content;
- suspended/archived agents are excluded from marketplace and creator analytics;
- no secret is exposed client-side.

## Day 6 - Expand to 5-10 testers

Goal:

- expand only if Day 3-5 are clean.

Go conditions:

- 0 P0;
- 0 open P1;
- checkout success path stable;
- LLM Runner stable on at least 5 agents;
- Notion triage under control.

Actions:

1. Invite up to 10 testers.
2. Assign 1 agent per tester first.
3. Ask each tester for:
   - one checkout;
   - one successful LLM run;
   - one review;
   - one feedback entry if confused.
4. Run `scripts/beta-daily-metrics.sql` at end of day.

Exit criteria:

- 5+ completed user flows;
- no systemic checkout issue;
- no systemic LLM issue;
- top 3 product confusions identified.

## Day 7 - Closed beta readout

Goal:

- decide whether to expand, stabilize, or build the next release.

Collect:

- testers invited;
- signups/logins;
- checkout started;
- checkout completed;
- active accesses created;
- LLM runs succeeded/failed;
- reviews left;
- P0/P1/P2 count;
- top UX/product confusion points;
- agents with best/worst perceived value.

Decision options:

1. Expand closed beta.
   - choose if no P0/P1 and value is clear.
2. Stabilize another week.
   - choose if checkout/workspace/LLM has repeated P1 or confusion.
3. Start next release planning.
   - choose if beta flow is stable and feedback clusters around Agent Contract polish, preview, or analytics.

## Backend-only backlog prepared for next release

Ready now:

- `src/lib/agent-contract-quality.ts` for contract checks;
- `scripts/beta-sanity.sql` for data quality;
- `scripts/beta-daily-metrics.sql` for beta metrics;
- `docs/agent-contract-polish-spec.md` for future creator/admin previews.

Future backend tickets after beta week:

1. Store daily beta metrics snapshots in an internal table.
2. Add admin-only backend report endpoint.
3. Add LLM run cost estimates by agent/user.
4. Add rate-limit audit rows for LLM Runner.
5. Add structured error taxonomy for OpenAI failures.
