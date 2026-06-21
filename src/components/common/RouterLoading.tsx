'use client';

import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const MIN_LOADING_MS = 520;

function RouterLoadingInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(false);
  const loadingStartedAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLoading = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    loadingStartedAtRef.current = Date.now();
    setIsLoading(true);
  };

  useEffect(() => {
    const handleRouteIntent = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isSameOrigin = nextUrl.origin === currentUrl.origin;
      const isSamePage = nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search;
      if (!isSameOrigin || isSamePage) return;

      showLoading();
    };

    const handlePopState = () => showLoading();

    document.addEventListener('click', handleRouteIntent, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleRouteIntent, true);
      window.removeEventListener('popstate', handlePopState);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (!isLoading) {
      showLoading();
    }

    const elapsed = Date.now() - loadingStartedAtRef.current;
    const remaining = Math.max(160, MIN_LOADING_MS - elapsed);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      hideTimerRef.current = null;
    }, remaining);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[9999] h-1 overflow-hidden bg-violet-100/80">
        <div className="h-full w-2/3 animate-[pulse_0.9s_ease-in-out_infinite] rounded-r-full bg-gradient-to-r from-violet-500 via-pink-500 to-amber-400" />
      </div>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex justify-center px-4">
        <div className="flex min-h-[58px] items-center gap-3 rounded-full border border-white/80 bg-white/92 px-4 py-2 shadow-[0_18px_45px_rgba(124,58,237,0.20)] backdrop-blur-xl">
          <div className="relative h-10 w-10">
            <div className="absolute -inset-1 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
            <div className="relative h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-violet-100 to-pink-100 p-1.5">
              <Image src="/engkids-logo.png" alt="Engkids" width={40} height={40} className="h-full w-full object-contain" priority />
            </div>
          </div>
          <div className="min-w-0 pr-1">
            <p className="text-sm font-black leading-tight text-slate-950">Engkids</p>
            <p className="text-xs font-bold leading-tight text-violet-500">Đang mở trang...</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function RouterLoading() {
  return (
    <Suspense>
      <RouterLoadingInner />
    </Suspense>
  );
}
