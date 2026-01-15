'use client';

import { supabase } from './supabase';
import { useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  role?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to sign in' };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'user',
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin' || user?.email?.endsWith('@admin.com') || false;
}

/**
 * React hook for authentication state
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    // Get initial session
    getCurrentUser().then(user => {
      setState({
        user,
        loading: false,
        isAdmin: user?.role === 'admin' || user?.email?.endsWith('@admin.com') || false,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        const user = session?.user
          ? {
              id: session.user.id,
              email: session.user.email || '',
              role: session.user.user_metadata?.role || 'user',
            }
          : null;

        setState({
          user,
          loading: false,
          isAdmin: user?.role === 'admin' || user?.email?.endsWith('@admin.com') || false,
        });
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Simple local admin auth (fallback if Supabase not configured)
 */
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

export function localAdminAuth(password: string): boolean {
  if (typeof window === 'undefined') return false;
  
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem('admin_auth', 'true');
    return true;
  }
  return false;
}

export function isLocalAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('admin_auth') === 'true';
}

export function localAdminSignOut(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('admin_auth');
}
