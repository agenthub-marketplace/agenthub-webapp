import Link from 'next/link';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { fulfillCheckoutSession, markPaymentCancelled } from '@/server/payments/fulfillment';
import { retrieveStripeCheckoutSession } from '@/server/payments/stripe';
import CheckoutSuccessClient from '../checkout-success-client';

async function getPayment(profileId, sessionId) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const loadPayment = () =>
    supabase
      .from('payments')
      .select('status,rental_request_id,activation_error')
      .eq('user_id', profileId)
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();

  let { data } = await loadPayment();

  if (data?.status === 'pending') {
    try {
      const checkoutSession = await retrieveStripeCheckoutSession(sessionId);

      if (checkoutSession.payment_status === 'paid') {
        await fulfillCheckoutSession(checkoutSession);
      } else if (checkoutSession.status === 'expired') {
        await markPaymentCancelled(sessionId);
      }

      const refreshed = await loadPayment();
      data = refreshed.data ?? data;
    } catch {
      return data ?? null;
    }
  }

  return data ?? null;
}

export default async function CheckoutSuccessPage({ searchParams }) {
  const query = searchParams ? await searchParams : {};
  const sessionId = typeof query?.session_id === 'string' ? query.session_id : '';
  const profile = await requireAuth('fr', '/checkout/success');
  const payment = sessionId ? await getPayment(profile.id, sessionId) : null;

  if (payment?.status === 'paid' && payment.rental_request_id) {
    redirect(`/workspace/${payment.rental_request_id}?access=created`);
  }

  const activationBlocked =
    payment?.status === 'paid_blocked' ||
    payment?.status === 'failed' ||
    payment?.status === 'cancelled' ||
    (payment?.status === 'paid' && !payment.rental_request_id);
  const activationBlockedMessage =
    payment?.status === 'paid_blocked' || (payment?.status === 'paid' && !payment.rental_request_id)
      ? 'Paiement reçu, mais l’activation de l’accès nécessite une vérification. Contactez le support AgentHub avant de relancer.'
      : 'Le paiement ne peut pas activer cet agent pour le moment. Il a peut-être été suspendu ou retiré pendant le checkout. Contactez l’équipe AgentHub avant de relancer.';

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8 text-center">
          <p className={`font-label mb-2 text-xs ${activationBlocked ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
            {activationBlocked ? 'Activation bloquée' : 'Paiement reçu'}
          </p>
          <h1 className="font-display text-3xl font-bold text-[#F4EFFA]">
            {activationBlocked ? 'Votre accès n’a pas été activé' : 'Activation en cours'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#C8B1E4]">
            {activationBlocked
              ? activationBlockedMessage
              : 'Stripe a confirmé le paiement. Cette page vérifie automatiquement la création de l’accès et vous redirige dès que le webhook a terminé.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {!activationBlocked && <CheckoutSuccessClient />}
            <Link href="/dashboard">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">Voir mon dashboard</Button>
            </Link>
            <Link href="/workspace">
              <Button variant="outline" className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                Mes agents
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
