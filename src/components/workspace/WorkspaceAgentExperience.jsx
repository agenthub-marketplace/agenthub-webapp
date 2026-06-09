import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, ClipboardList, History, Layers, Play, SlidersHorizontal } from 'lucide-react';
import { polishFrenchCopy, polishFrenchList } from '@/lib/french-copy';

function DetailList({ emptyText, icon: Icon = Check, items = [], tone = 'success' }) {
  const color = tone === 'warning' ? 'text-[#F59E0B]' : 'text-[#10B981]';

  if (!items.length) {
    return <p className="text-sm text-[#9B72CF]">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2 text-sm text-[#C8B1E4]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ children, eyebrow, title }) {
  return (
    <section className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
      <p className="font-label mb-2 text-xs text-[#9B72CF]">{eyebrow}</p>
      <h2 className="font-display text-2xl font-bold text-[#F4EFFA]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function WorkspaceAgentExperience({
  activeTab = 'overview',
  accessLabel,
  agent,
  baseHref,
  contract,
  reviewSlot,
  runnerSlot,
  setupLabel,
}) {
  const description = polishFrenchCopy(agent.description || agent.summary);
  const summary = polishFrenchCopy(agent.summary);
  const capabilities = polishFrenchList(agent.capabilities ?? []);
  const deliverables = polishFrenchList(agent.deliverables ?? []);
  const limitations = polishFrenchList(agent.limitations ?? []);
  const requiredInputs = polishFrenchList(agent.requiredInputsList ?? []);
  const setupItems = polishFrenchList(contract.setupRequirements?.items ?? []);
  const outputExamples = polishFrenchList(contract.outputPromise?.examples ?? []);

  const tabs = [
    { id: 'overview', label: 'Présentation', icon: Layers },
    { id: 'setup', label: 'Mise en place', icon: SlidersHorizontal },
    { id: 'use', label: 'Utiliser', icon: Play },
    { id: 'details', label: 'Détails', icon: ClipboardList },
    { id: 'review', label: 'Avis', icon: History },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-label mb-3 text-xs text-[#10B981]">Agent prêt</p>
            <h1 className="font-display text-3xl font-bold text-[#F4EFFA] md:text-4xl">
              {agent.name ?? 'AgentHub agent'}
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C8B1E4]">
              {description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[accessLabel, setupLabel].filter(Boolean).map((label) => (
                <span key={label} className="rounded-full border border-[#2F184B] bg-[#080612] px-3 py-1.5 text-xs font-semibold text-[#D6C5E8]">
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href={`${baseHref}?tab=setup`}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
            >
              Mettre en place
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`${baseHref}?tab=use`}
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border border-[#6B3FA0] bg-transparent px-5 text-sm font-semibold text-[#D6C5E8] transition-colors hover:bg-[#1A152F]"
            >
              Utiliser maintenant
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-3 lg:sticky lg:top-24 lg:h-fit" aria-label="Sections workspace">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <Link
                  key={tab.id}
                  href={tab.id === 'overview' ? baseHref : `${baseHref}?tab=${tab.id}`}
                  className={`flex min-w-max cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors lg:min-w-0 ${
                    active
                      ? 'bg-[#251A40] text-[#F4EFFA]'
                      : 'text-[#9B72CF] hover:bg-[#15112A] hover:text-[#F4EFFA]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0">
          {activeTab === 'overview' && (
            <Panel eyebrow="En bref" title="Ce que cet agent apporte">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">Objectif</h3>
                  <p className="text-sm leading-6 text-[#C8B1E4]">{summary}</p>
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">Capacités principales</h3>
                  <DetailList items={capabilities.slice(0, 4)} emptyText="Aucune capacité détaillée n’a été renseignée." />
                </div>
              </div>
            </Panel>
          )}

          {activeTab === 'setup' && (
            <Panel eyebrow="Préparation" title="Mise en place">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">À préparer</h3>
                  <DetailList items={requiredInputs} emptyText="Aucun input spécifique n’a été renseigné." />
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">Setup</h3>
                  <DetailList items={setupItems} emptyText="Aucun setup supplémentaire n’est requis avant utilisation." />
                </div>
              </div>
              <Link
                href={`${baseHref}?tab=use`}
                className="mt-5 inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#532B88] px-5 text-sm font-bold text-white transition-colors hover:bg-[#7C3AED]"
              >
                Continuer vers l’utilisation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Panel>
          )}

          {activeTab === 'use' && (
            <div>
              {runnerSlot}
            </div>
          )}

          {activeTab === 'details' && (
            <Panel eyebrow="Cadre d’usage" title="Détails utiles">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">Livrables attendus</h3>
                  <DetailList items={deliverables} emptyText="Livrables non renseignés." />
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">Exemples d’usage</h3>
                  <DetailList items={outputExamples} emptyText="Aucun exemple fourni pour le moment." />
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5 md:col-span-2">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">Limites importantes</h3>
                  <DetailList icon={AlertTriangle} items={limitations} emptyText="Aucune limite publiée." tone="warning" />
                </div>
              </div>
            </Panel>
          )}

          {activeTab === 'review' && (
            <Panel eyebrow="Retour vérifié" title="Avis après utilisation">
              {reviewSlot}
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
