/**
 * Shared Auth Helper for API Routes
 * Verifies both Admin JWT and Supabase JWT tokens
 */

import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/services/admin-auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isAdminEmail } from '@/config/admin';

/**
 * Create Supabase server client (reusable helper)
 */
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
    }
  );
}

/**
 * Check if request is authenticated as admin
 * Supports:
 * 1. Admin JWT token from /api/admin/login
 * 2. Supabase JWT token from Google OAuth
 * 3. Supabase session cookies
 */
export async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  // Method 1: Check JWT token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    
    // Try admin JWT first (synchronous, fast)
    try {
      verifyAccessToken(token);
      return true;
    } catch {
      // Not admin JWT, try Supabase
    }
    
    // Try Supabase JWT
    try {
      const supabase = getSupabaseServer();
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user?.email && isAdminEmail(user.email)) {
        return true;
      }
    } catch {
      // Supabase JWT verification failed
    }
  }
  
  // Method 2: Check Supabase session from cookies (fallback)
  try {
    const supabase = getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email && isAdminEmail(user.email)) {
      return true;
    }
    
    // Check profile role
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('auth_id', user.id)
        .single();
        
      if (profile?.role === 'admin') {
        return true;
      }
    }
  } catch {
    // Supabase check failed
  }
  
  return false;
}
