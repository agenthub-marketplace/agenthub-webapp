'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccessClient({ label = 'Vérifier maintenant', seconds = 2 }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, seconds * 1000);

    return () => window.clearInterval(interval);
  }, [router, seconds]);

  return (
    <Button
      type="button"
      onClick={() => {
        setIsChecking(true);
        router.refresh();
        window.setTimeout(() => setIsChecking(false), 800);
      }}
      variant="outline"
      className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]"
    >
      {isChecking ? 'Vérification...' : label}
    </Button>
  );
}
