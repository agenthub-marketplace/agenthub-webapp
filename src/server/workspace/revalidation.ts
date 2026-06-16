import "server-only";

import { revalidatePath } from "next/cache";

import { localizedPath, type Locale } from "@/lib/i18n/config";

export function revalidateWorkspaceRunSurfaces(input: {
  agentSlug?: string | null;
  locale?: Locale | null;
  rentalId?: string | null;
}) {
  revalidatePath("/agenthub/dashboard");
  revalidatePath("/en/dashboard");
  revalidatePath("/dashboard");
  revalidatePath("/agenthub/workspace");
  revalidatePath("/en/workspace");
  revalidatePath("/workspace");
  revalidatePath("/code");
  revalidatePath("/code/dashboard");
  revalidatePath("/code/agents");
  revalidatePath("/code/admin");
  revalidatePath("/code/admin/ops");
  revalidatePath("/code/admin/ops/advanced-agents");

  if (input.rentalId) {
    revalidatePath(`/agenthub/workspace/${input.rentalId}`);
    revalidatePath(`/en/workspace/${input.rentalId}`);
    revalidatePath(`/workspace/${input.rentalId}`);

    if (input.locale) {
      revalidatePath(localizedPath(`/workspace/${input.rentalId}`, input.locale));
    }
  }

  if (input.agentSlug) {
    revalidatePath(`/agenthub/agents/${input.agentSlug}`);
    revalidatePath(`/agents/${input.agentSlug}`);
    revalidatePath(`/en/agents/${input.agentSlug}`);

    if (input.locale) {
      revalidatePath(localizedPath(`/agents/${input.agentSlug}`, input.locale));
    }
  }
}
