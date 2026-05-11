import { Star } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MockReview } from "@/lib/mock-data/reviews";

type ReviewCardProps = {
  review: MockReview;
};

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="rounded-lg bg-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{review.title}</CardTitle>
            <CardDescription>{review.authorName}</CardDescription>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            <Star className="size-4 fill-[#d79b2d] text-[#d79b2d]" />
            {review.rating}
          </div>
        </div>
        {review.body ? (
          <p className="pt-2 text-sm leading-6 text-[#6f675d]">{review.body}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
