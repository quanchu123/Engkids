'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/auth-client';
import { isAdminEmail } from '@/config/admin';

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

        // Method 1: Check if email is admin (uses isAdminEmail which allows all in dev mode)
        if (user.email && isAdminEmail(user.email)) {
          setAuthorized(true);
          return;
        }

        // Method 2: Check profile role (if column exists)
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('auth_id', user.id)
            .single() as { data: { role?: string } | null };

          if (!isMounted) return;

          if (profile?.role === 'admin') {
            setAuthorized(true);
            return;
          }
        } catch {
          // role column might not exist, that's ok
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
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
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
