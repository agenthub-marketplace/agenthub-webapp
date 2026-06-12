'use client';

export default function WorkspaceNextActions({ items = [], title }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-4">
      <p className="font-label mb-2 text-xs text-[#B794F4]">{title}</p>
      <ol className="space-y-2 text-sm text-[#D6C5E8]">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#251A40] text-xs font-bold text-[#C4B5FD]">
              {index + 1}
            </span>
            <span className="leading-6">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
