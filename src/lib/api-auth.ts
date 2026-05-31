/**
 * Shared Auth Helper for API Routes
 * Resolves admin access from either legacy admin JWT or Supabase auth
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminById, verifyAccessToken } from '@/services/admin-auth';
import { resolveSupabaseAdminUser, type ResolvedAdminUser } from '@/lib/admin-access';

function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
}

async function getSupabaseAdminFromToken(token: string): Promise<ResolvedAdminUser | null> {
  try {
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return null;
    }

    return resolveSupabaseAdminUser(supabase, user);
  } catch {
    return null;
  }
}

async function getSupabaseAdminFromCookies(): Promise<ResolvedAdminUser | null> {
  try {
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return resolveSupabaseAdminUser(supabase, user);
  } catch {
    return null;
  }
}

export async function getAdminAuthUser(request: NextRequest): Promise<ResolvedAdminUser | null> {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      const payload = verifyAccessToken(token);
      const admin = await getAdminById(payload.sub);
      if (admin) {
        return {
          ...admin,
          source: 'legacy_jwt',
        };
      }
    } catch {
      // Not a legacy admin JWT. Fall through to Supabase bearer verification.
    }

    const supabaseAdmin = await getSupabaseAdminFromToken(token);
    if (supabaseAdmin) {
      return supabaseAdmin;
    }
  }

  return getSupabaseAdminFromCookies();
}

export async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  const adminUser = await getAdminAuthUser(request);
  return Boolean(adminUser);
}

