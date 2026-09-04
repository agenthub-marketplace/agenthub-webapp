import type { Order, OrderStatus } from "@/types/order";

export type MockOrder = Order & {
  agentName: string;
  agentSlug: string;
  creatorName: string;
  statusLabel: string;
};

export const mockOrders: MockOrder[] = [
  {
    id: "order-active-1",
    agentId: "agent-market-research",
    agentName: "Market Research Agent",
    agentSlug: "market-research-agent",
    userId: "user-demo",
    creatorId: "creator-signal-desk",
    creatorName: "Signal Desk",
    status: "in_progress",
    statusLabel: "In progress",
    pricingType: "project",
    amountCents: 12000,
    currency: "eur",
    taskBrief: "Research the market for solo consultant CRM templates.",
    deliverableUrl: null,
    startedAt: "2026-05-09T09:00:00.000Z",
    completedAt: null,
    createdAt: "2026-05-09T08:30:00.000Z",
    updatedAt: "2026-05-09T09:00:00.000Z",
  },
  {
    id: "order-active-2",
    agentId: "agent-csv-cleaning",
    agentName: "CSV Cleaning Agent",
    agentSlug: "csv-cleaning-agent",
    userId: "user-demo",
    creatorId: "creator-data-neat",
    creatorName: "Data Neat",
    status: "paid",
    statusLabel: "Queued",
    pricingType: "task",
    amountCents: 3900,
    currency: "eur",
    taskBrief: "Clean a customer export before a newsletter migration.",
    deliverableUrl: null,
    startedAt: null,
    completedAt: null,
    createdAt: "2026-05-10T08:00:00.000Z",
    updatedAt: "2026-05-10T08:00:00.000Z",
  },
  {
    id: "order-complete-1",
    agentId: "agent-linkedin-content",
    agentName: "LinkedIn Content Agent",
    agentSlug: "linkedin-content-agent",
    userId: "user-demo",
    creatorId: "creator-northstar",
    creatorName: "Northstar Automations",
    status: "completed",
    statusLabel: "Completed",
    pricingType: "task",
    amountCents: 2900,
    currency: "eur",
    taskBrief: "Create three posts about productized consulting.",
    deliverableUrl: "/dashboard",
    startedAt: "2026-05-01T10:00:00.000Z",
    completedAt: "2026-05-01T11:00:00.000Z",
    createdAt: "2026-05-01T09:45:00.000Z",
    updatedAt: "2026-05-01T11:00:00.000Z",
  },
  {
    id: "order-review-1",
    agentId: "agent-admin-automation",
    agentName: "Admin Automation Agent",
    agentSlug: "admin-automation-agent",
    userId: "user-demo",
    creatorId: "creator-ops",
    creatorName: "Ops Automators",
    status: "completed",
    statusLabel: "Pending review",
    pricingType: "project",
    amountCents: 9500,
    currency: "eur",
    taskBrief: "Map recurring onboarding admin tasks.",
    deliverableUrl: "/dashboard",
    startedAt: "2026-04-28T10:00:00.000Z",
    completedAt: "2026-04-29T12:00:00.000Z",
    createdAt: "2026-04-28T09:30:00.000Z",
    updatedAt: "2026-04-29T12:00:00.000Z",
  },
];

export function getOrdersByStatus(statuses: OrderStatus[]) {
  return mockOrders.filter((order) => statuses.includes(order.status));
}
