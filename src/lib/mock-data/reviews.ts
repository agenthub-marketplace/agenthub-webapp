import type { Review } from "@/types/agent";

export type MockReview = Review & {
  authorName: string;
  agentSlug: string;
  title: string;
};

export const mockReviews: MockReview[] = [
  {
    id: "review-1",
    agentId: "agent-linkedin-content",
    agentSlug: "linkedin-content-agent",
    orderId: "order-1",
    userId: "user-1",
    authorName: "Maya R.",
    title: "Clear drafts in under an hour",
    rating: 5,
    body: "The posts sounded like my consulting voice and needed only light edits.",
    createdAt: "2026-04-18T10:00:00.000Z",
  },
  {
    id: "review-2",
    agentId: "agent-contract-review",
    agentSlug: "contract-review-agent",
    orderId: "order-2",
    userId: "user-2",
    authorName: "Thomas K.",
    title: "Useful before calling counsel",
    rating: 5,
    body: "It surfaced renewal and liability questions I had missed.",
    createdAt: "2026-04-22T10:00:00.000Z",
  },
  {
    id: "review-3",
    agentId: "agent-lead-generation",
    agentSlug: "lead-generation-agent",
    orderId: "order-3",
    userId: "user-3",
    authorName: "Elena P.",
    title: "Good fit for niche prospecting",
    rating: 4,
    body: "The list was focused and the qualification notes saved research time.",
    createdAt: "2026-04-25T10:00:00.000Z",
  },
  {
    id: "review-4",
    agentId: "agent-csv-cleaning",
    agentSlug: "csv-cleaning-agent",
    orderId: "order-4",
    userId: "user-4",
    authorName: "Noah S.",
    title: "Clean handoff",
    rating: 5,
    body: "The anomaly report made it easy to review what changed.",
    createdAt: "2026-05-01T10:00:00.000Z",
  },
];

export function getReviewsForAgent(slug: string) {
  return mockReviews.filter((review) => review.agentSlug === slug);
}
