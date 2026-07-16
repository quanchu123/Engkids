import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/api-auth';
import { isAdminRole } from '@/lib/admin-roles';
import { getRequestAuthUserId } from '@/lib/server/request-auth';

/**
 * True when the request may open full premium content (stories / music / videos).
 * Admin JWT / admin role / active premium subscription.
 */
export async function canAccessPremiumStories(request?: NextRequest): Promise<boolean> {
  return canAccessPremiumContent(request);
}

/** Alias used by video/music routes. */
export async function canAccessPremiumContent(request?: NextRequest): Promise<boolean> {
  if (request && (await checkAdminAuth(request).catch(() => false))) {
    return true;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  let userId: string | null = null;
  if (request) {
    userId = await getRequestAuthUserId(request);
  } else {
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
      if (
        user &&
        (isAdminRole(user.app_metadata?.role) || isAdminRole(user.app_metadata?.admin_role))
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  if (!userId) return false;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const reader = createClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await reader
    .from('user_profiles')
    .select('account_type, is_premium, premium_until, role')
    .eq('auth_id', userId)
    .maybeSingle();

  if (isAdminRole(profile?.role) || profile?.account_type === 'admin') {
    return true;
  }

  const until = profile?.premium_until ? new Date(profile.premium_until) : null;
  return (
    (profile?.is_premium === true || profile?.account_type === 'premium') &&
    !!until &&
    until > new Date()
  );
}
