import type { AgentStatus, PricingType } from "@/types/agent";

export type DataSensitivityLevel = "low" | "medium" | "high";

export type MockAgent = {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  creatorName: string;
  rating: number;
  reviewCount: number;
  pricingType: PricingType;
  priceLabel: string;
  status: AgentStatus;
  dataSensitivityLevel: DataSensitivityLevel;
  estimatedDuration: string;
  deliverables: string[];
  requiredInputs: string[];
  does: string[];
  doesNot: string[];
};

export const mockAgents: MockAgent[] = [
  {
    id: "agent-linkedin-content",
    slug: "linkedin-content-agent",
    name: "LinkedIn Content Agent",
    category: "Content creation",
    shortDescription:
      "Turns rough ideas into polished LinkedIn posts and weekly content plans.",
    longDescription:
      "A writing agent for independents and consultants who need consistent LinkedIn content without starting from a blank page. It structures ideas, drafts posts, and prepares publish-ready variations.",
    creatorName: "Northstar Automations",
    rating: 4.9,
    reviewCount: 48,
    pricingType: "task",
    priceLabel: "From €29 / task",
    status: "approved",
    dataSensitivityLevel: "low",
    estimatedDuration: "30-60 minutes",
    deliverables: [
      "3 polished LinkedIn post drafts",
      "1 hook variation set",
      "Suggested posting notes",
    ],
    requiredInputs: [
      "Topic or rough idea",
      "Target audience",
      "Tone of voice preference",
    ],
    does: [
      "Structures ideas into concise professional posts",
      "Suggests hooks and calls to action",
      "Adapts copy for freelancers and consultants",
    ],
    doesNot: [
      "Publish directly to LinkedIn",
      "Guarantee engagement or reach",
      "Create regulated financial or medical advice",
    ],
  },
  {
    id: "agent-contract-review",
    slug: "contract-review-agent",
    name: "Contract Review Agent",
    category: "Document analysis",
    shortDescription:
      "Summarizes contracts, flags common risks, and prepares questions for legal review.",
    longDescription:
      "A document analysis agent that helps small businesses understand contracts before involving a lawyer. It highlights obligations, unusual clauses, renewal terms, and open questions.",
    creatorName: "ClauseCraft AI",
    rating: 4.8,
    reviewCount: 35,
    pricingType: "project",
    priceLabel: "From €79 / project",
    status: "approved",
    dataSensitivityLevel: "high",
    estimatedDuration: "Same business day",
    deliverables: [
      "Plain-English contract summary",
      "Risk and obligation checklist",
      "Questions to ask a legal professional",
    ],
    requiredInputs: [
      "Contract document",
      "Business context",
      "Specific concerns if any",
    ],
    does: [
      "Identifies common commercial contract risks",
      "Summarizes obligations and renewal dates",
      "Creates a review checklist",
    ],
    doesNot: [
      "Provide legal advice",
      "Replace a qualified lawyer",
      "Sign or negotiate contracts",
    ],
  },
  {
    id: "agent-lead-generation",
    slug: "lead-generation-agent",
    name: "Lead Generation Agent",
    category: "Lead generation",
    shortDescription:
      "Builds targeted prospect lists from a clear ICP and outreach criteria.",
    longDescription:
      "A research agent for freelancers and small B2B teams that need focused lead lists. It turns a customer profile into organized prospect research with relevance notes.",
    creatorName: "Pipeline Works",
    rating: 4.7,
    reviewCount: 62,
    pricingType: "duration",
    priceLabel: "From €45 / hour",
    status: "approved",
    dataSensitivityLevel: "medium",
    estimatedDuration: "2-4 hours",
    deliverables: [
      "Prospect list spreadsheet",
      "Relevance notes",
      "Suggested segmentation",
    ],
    requiredInputs: [
      "Ideal customer profile",
      "Target geography",
      "Excluded industries or company types",
    ],
    does: [
      "Researches companies matching your ICP",
      "Adds qualification notes",
      "Organizes leads for outreach",
    ],
    doesNot: [
      "Send outreach messages",
      "Scrape private or gated data",
      "Guarantee meetings booked",
    ],
  },
  {
    id: "agent-invoice-assistant",
    slug: "invoice-assistant-agent",
    name: "Invoice Assistant Agent",
    category: "Admin automation",
    shortDescription:
      "Extracts invoice details and prepares clean payment tracking summaries.",
    longDescription:
      "An admin agent that helps independents organize invoices, spot missing payment details, and create a simple tracking table for accounting follow-up.",
    creatorName: "BackOffice Lab",
    rating: 4.8,
    reviewCount: 29,
    pricingType: "task",
    priceLabel: "From €19 / task",
    status: "approved",
    dataSensitivityLevel: "high",
    estimatedDuration: "20-45 minutes",
    deliverables: [
      "Invoice summary table",
      "Missing information checklist",
      "Payment follow-up notes",
    ],
    requiredInputs: [
      "Invoice files",
      "Preferred currency",
      "Optional client payment status",
    ],
    does: [
      "Extracts invoice dates, amounts, and vendors",
      "Flags missing invoice fields",
      "Prepares a tracking-ready summary",
    ],
    doesNot: [
      "Move money or pay invoices",
      "Connect to bank accounts",
      "Replace accounting advice",
    ],
  },
  {
    id: "agent-market-research",
    slug: "market-research-agent",
    name: "Market Research Agent",
    category: "Market research",
    shortDescription:
      "Creates concise market snapshots for new offers, niches, and competitors.",
    longDescription:
      "A research agent for founders and consultants validating a market. It gathers structured findings, competitor notes, audience signals, and practical next-step recommendations.",
    creatorName: "Signal Desk",
    rating: 4.9,
    reviewCount: 41,
    pricingType: "project",
    priceLabel: "From €120 / project",
    status: "approved",
    dataSensitivityLevel: "medium",
    estimatedDuration: "1-2 business days",
    deliverables: [
      "Market snapshot brief",
      "Competitor comparison",
      "Opportunity and risk notes",
    ],
    requiredInputs: [
      "Market or niche",
      "Target customer",
      "Research questions",
    ],
    does: [
      "Summarizes public market signals",
      "Compares visible competitors",
      "Highlights positioning opportunities",
    ],
    doesNot: [
      "Access private paid databases",
      "Guarantee market size accuracy",
      "Make investment recommendations",
    ],
  },
  {
    id: "agent-csv-cleaning",
    slug: "csv-cleaning-agent",
    name: "CSV Cleaning Agent",
    category: "Admin automation",
    shortDescription:
      "Cleans messy spreadsheets and returns a structured CSV ready for analysis.",
    longDescription:
      "A practical data cleanup agent for small operational datasets. It normalizes columns, highlights duplicates, and documents cleanup assumptions before delivery.",
    creatorName: "Data Neat",
    rating: 4.8,
    reviewCount: 53,
    pricingType: "task",
    priceLabel: "From €39 / task",
    status: "approved",
    dataSensitivityLevel: "medium",
    estimatedDuration: "1-3 hours",
    deliverables: [
      "Cleaned CSV file",
      "Duplicate and anomaly report",
      "Cleanup notes",
    ],
    requiredInputs: [
      "CSV or spreadsheet file",
      "Desired column format",
      "Known cleanup rules",
    ],
    does: [
      "Standardizes column names and formats",
      "Finds duplicates and missing values",
      "Documents transformations clearly",
    ],
    doesNot: [
      "Infer sensitive personal attributes",
      "Train models on your data",
      "Guarantee perfect source data quality",
    ],
  },
  {
    id: "agent-email-outreach",
    slug: "email-outreach-agent",
    name: "Email Outreach Agent",
    category: "Lead generation",
    shortDescription:
      "Drafts personalized outreach sequences from a prospect list and offer.",
    longDescription:
      "An outreach copy agent that helps creators and consultants turn a simple offer into concise email sequences tailored to prospect segments.",
    creatorName: "Reply Studio",
    rating: 4.7,
    reviewCount: 37,
    pricingType: "duration",
    priceLabel: "From €50 / hour",
    status: "approved",
    dataSensitivityLevel: "medium",
    estimatedDuration: "2 hours",
    deliverables: [
      "3-email outreach sequence",
      "Subject line options",
      "Personalization fields",
    ],
    requiredInputs: [
      "Offer description",
      "Prospect segment",
      "Preferred tone and constraints",
    ],
    does: [
      "Writes concise outreach sequences",
      "Adapts messaging by segment",
      "Suggests personalization placeholders",
    ],
    doesNot: [
      "Send emails",
      "Bypass consent or compliance requirements",
      "Guarantee replies",
    ],
  },
  {
    id: "agent-admin-automation",
    slug: "admin-automation-agent",
    name: "Admin Automation Agent",
    category: "Admin automation",
    shortDescription:
      "Maps repetitive admin workflows and proposes a safe automation plan.",
    longDescription:
      "A workflow design agent that turns messy admin routines into a clear automation brief. It identifies steps, tools, risks, and the simplest automation path.",
    creatorName: "Ops Automators",
    rating: 4.9,
    reviewCount: 44,
    pricingType: "project",
    priceLabel: "From €95 / project",
    status: "approved",
    dataSensitivityLevel: "medium",
    estimatedDuration: "1 business day",
    deliverables: [
      "Workflow map",
      "Automation opportunity list",
      "Implementation brief",
    ],
    requiredInputs: [
      "Description of current workflow",
      "Tools currently used",
      "Known constraints",
    ],
    does: [
      "Maps repetitive admin steps",
      "Identifies automation candidates",
      "Recommends a low-risk implementation path",
    ],
    doesNot: [
      "Deploy automations directly",
      "Access your tools without consent",
      "Guarantee compatibility with every app",
    ],
  },
];

