import Link from 'next/link';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import CheckoutSuccessClient from '../../../checkout/checkout-success-client';

async function getPayment(profileId, sessionId) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from('payments')
    .select('status,rental_request_id')
    .eq('user_id', profileId)
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();

  return data ?? null;
}

export default async function CheckoutSuccessPage({ searchParams }) {
  const query = searchParams ? await searchParams : {};
  const sessionId = typeof query?.session_id === 'string' ? query.session_id : '';
  const profile = await requireAuth('en', '/en/checkout/success');
  const payment = sessionId ? await getPayment(profile.id, sessionId) : null;

  if (payment?.status === 'paid' && payment.rental_request_id) {
    redirect(`/en/workspace/${payment.rental_request_id}?access=created`);
  }

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8 text-center">
          <p className="font-label mb-2 text-xs text-[#10B981]">Payment received</p>
          <h1 className="font-display text-3xl font-bold text-[#F4EFFA]">Activation in progress</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#C8B1E4]">
            Stripe confirmed the payment. This page automatically checks access creation and redirects once the webhook has finished.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <CheckoutSuccessClient label="Check now" />
            <Link href="/en/dashboard">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">Open dashboard</Button>
            </Link>
            <Link href="/en/workspace">
              <Button variant="outline" className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                My agents
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
