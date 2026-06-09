'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChange } from '@/lib/auth-client';

const EXCLUDED_PREFIXES = [
  '/admin',
  '/api',
  '/auth',
  '/login',
  '/onboarding/level',
];

export default function LevelOnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const shouldSkip = EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (shouldSkip) return undefined;

    const subscription = onAuthStateChange((user) => {
      if (!user) return;
      fetch('/api/learner/level', { credentials: 'include', cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!cancelled && data?.needsSelection) {
            router.replace(`/onboarding/level?next=${encodeURIComponent(pathname || '/learn/today')}`);
          }
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
