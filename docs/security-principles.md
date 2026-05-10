# AgentHub Security Principles

Security decisions should protect users, creators, admins, and marketplace trust before optimizing for automation.

## No arbitrary creator code execution in MVP

AgentHub will not execute creator-provided code on AgentHub infrastructure during the MVP. Creators may provide external verified endpoints for future gateway execution. This avoids premature exposure to sandbox escapes, resource abuse, supply-chain attacks, and secrets leakage.

## Agent validation workflow

Agents should move through explicit states:

- `draft`
- `submitted`
- `in_review`
- `approved`
- `rejected`
- `suspended`

Admins should validate scope, deliverables, endpoint ownership, safety constraints, data handling, support expectations, and review history before approval.

## Data sensitivity levels

- Public: approved agent listing data, public creator profile data, public reviews.
- User-private: order briefs, deliverables, run history, disputes, private profile fields.
- Creator-private: endpoint details, validation notes, revenue and payout data.
- Admin-only: internal review notes, audit logs, moderation decisions, service role operations.
- Secret: Supabase service role key, Stripe keys, webhook secrets, gateway secrets.

## API endpoint verification

Future agent endpoints should use:

- Ownership verification before approval.
- Signed requests from AgentHub.
- Webhook signature verification.
- Strict timeout and retry rules.
- Allowlisted callback URLs where possible.
- Clear logging without storing raw secrets.

## Logs and audit trail

Sensitive admin and marketplace actions should be logged:

- Agent approvals, rejections, and suspensions.
- Order status changes.
- Refund and dispute decisions.
- Endpoint verification events.
- Auth-sensitive admin actions.

Audit logs should be append-only from the application perspective.

## Refunds and disputes

Refund and dispute workflows must preserve evidence, status changes, admin decisions, and communication history. Stripe dispute handling should be implemented only when Stripe Connect is added.

## Secrets handling

- Do not commit `.env.local`.
- Do not place real secrets in `.env.example`.
- Keep public variables prefixed with `NEXT_PUBLIC_`.
- Keep service role, Stripe, webhook, and gateway secrets server-only.
- Never print secrets in logs, build output, support replies, or issue comments.
