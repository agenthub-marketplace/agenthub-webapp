export default function Loading() {
  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <div className="mb-8 h-36 rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
          <div className="mb-4 h-4 w-28 rounded bg-[#1A1130]" />
          <div className="mb-4 h-10 w-full max-w-lg rounded bg-[#1A1130]" />
          <div className="h-5 w-full max-w-2xl rounded bg-[#1A1130]" />
        </div>
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
              <div className="mb-4 h-9 w-9 rounded-xl bg-[#1A1130]" />
              <div className="mb-3 h-4 w-20 rounded bg-[#1A1130]" />
              <div className="h-8 w-16 rounded bg-[#1A1130]" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                <div className="mb-3 h-5 w-48 rounded bg-[#1A1130]" />
                <div className="mb-2 h-4 rounded bg-[#1A1130]" />
                <div className="h-4 w-2/3 rounded bg-[#1A1130]" />
              </div>
            ))}
          </div>
          <div className="h-56 rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
            <div className="mb-4 h-10 w-10 rounded-xl bg-[#1A1130]" />
            <div className="mb-3 h-4 w-24 rounded bg-[#1A1130]" />
            <div className="h-4 rounded bg-[#1A1130]" />
          </div>
        </div>
      </main>
    </div>
  );
}
