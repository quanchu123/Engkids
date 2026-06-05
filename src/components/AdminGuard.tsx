'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/auth-client';
import { isAdminAuthenticated } from '@/lib/admin-auth-client';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkUserRole = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!user) {
          router.push('/login');
          setAuthorized(false);
          return;
        }

        // Resolve admin via the server-side check (/api/admin/me reads
        // ADMIN_EMAILS on the server) so we don't depend on
        // NEXT_PUBLIC_ADMIN_EMAILS being baked into the client bundle.
        const isAdmin = await isAdminAuthenticated();
        if (!isMounted) return;

        if (isAdmin) {
          setAuthorized(true);
          return;
        }

        if (!isMounted) return;
        router.push('/progress');
        setAuthorized(false);
      } catch (err: unknown) {
        // Supabase auth-js throws AbortError when component unmounts during lock acquisition
        if (err instanceof Error && err.name === 'AbortError') return;
        throw err;
      }
    };

    checkUserRole();
    return () => { isMounted = false; };
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-600 animate-spin" />
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
