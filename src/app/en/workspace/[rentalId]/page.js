import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { ACCESS_COMPATIBLE_STATUSES, getUserRentalById } from '@/server/rentals/user-rentals';
import { ArrowLeft, Bot, Check, Clock, Send } from 'lucide-react';

export default async function WorkspaceRentalPage({ params, searchParams }) {
  const { rentalId } = await params;
  const query = searchParams ? await searchParams : {};
  const profile = await requireAuth('en', `/en/workspace/${rentalId}`);
  const { rental, error } = await getUserRentalById(profile.id, rentalId);

  if (error || !rental || !ACCESS_COMPATIBLE_STATUSES.includes(rental.status)) {
    notFound();
  }

  const accessCreated = query?.access === 'created';

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-8">
        <Link href="/en/workspace" className="mb-8 inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA]">
          <ArrowLeft className="h-4 w-4" />
          Back to my agents
        </Link>

        {accessCreated && (
          <div className="mb-6 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
            Your beta access is active. You can find this agent from My rentals.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
            <AgentAvatar index={0} size="xl" className="mb-5" />
            <p className="font-label mb-2 text-xs text-[#10B981]">Active access</p>
            <h1 className="font-display text-3xl font-bold text-[#F4EFFA]">
              {rental.agent?.name ?? 'AgentHub agent'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#C8B1E4]">{rental.agent?.summary}</p>
            <div className="mt-6 space-y-3 text-sm text-[#C8B1E4]">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#10B981]" />
                Beta access without real payment
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#9B72CF]" />
                Activated on {new Date(rental.createdAt).toLocaleDateString('en-US')}
              </div>
            </div>
            {rental.agent?.slug && (
              <Link href={`/agents/${rental.agent.slug}`} className="mt-6 block">
                <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                  View agent listing
                </Button>
              </Link>
            )}
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <p className="font-label mb-2 text-xs text-[#9B72CF]">Direct access</p>
              <h2 className="font-display text-xl font-bold text-[#F4EFFA]">Rented agent</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#C8B1E4]">
                This agent is available in your beta workspace. No customer brief is required to open access.
              </p>
            </div>

            <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#F4EFFA]">Agent workspace</h2>
                  <p className="text-sm text-[#9B72CF]">Beta access ready for the upcoming execution layer.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5 text-sm leading-relaxed text-[#C8B1E4]">
                Access is active on your account. The next product block will connect this workspace to real agent execution.
              </div>

              <div className="mt-5 flex gap-3 rounded-2xl border border-[#2F184B] bg-[#080612] p-3">
                <input
                  disabled
                  value=""
                  placeholder="Agent interaction coming soon"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#F4EFFA] outline-none placeholder:text-[#6F5B8F]"
                />
                <Button disabled className="border-0 bg-[#532B88] text-white opacity-60">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
