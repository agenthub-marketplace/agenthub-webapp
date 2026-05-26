import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import { requireAuth } from '@/lib/auth/session';
import { stopAgentAccessAction } from '@/server/rentals/actions';
import { getUserRentals } from '@/server/rentals/user-rentals';
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

function formatPrice(cents, currency = 'eur') {
  if (typeof cents !== 'number' || cents <= 0) {
    return 'Price not configured';
  }

  return new Intl.NumberFormat('en-US', {
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: 'currency',
  }).format(cents / 100);
}

function accessStopMessage(value) {
  return {
    stopped: { tone: 'success', text: 'Access has been stopped. You can rent this agent again from its listing.' },
    error: { tone: 'error', text: 'Unable to stop this rental right now.' },
    invalid: { tone: 'error', text: 'Invalid rental.' },
    'not-found': { tone: 'error', text: 'Rental not found.' },
    'already-stopped': { tone: 'info', text: 'This access is already stopped.' },
  }[value] ?? null;
}

export default async function WorkspacePage({ searchParams }) {
  const profile = await requireAuth('en', '/en/workspace');
  const query = searchParams ? await searchParams : {};
  const { rentals, error } = await getUserRentals(profile.id);
  const activeRentals = rentals.filter((rental) => rental.accessOpen);
  const stopMessage = accessStopMessage(typeof query?.accessStop === 'string' ? query.accessStop : null);
  const stopAction = stopAgentAccessAction.bind(null, 'en');

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

        {stopMessage && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              stopMessage.tone === 'error'
                ? 'border-[#EF4444]/35 bg-[#EF4444]/10 text-[#FCA5A5]'
                : 'border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7]'
            }`}
          >
            {stopMessage.text}
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
                    {formatPrice(rental.priceCents, rental.currency)}
                  </span>
                </div>
                <p className="mb-5 text-xs text-[#9B72CF]">
                  {WORKSPACE_MODE_LABELS[rental.agent?.contract?.workspaceMode] || 'Instant access'}
                </p>
                <Link href={`/en/workspace/${rental.id}`}>
                  <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    Open agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <form action={stopAction} className="mt-3">
                  <input type="hidden" name="rental_id" value={rental.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full border-[#EF4444]/45 bg-transparent text-[#FCA5A5] hover:bg-[#2A0D18]"
                  >
                    Stop access
                  </Button>
                </form>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
