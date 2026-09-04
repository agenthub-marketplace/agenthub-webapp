'use client';

import { Check } from 'lucide-react';
import { CodePanel } from './code-console-ui';

function lines(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueLinesFrom(...values) {
  const seen = new Set();
  const result = [];

  values.flatMap((value) => lines(value)).forEach((item) => {
    const normalized = item.replace(/\s+/g, ' ').trim();

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(normalized);
  });

  return result;
}

function buildCreatorWorkspaceBlueprint(values) {
  const inputFields = uniqueLinesFrom(values.required_inputs, values.setup_items);
  const outputSections = uniqueLinesFrom(values.deliverables, values.output_promise_examples);
  const runtimeType = values.runtime_type;
  const documentMode = values.workspace_mode === 'document_required';
  const fallbackInputs =
    runtimeType === 'creator_endpoint'
      ? ['Contexte métier envoyé à l’API creator', 'Objectif attendu de l’enrichissement']
      : runtimeType === 'workflow_automation'
        ? ['Contexte à traiter par le workflow', 'Critères de décision à appliquer']
        : documentMode
          ? ['Document PDF/DOCX avec texte sélectionnable', 'Question ou objectif d’analyse']
          : ['Contexte utilisateur', 'Format de réponse attendu'];
  const fallbackOutputs =
    outputSections.length > 0
      ? outputSections
      : uniqueLinesFrom(values.output_promise_summary, values.sample_output, 'Résultat final actionnable');
  const trustItems = [
    'Historique, accès et avis restent dans AgentHub.',
    runtimeType === 'creator_endpoint' ? 'Le contexte utile peut être envoyé à l’endpoint creator approuvé côté serveur.' : null,
    runtimeType === 'workflow_automation' ? 'AgentHub orchestre les étapes workflow et stocke le résultat final.' : null,
    documentMode ? 'Les documents beta restent privés, sans OCR pour les PDF scannés.' : null,
  ].filter(Boolean);

  return {
    inputFields: (inputFields.length > 0 ? inputFields : fallbackInputs).slice(0, 5),
    outputSections: fallbackOutputs.slice(0, 5),
    trustItems,
  };
}

export default function WorkspaceBlueprintPreview({ className = '', values }) {
  const blueprint = buildCreatorWorkspaceBlueprint(values);

  return (
    <CodePanel className={className}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">BLUEPRINT WORKSPACE</p>
          <h2 className="font-display text-2xl font-bold text-[#111827]">Workspace dérivé de cette fiche</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
            Cette preview montre ce que l’utilisateur verra pour comprendre quoi fournir, quel résultat attendre et quelles limites respecter.
          </p>
        </div>
        <span className="rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1 text-[10px] font-label text-[#6B3FA0]">
          V0 auto
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4">
          <p className="font-label mb-3 text-[10px] text-[#6B3FA0]">Inputs spécifiques</p>
          <ul className="space-y-2 text-sm leading-5 text-[#4B5563]">
            {blueprint.inputFields.map((item, index) => (
              <li key={item} className="flex gap-2">
                <span className="font-stat text-xs text-[#8B5CF6]">0{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4">
          <p className="font-label mb-3 text-[10px] text-[#6B3FA0]">Sortie attendue</p>
          <ul className="space-y-2 text-sm leading-5 text-[#4B5563]">
            {blueprint.outputSections.map((item, index) => (
              <li key={item} className="flex gap-2">
                <span className="font-stat text-xs text-[#8B5CF6]">0{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#DDD6FE] bg-[#FAF5FF] p-4">
          <p className="font-label mb-3 text-[10px] text-[#6B3FA0]">Limites de confiance</p>
          <ul className="space-y-2 text-sm leading-5 text-[#4B5563]">
            {blueprint.trustItems.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6B3FA0]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CodePanel>
  );
}
