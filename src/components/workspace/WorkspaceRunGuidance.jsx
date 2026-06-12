'use client';

function GuidanceList({ emptyText, items = [], title }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-3">
      <p className="font-label mb-2 text-[10px] text-[#B794F4]">{title}</p>
      <ul className="space-y-1.5 text-xs leading-5 text-[#D6C5E8]">
        {items.slice(0, 4).map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B5CF6]" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {items.length === 0 && emptyText && <p className="text-xs text-[#7F6B9C]">{emptyText}</p>}
    </div>
  );
}

export default function WorkspaceRunGuidance({
  setupItems = [],
  setupTitle,
  successItems = [],
  successTitle,
}) {
  if (!setupItems.length && !successItems.length) {
    return null;
  }

  return (
    <div className="mb-5 grid gap-3 rounded-2xl border border-[#6B3FA0]/35 bg-[#120C24] p-4 md:grid-cols-2">
      <GuidanceList items={setupItems} title={setupTitle} />
      <GuidanceList items={successItems} title={successTitle} />
    </div>
  );
}
