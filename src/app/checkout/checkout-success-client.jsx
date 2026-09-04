'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccessClient({ label = 'Vérifier maintenant', localePrefix = '', seconds = 2 }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(false);
  const [isTerminal, setIsTerminal] = useState(false);
  const sessionId = searchParams.get('session_id') || '';

  const checkStatus = useCallback(async () => {
    if (!sessionId) {
      router.refresh();
      return;
    }

    setIsChecking(true);

    try {
      const response = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`, {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => null);

      if (data?.status === 'paid' && data.rentalRequestId) {
        window.location.assign(`${localePrefix}/workspace/${data.rentalRequestId}?access=created`);
        return;
      }

      if (data?.status === 'paid_blocked' || data?.status === 'failed' || data?.status === 'cancelled') {
        setIsTerminal(true);
        router.refresh();
        return;
      }

      if (data?.status === 'paid' && !data.rentalRequestId) {
        setIsTerminal(true);
        router.refresh();
        return;
      }

      if (data?.status && data.status !== 'pending') {
        setIsTerminal(true);
      }

      router.refresh();
    } finally {
      window.setTimeout(() => setIsChecking(false), 800);
    }
  }, [localePrefix, router, sessionId]);

  useEffect(() => {
    if (isTerminal) {
      return;
    }

    const interval = window.setInterval(() => {
      checkStatus();
    }, seconds * 1000);

    return () => window.clearInterval(interval);
  }, [checkStatus, isTerminal, seconds]);

  return (
    <Button
      type="button"
      disabled={isTerminal}
      onClick={checkStatus}
      variant="outline"
      className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]"
    >
      {isTerminal ? 'Activation impossible' : isChecking ? 'Vérification...' : label}
    </Button>
  );
}
