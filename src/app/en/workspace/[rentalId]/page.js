import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import { requireAuth } from '@/lib/auth/session';
import { getUserRentalById } from '@/server/rentals/user-rentals';
import { submitRentalReviewAction } from '@/server/reviews/actions';
import { AlertTriangle, ArrowLeft, Bot, Check, Clock, Euro, MessageSquareText, ShieldCheck, Star } from 'lucide-react';

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
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

function ListBlock({ emptyText, icon: Icon = Check, items = [], title, tone = 'success' }) {
  const color = tone === 'warning' ? 'text-[#F59E0B]' : 'text-[#10B981]';

  return (
    <div className="rounded-2xl border border-[#2F184B] bg-[#0A0816] p-5">
      <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-[#C8B1E4]">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#9B72CF]">{emptyText}</p>
      )}
    </div>
  );
}

function WorkspaceUnavailable({ message, profile, title }) {
  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8">
          <p className="font-label mb-3 text-xs text-[#F59E0B]">AGENT WORKSPACE</p>
          <h1 className="font-display mb-3 text-3xl font-bold text-[#F4EFFA]">{title}</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#C8B1E4]">{message}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/en/workspace">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">My agents</Button>
            </Link>
            <Link href="/en/search">
              <Button variant="outline" className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                Browse agents
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default async function WorkspaceRentalPage({ params, searchParams }) {
  const { rentalId } = await params;
  const query = searchParams ? await searchParams : {};
  const profile = await requireAuth('en', `/en/workspace/${rentalId}`);
  const { rental, error } = await getUserRentalById(profile.id, rentalId);

  if (error) {
    return (
      <WorkspaceUnavailable
        profile={profile}
        title="Unable to load this access"
        message="The rental may have been created, but the workspace data is temporarily unavailable. Please try again in a few seconds."
      />
    );
  }

  if (!rental) {
    notFound();
  }

  if (!rental.accessOpen) {
    return (
      <WorkspaceUnavailable
        profile={profile}
        title="Access unavailable"
        message="This access is not active or the related agent is no longer published. You can find your other agents from your workspace."
      />
    );
  }

  const accessCreated = query?.access === 'created';
  const contract = rental.agent.contract;
  const accessLabel = WORKSPACE_MODE_LABELS[contract.workspaceMode] || 'Instant access';
  const setupLabel = optionLabel(SETUP_REQUIREMENT_OPTIONS, contract.setupRequirements.type);
  const reviewAction = submitRentalReviewAction.bind(null, 'en');

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
            Your beta access is active. You can find this agent from your workspace.
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
                {accessLabel}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#9B72CF]" />
                Activated on {new Date(rental.createdAt).toLocaleDateString('en-US')}
              </div>
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-[#9B72CF]" />
                {formatPrice(rental.priceCents, rental.currency)}
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#10B981]" />
                Status: {rental.status === 'active' ? 'active' : rental.status}
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
              <h2 className="font-display text-xl font-bold text-[#F4EFFA]">How to use this agent</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#C8B1E4]">
                {contract.outputPromise.summary || 'Follow the creator instructions, prepare the required inputs, then use this workspace as your access guide.'}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {['Read inputs', 'Check limitations', 'Prepare expected output'].map((label) => (
                  <button key={label} type="button" className="rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-3 text-left text-xs font-label text-[#C8B1E4]">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ListBlock title="Inputs to prepare" items={rental.agent.requiredInputsList} emptyText="No specific input was provided." />
              <ListBlock title="Expected deliverables" items={rental.agent.deliverables} emptyText="No deliverable listed." />
              <ListBlock title="Usage examples" items={contract.outputPromise.examples} emptyText="No example yet." />
              <ListBlock title="Important limitations" items={rental.agent.limitations} emptyText="No published limitation." icon={AlertTriangle} tone="warning" />
            </div>

            <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#F4EFFA]">Guided workspace</h2>
                  <p className="text-sm text-[#9B72CF]">{setupLabel}</p>
                </div>
              </div>
              {contract.setupRequirements.items.length > 0 ? (
                <ul className="space-y-2 text-sm text-[#C8B1E4]">
                  {contract.setupRequirements.items.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5 text-sm leading-relaxed text-[#C8B1E4]">
                  Access is active. No extra setup is required before use.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#F4EFFA]">Verified review</h2>
                  <p className="text-sm text-[#9B72CF]">Available because you own active access.</p>
                </div>
              </div>
              {rental.review ? (
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
                  <div className="mb-2 flex gap-1 text-[#F59E0B]">
                    {Array.from({ length: rental.review.rating }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  {rental.review.title && <p className="font-display font-bold text-[#F4EFFA]">{rental.review.title}</p>}
                  {rental.review.body && <p className="mt-2 text-sm text-[#C8B1E4]">{rental.review.body}</p>}
                </div>
              ) : (
                <form action={reviewAction} className="space-y-3">
                  <input type="hidden" name="rental_id" value={rental.id} />
                  <select name="rating" required className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none focus:border-[#7C3AED]">
                    <option value="">Rating</option>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Very good</option>
                    <option value="3">3 - Good</option>
                    <option value="2">2 - Needs work</option>
                    <option value="1">1 - Unsatisfied</option>
                  </select>
                  <input name="title" placeholder="Short title" className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none placeholder:text-[#6F5B8F] focus:border-[#7C3AED]" />
                  <textarea name="body" required minLength={5} rows={4} placeholder="Your feedback after using this agent..." className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none placeholder:text-[#6F5B8F] focus:border-[#7C3AED]" />
                  <Button type="submit" className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    Publish review
                  </Button>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
