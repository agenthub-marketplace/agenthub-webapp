import Link from "next/link";
import { ArrowRight, Clock3, Star } from "lucide-react";

import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { MockAgent } from "@/lib/mock-data/agents";
import { cn } from "@/lib/utils";

type AgentCardProps = {
  agent: MockAgent;
  locale?: Locale;
};

export function AgentCard({ agent, locale = "fr" }: AgentCardProps) {
  const t = getDictionary(locale);

  return (
    <Card className="rounded-lg bg-white">
      <CardHeader className="h-full">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline">{agent.category}</Badge>
          <StatusBadge status="verified" locale={locale} />
        </div>
        <CardTitle>{agent.name}</CardTitle>
        <CardDescription className="min-h-12 leading-6">
          {agent.shortDescription}
        </CardDescription>

        <div className="mt-4 grid gap-3 text-sm text-[#6f675d]">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <Star className="size-4 fill-[#d79b2d] text-[#d79b2d]" />
              {agent.rating.toFixed(1)} ({agent.reviewCount})
            </span>
            <span className="font-medium text-[#181716]">{agent.priceLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock3 className="size-4" />
            {agent.estimatedDuration}
          </div>
        </div>

        <Link
          href={localizedPath(`/agents/${agent.slug}`, locale)}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-5 h-10 w-full border-[#d7cec1] bg-white",
          )}
        >
          {t.common.viewAgent}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardHeader>
    </Card>
  );
}
