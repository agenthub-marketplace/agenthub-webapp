# Verified Reviews Audit Report

Date: 2026-06-10

Scope: documentation-only audit of verified review eligibility and public visibility. No database, migration, RLS, Edge Function, dependency, or product behavior change was made.

## Summary

Verified reviews are currently verified by construction. There is no separate `verified` column on `agent_reviews`; instead, a review can be inserted only when it references a user-owned rental/access row that passes the review eligibility checks.

The active implementation keeps public review visibility scoped to approved agents and blocks direct unverified public review creation through both the server action and Supabase RLS insert policy.

## State Model

```text
not_eligible
  -> eligible_after_active_access
  -> submitted
  -> visible
```

Observed invalid or terminal outcomes:

```text
access_missing
duplicate_blocked
self_review_blocked
invalid_content_blocked
agent_not_public
```

Not currently modeled as first-class review states:

```text
hidden
rejected
moderation_pending
```

## Eligibility Checks Identified

- Application entrypoint: `src/server/reviews/actions.ts`.
- The action requires authentication through `requireAuth`.
- The action only loads a `rental_requests` row matching both `rental_id` and the authenticated `profile.id`.
- The action permits review submission only for `active`, `stopped`, `expired`, or legacy `delivered` access statuses.
- The action blocks creator self-reviews by comparing the current creator profile to the rental `creator_id`.
- The action validates rating range, body presence, body length, title length, and redirects duplicate insert errors as `review-already-exists`.
- Database constraint `agent_reviews.rental_request_id unique` enforces one review per access.
- Database foreign key `(rental_request_id, agent_id, user_id)` requires the review to match the referenced rental/access owner and agent.
- Supabase insert policy calls `public.can_user_review_rental_request(rental_request_id, agent_id, user_id)`.
- The latest migration version of `public.can_user_review_rental_request` accepts `active`, `stopped`, `expired`, or legacy `delivered` access and rejects creator self-review through `not public.owns_creator_profile(rr.creator_id)`.

## Visibility Checks Identified

- Public marketplace/detail loading uses `src/server/marketplace/agents.ts`.
- Marketplace queries only select agents where `agents.status = approved`.
- Review aggregates and review summaries are loaded through the `agent_reviews` relationship on those approved-agent queries.
- Supabase read policy `Public can read verified agent reviews` allows selecting `agent_reviews` only when the linked agent currently has `status = approved`.
- Public read grants expose review content fields and do not expose `user_id`.
- Authenticated dashboard/workspace reads join reviews by the user-owned rental/access row, not by arbitrary user lookup.

## Findings

1. No P0/P1 eligibility bypass found in the audited code path.

   The server action and RLS policy agree on the key eligibility boundary: the authenticated user must own a valid access row for the same agent, and creator self-review is blocked.

2. Public visibility is approval-scoped, not review-status-scoped.

   This is consistent with the current schema because reviews have no moderation/status column. It means all accepted inserts become visible whenever the linked agent is approved. If AgentHub needs `hidden` or `rejected` review moderation states, that would require an explicit schema/policy change and is outside this audit scope.

3. Review eligibility is access-based, not run-history-based.

   The closed-beta journey describes `workspace run -> stored run history -> verified review`, but the current eligibility check does not require an `agent_runs` row. Under the task acceptance criteria, active or valid prior access is sufficient. If the product wants "verified after actual use" rather than "verified after access", add a future task to gate review eligibility on at least one owned completed run.

4. Stopped and expired access remain reviewable.

   The latest function and server action both allow `stopped` and `expired`. This supports "valid prior access" reviews, but it also means a user can stop access without running the agent and still review unless a run-history gate is later added.

## Existing Diagnostics

Read-only SQL diagnostics already cover the main integrity risks:

- `scripts/beta-sanity.sql` checks duplicate reviews by access.
- `scripts/beta-sanity.sql` checks reviews attached to invalid access statuses.
- `scripts/beta-sanity-summary.sql` aggregates `duplicate_review_groups` and `reviews_on_invalid_access`.

## Recommendation

Keep the current implementation unchanged for this audit. For a future product hardening task, decide whether verified reviews should remain "verified by access" or become "verified by successful workspace use". If moderation is required, model it explicitly with review statuses and public read policy changes rather than relying on application-only filtering.
