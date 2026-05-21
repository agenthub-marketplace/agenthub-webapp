import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { getUserRentals, ACCESS_COMPATIBLE_STATUSES } from '@/server/rentals/user-rentals';
import { ArrowRight, Bot, Clock } from 'lucide-react';

function statusLabel(status) {
  return {
    active: 'Active',
    accepted: 'Active',
    in_progress: 'Active',
    delivered: 'Completed',
    expired: 'Expired',
    pending: 'Pending',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }[status] ?? status;
}

export default async function WorkspacePage() {
  const profile = await requireAuth('en', '/en/workspace');
  const { rentals, error } = await getUserRentals(profile.id);
  const activeRentals = rentals.filter((rental) => ACCESS_COMPATIBLE_STATUSES.includes(rental.status));

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-10">
        <div className="mb-8">
          <p className="font-label mb-2 text-xs text-[#9B72CF]">My rentals</p>
          <h1 className="font-display text-4xl font-bold text-[#F4EFFA] md:text-5xl">Your accessible agents</h1>
          <p className="mt-2 max-w-2xl text-[#C8B1E4]">
            Find every beta agent currently active on your account.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
            Could not load your access records right now.
          </div>
        )}

        {!error && activeRentals.length === 0 ? (
          <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
              <Bot className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold text-[#F4EFFA]">No active agent</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#C8B1E4]">
              Rent an approved agent from the marketplace to open it here.
            </p>
            <Link href="/en/marketplace" className="mt-6 inline-flex">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                Discover agents
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeRentals.map((rental, index) => (
              <article key={rental.id} className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                <div className="mb-5 flex items-start gap-4">
                  <AgentAvatar index={index} size="md" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-xl font-bold text-[#F4EFFA]">
                      {rental.agent?.name ?? 'AgentHub agent'}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-[#C8B1E4]">{rental.agent?.summary}</p>
                  </div>
                </div>
                <div className="mb-5 flex items-center justify-between text-sm">
                  <span className="rounded-full border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-1 text-xs font-label text-[#6EE7B7]">
                    {statusLabel(rental.status)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#9B72CF]">
                    <Clock className="h-3.5 w-3.5" />
                    Beta
                  </span>
                </div>
                <Link href={`/en/workspace/${rental.id}`}>
                  <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    Open agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
