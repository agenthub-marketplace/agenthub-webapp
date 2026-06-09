function WorkspaceCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
      <div className="mb-5 flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-[#1A1130]" />
        <div className="min-w-0 flex-1">
          <div className="mb-3 h-6 w-3/4 rounded bg-[#1A1130]" />
          <div className="h-4 rounded bg-[#1A1130]" />
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between">
        <div className="h-7 w-20 rounded-full bg-[#1A1130]" />
        <div className="h-4 w-24 rounded bg-[#1A1130]" />
      </div>
      <div className="mb-5 h-4 w-32 rounded bg-[#1A1130]" />
      <div className="h-11 rounded-xl bg-[#1A1130]" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <div className="mb-8">
          <div className="mb-3 h-4 w-24 rounded bg-[#1A1130]" />
          <div className="mb-3 h-12 w-full max-w-xl rounded bg-[#1A1130]" />
          <div className="h-5 w-full max-w-lg rounded bg-[#1A1130]" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <WorkspaceCardSkeleton key={index} />
          ))}
        </div>
      </main>
    </div>
  );
}
