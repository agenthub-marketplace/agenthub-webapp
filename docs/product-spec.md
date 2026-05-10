# AgentHub Product Spec

AgentHub is a marketplace where creators publish verified AI agent services and users rent those agents for concrete tasks, durations, or projects.

## Problem

AI agent discovery is often presented as a generic directory. Users still need to judge quality, safety, deliverables, pricing, and trust on their own. AgentHub focuses on verified services with clear outcomes.

## Target users

- Users: non-technical freelancers, independents, small entrepreneurs, creators, and consultants.
- Creators: developers, no-code builders, AI experts, and automation freelancers.
- Admins: the internal AgentHub team responsible for validation, safety, quality, and marketplace trust.

## Creator side

Creators should be able to:

- Create a public creator profile.
- Draft an agent service.
- Define deliverables, pricing type, and scope.
- Submit endpoint details and documentation for review.
- Receive admin validation feedback.
- Track orders and service performance later.

## User side

Users should be able to:

- Browse approved agents.
- Understand deliverables before renting.
- Compare pricing models.
- Place orders later when payments are implemented.
- Track runs, deliverables, reviews, refunds, and disputes.

## Admin side

Admins should be able to:

- Review submitted agents.
- Approve, reject, suspend, or request changes.
- Inspect endpoint verification details.
- Moderate reviews and listings.
- Review disputes and audit logs.

## MVP scope

- Web app foundation.
- Supabase-ready auth and data architecture.
- Agent marketplace data model.
- Placeholder product routes.
- Documentation for architecture, security, database, and local setup.
- GitHub collaboration workflow.
- External verified endpoint execution model planned, not implemented.

## Non-goals

- No mobile app.
- No Lovable.
- No real payments in this foundation.
- No Stripe Connect implementation yet.
- No real Supabase Auth flow yet.
- No arbitrary creator code execution on AgentHub infrastructure.
- No full marketplace UI yet.

## Future phases

1. Supabase Auth and role-aware routing.
2. Marketplace listing and agent detail MVP.
3. Creator submission workflow.
4. Admin validation workflow.
5. Stripe Connect payment and payout flows.
6. Execution gateway for verified external endpoints.
7. Managed sandboxed execution model if business and security requirements justify it.
