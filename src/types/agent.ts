export type AgentStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "suspended";

export type PricingType = "task" | "duration" | "project";

export type Agent = {
  id: string;
  creatorId: string;
  categoryId: string | null;
  slug: string;
  name: string;
  summary: string;
  description: string;
  status: AgentStatus;
  pricingType: PricingType;
  startingPriceCents: number | null;
  currency: string;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentVersion = {
  id: string;
  agentId: string;
  version: number;
  endpointUrl: string | null;
  changelog: string | null;
  capabilities: string[];
  deliverables: string[];
  validationNotes: string | null;
  createdAt: string;
};

export type Review = {
  id: string;
  agentId: string;
  orderId: string;
  userId: string;
  rating: number;
  body: string | null;
  createdAt: string;
};
