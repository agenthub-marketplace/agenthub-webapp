import Link from 'next/link';
import { ArrowRight, Layers3, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AGENT_TEMPLATES } from '@/lib/agent-templates';
import { getCreatorProfileForUser } from '@/server/agents/creator-agents';
import { isCreatorEndpointRuntimeEnabled } from '@/server/endpoints/runtime';
import { isCreatorWorkflowRuntimeEnabled } from '@/server/workflows/runtime';
import { CodePageHeader, CodePanel } from '../_components/code-console-ui';

export const dynamic = 'force-dynamic';

const templateTones = ['violet', 'blue', 'green', 'amber', 'slate'];

function getRuntimeLabel(template) {
  if (template.runtime_type === 'workflow_automation') {
    return 'Agent workflow';
  }

  if (template.runtime_type === 'creator_endpoint') {
    return 'Agent API';
  }

  if (template.data_policy?.requires_files) {
    return 'Document beta';
  }

  return 'Assistant IA guidé';
}

export default async function AgentHubCodeTemplatesPage() {
  const creatorProfile = await getCreatorProfileForUser();
  const [canUseWorkflowAutomation, canUseCreatorEndpoint] = creatorProfile.id
    ? await Promise.all([
        isCreatorWorkflowRuntimeEnabled(creatorProfile.id),
        isCreatorEndpointRuntimeEnabled(creatorProfile.id),
      ])
    : [false, false];
  const visibleTemplates = AGENT_TEMPLATES.filter((template) => {
    if (template.runtime_type === 'workflow_automation') {
      return canUseWorkflowAutomation;
    }

    if (template.runtime_type === 'creator_endpoint') {
      return canUseCreatorEndpoint;
    }

    return true;
  });

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="MODÈLES"
        title="Des points de départ pour créer plus vite."
        description="Choisissez un modèle, adaptez la promesse, les entrées demandées, les limites et les exemples avant validation."
        action={
          <Link href="/code/agents/new">
            <Button className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44]">
              <PlusCircle className="mr-2 h-4 w-4" />
              Créer depuis un modèle
            </Button>
          </Link>
        }
      />

      <section className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-label text-xs text-[#6B3FA0]">POINTS DE DÉPART</p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#111827]">Modèles disponibles</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#4B5563]">
            Ces modèles préremplissent une fiche. Ils ne publient rien automatiquement : chaque agent passe ensuite par la validation AgentHub.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleTemplates.map((template, index) => (
            <CodePanel key={template.key} tone={templateTones[index % templateTones.length]} className="transition-transform hover:-translate-y-0.5">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#6B3FA0] shadow-[0_10px_24px_rgba(109,64,160,0.12)]">
                <Layers3 className="h-5 w-5" />
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[#111827]">{template.label}</h2>
                <span className="rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-1 text-[10px] font-label text-[#6B3FA0]">
                  {template.category_slug}
                </span>
              </div>
              <p className="min-h-[72px] text-sm leading-6 text-[#4B5563]">{template.short_description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#DDD6FE] bg-[#FAF5FF] px-3 py-1 text-xs font-semibold text-[#6B3FA0]">
                  {getRuntimeLabel(template)}
                </span>
                {(template.runtime_type === 'workflow_automation' || template.runtime_type === 'creator_endpoint') && (
                  <span className="rounded-full border border-[#C4B5FD] bg-[#F3E8FF] px-3 py-1 text-xs font-semibold text-[#5B21B6]">
                    Décision LLM
                  </span>
                )}
                <span className="rounded-full border border-[#D8DDEE] bg-white px-3 py-1 text-xs font-semibold text-[#374151]">
                  Modèle éditable
                </span>
              </div>
              <Link href="/code/agents/new" className="mt-6 inline-flex items-center text-sm font-medium text-[#6B3FA0]">
                Utiliser ce modèle
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </CodePanel>
          ))}
        </div>
        {(!canUseWorkflowAutomation || !canUseCreatorEndpoint) && (
          <p className="mt-5 rounded-2xl border border-[#E3E7F2] bg-white p-4 text-sm leading-6 text-[#4B5563]">
            Les modèles avancés workflow/API sont visibles uniquement pour les creators allowlistés par un admin.
          </p>
        )}
      </section>

    </main>
  );
}
