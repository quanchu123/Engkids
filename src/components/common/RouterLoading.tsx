'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function RouterLoadingInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1">
      <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 animate-pulse" />
    </div>
  );
}

export default function RouterLoading() {
  return (
    <Suspense>
      <RouterLoadingInner />
    </Suspense>
  );
}
