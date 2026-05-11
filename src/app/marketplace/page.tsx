import { SlidersHorizontal } from "lucide-react";

import { AgentCard } from "@/components/app/agent-card";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getAgentCategories,
  getApprovedAgents,
  mockAgents,
} from "@/lib/mock-data/agents";

const pricingFilters = ["task", "duration", "project"];

export default function MarketplacePage() {
  const agents = getApprovedAgents();
  const categories = getAgentCategories();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Marketplace"
        title="Browse verified AI agents by concrete deliverable."
        description="Find reviewed AI services you can rent for a task, duration, or project. This MVP uses typed mock data while backend execution is planned."
      />

      <section className="mb-8 rounded-lg border border-[#e2dacd] bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="agent-search">
              Search agents
            </label>
            <Input
              id="agent-search"
              placeholder="Search by use case, category, or deliverable"
              readOnly
            />
          </div>
          <div className="flex items-end">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-[#e2dacd] px-3 text-sm text-[#6f675d]">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Static filters
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Categories</p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#181716] text-white">All</Badge>
              {categories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Pricing</p>
            <div className="flex flex-wrap gap-2">
              {pricingFilters.map((pricing) => (
                <Badge key={pricing} className="capitalize" variant="outline">
                  {pricing}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-[#6f675d]">
          Showing {agents.length} verified agents from {mockAgents.length} total mock listings.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </section>
    </AppShell>
  );
}
