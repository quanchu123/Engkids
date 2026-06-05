'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/auth-client';
import { getCurrentAdmin } from '@/lib/admin-auth-client';

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
        const admin = await getCurrentAdmin();

        if (!isMounted) return;

        if (admin) {
          setAuthorized(true);
          return;
        }

        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;

        router.push(user ? '/progress' : '/login');
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
