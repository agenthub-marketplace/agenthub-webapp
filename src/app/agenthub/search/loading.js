function AgentCardSkeleton() {
  return (
    <div className="h-[285px] rounded-2xl border border-[#251A40] bg-[#110D24] p-5">
      <div className="mb-5 flex items-start justify-between">
        <div className="h-12 w-12 rounded-2xl bg-[#1A152F]" />
        <div className="h-6 w-20 rounded-full bg-[#1A152F]" />
      </div>
      <div className="mb-3 h-6 w-3/4 rounded bg-[#1A152F]" />
      <div className="mb-2 h-4 rounded bg-[#1A152F]" />
      <div className="mb-8 h-4 w-2/3 rounded bg-[#1A152F]" />
      <div className="border-t border-[#251A40] pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-9 w-32 rounded bg-[#1A152F]" />
          <div className="h-5 w-16 rounded bg-[#1A152F]" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 rounded bg-[#1A152F]" />
          <div className="h-9 w-9 rounded-xl bg-[#1A152F]" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="container px-4 py-8">
        <div className="mb-6 h-14 rounded-2xl border border-[#2F184B] bg-[#0F0A1E]" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="h-5 w-40 rounded bg-[#1A152F]" />
          <div className="h-10 w-36 rounded-lg border border-[#2F184B] bg-[#0F0A1E]" />
        </div>
        <div className="flex gap-6">
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="space-y-5 rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
              <div className="h-8 w-28 rounded bg-[#1A152F]" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-5 rounded bg-[#1A152F]" />
                ))}
              </div>
              <div className="h-8 rounded bg-[#1A152F]" />
            </div>
          </aside>
          <main className="min-w-0 flex-1">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <AgentCardSkeleton key={index} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