export const creatorAgentDrafts: MockAgent[] = [
  {
    ...mockAgents[0],
    id: "creator-agent-draft",
    slug: "newsletter-repurposing-agent",
    name: "Newsletter Repurposing Agent",
    status: "draft",
    category: "Content creation",
    shortDescription: "Turns one newsletter into posts, summaries, and snippets.",
    creatorName: "Your creator workspace",
    rating: 0,
    reviewCount: 0,
    priceLabel: "Draft pricing",
  },
  {
    ...mockAgents[2],
    id: "creator-agent-submitted",
    slug: "sales-research-agent",
    name: "Sales Research Agent",
    status: "submitted",
    creatorName: "Your creator workspace",
    rating: 0,
    reviewCount: 0,
  },
  {
    ...mockAgents[5],
    id: "creator-agent-review",
    slug: "spreadsheet-cleanup-agent",
    name: "Spreadsheet Cleanup Agent",
    status: "in_review",
    creatorName: "Your creator workspace",
    rating: 0,
    reviewCount: 0,
  },
  {
    ...mockAgents[7],
    id: "creator-agent-approved",
    slug: "ops-workflow-agent",
    name: "Ops Workflow Agent",
    status: "approved",
    creatorName: "Your creator workspace",
  },
  {
    ...mockAgents[1],
    id: "creator-agent-rejected",
    slug: "legal-risk-agent",
    name: "Legal Risk Agent",
    status: "rejected",
    creatorName: "Your creator workspace",
    rating: 0,
    reviewCount: 0,
  },
];

export function getApprovedAgents() {
  return mockAgents.filter((agent) => agent.status === "approved");
}

export function getAgentBySlug(slug: string) {
  return mockAgents.find((agent) => agent.slug === slug);
}

export function getAgentCategories() {
  return Array.from(new Set(mockAgents.map((agent) => agent.category)));
}
