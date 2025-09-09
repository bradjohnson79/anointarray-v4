
'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { PaymentProvider } from '@/contexts/payment-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Capture affiliate referral codes from URL and persist as cookie (30 days)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get('ref') || url.searchParams.get('aff') || url.searchParams.get('affiliate');
      if (ref) {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `an_aff=${encodeURIComponent(ref)}; path=/; expires=${expires}; SameSite=Lax`;
      }
    } catch {}
  }, []);

  if (!hasMounted) {
    return null;
  }

  return (
    <SessionProvider>
      <PaymentProvider>
        {children}
      </PaymentProvider>
    </SessionProvider>
  );
}
