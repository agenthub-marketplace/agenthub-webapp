import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

async function cancelPayment(profileId, paymentId) {
  if (!paymentId) {
    return { payment: null, status: 'missing-payment' };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { payment: null, status: 'missing-service-client' };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id,status,amount_cents,currency,rental_request_id,agents!payments_agent_id_fkey(name,slug)')
    .eq('id', paymentId)
    .eq('user_id', profileId)
    .maybeSingle();

  if (!payment) {
    return { payment: null, status: 'not-found' };
  }

  if (payment.status === 'pending') {
    const { data: updatedPayment, error } = await supabase
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('id', payment.id)
      .eq('user_id', profileId)
      .eq('status', 'pending')
      .select('id,status,amount_cents,currency,rental_request_id,agents!payments_agent_id_fkey(name,slug)')
      .maybeSingle();

    if (error) {
      return { payment, status: 'cancel-failed' };
    }

    return { payment: updatedPayment ?? payment, status: 'cancelled' };
  }

  return { payment, status: payment.status };
}

export default async function CheckoutCancelPage({ searchParams }) {
  const query = searchParams ? await searchParams : {};
  const paymentId = typeof query?.payment_id === 'string' ? query.payment_id : '';
  const profile = await requireAuth('en', '/en/checkout/cancel');
  const { payment, status } = await cancelPayment(profile.id, paymentId);
  const agent = Array.isArray(payment?.agents) ? payment.agents[0] : payment?.agents;
  const agentPath = agent?.slug ? `/en/agents/${agent.slug}` : '/en/marketplace';

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8 text-center">
          <p className="font-label mb-2 text-xs text-[#F59E0B]">Checkout cancelled</p>
          <h1 className="font-display text-3xl font-bold text-[#F4EFFA]">
            No access was created
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#C8B1E4]">
            {status === 'cancelled'
              ? 'The pending payment has been marked as cancelled. You can restart from the agent detail page.'
              : 'The checkout did not complete or has already been handled. Check your orders if needed.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={agentPath}>
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">Back to agent</Button>
            </Link>
            <Link href="/en/dashboard">
              <Button variant="outline" className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                View orders
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
