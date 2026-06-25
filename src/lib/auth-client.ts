/**
 * Client-side Authentication Helpers
 * Uses Supabase Auth for user authentication
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { authConfig } from '@/config/auth';

// Client-side Supabase instance.
// Uses @supabase/ssr's browser client so the session is persisted in cookies
// (not just localStorage). This lets the server middleware + API routes read
// the same session via cookies; otherwise a logged-in user keeps getting
// redirected back to /login.
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    supabaseClient = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

export { getSupabase as getSupabaseClient };

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider?: string;
}

/**
 * Get current logged in user
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return null;
  
  return {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.name || user.user_metadata?.full_name,
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    provider: user.app_metadata?.provider,
  };
}

/**
 * Get current session
 */
export async function getSession() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign up with email and password
 */
export interface SignUpMetadata {
  name: string;
  parentName?: string;
  childAge?: string;
  parentAge?: string;
  gender?: string;
  address?: string;
}

export async function signUp(email: string, password: string, metadata?: SignUpMetadata | string) {
  const supabase = getSupabase();
  
  // Backward compatibility in case we pass just a string name
  const metaObj = typeof metadata === 'string' ? { name: metadata } : (metadata || { name: '' });
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metaObj.name || email.split('@')[0],
        parent_name: metaObj.parentName,
        child_age: metaObj.childAge,
        parent_age: metaObj.parentAge,
        gender: metaObj.gender,
        address: metaObj.address
      },
    },
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${authConfig.routes.callback}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
export async function signOut(redirectTo: string = '/') {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  
  if (error) throw error;
  
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('kids.progress.v2');
    window.localStorage.removeItem('engkids.premium_cache');
    window.location.href = redirectTo;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const supabase = getSupabase();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          provider: session.user.app_metadata?.provider,
        };
        callback(user);
      } else {
        callback(null);
      }
    }
  );
  
  return subscription;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
