/**
 * Admin Authentication Client
 * Supports both legacy admin JWT and the current Supabase admin session flow.
 */

'use client';

import { getSupabaseClient } from '@/lib/auth-client';
import type { ResolvedAdminUser } from '@/lib/admin-access';
import type { AdminUser } from '@/services/admin-auth';

const ACCESS_TOKEN_KEY = 'admin_access_token';

type CurrentAdmin = AdminUser | ResolvedAdminUser;

interface LoginResponse {
  success: boolean;
  admin: CurrentAdmin;
  accessToken: string;
}

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function isJwtUsable(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    if (!payload) return false;
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalizedPayload)) as { exp?: number };
    if (!decoded.exp) return true;
    // Refresh one minute early so uploads do not start with a nearly-expired token.
    return decoded.exp * 1000 > Date.now() + 60_000;
  } catch {
    return false;
  }
}

async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function fetchAdminMe(token?: string): Promise<Response> {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  return fetch('/api/admin/me', {
    headers,
    credentials: 'include',
  });
}

export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  return data;
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

/**
 * Legacy accessor kept for compatibility with existing imports.
 * This returns only the stored JWT, not the Supabase session token.
 */
export function getAccessToken(): string | null {
  return getStoredAccessToken();
}

export async function refreshToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/admin/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      return null;
    }

    const data = await response.json();
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    return data.accessToken;
  } catch {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return null;
  }
}

export async function getAnyAccessToken(): Promise<string | null> {
  const legacyToken = getStoredAccessToken();
  if (legacyToken && isJwtUsable(legacyToken)) {
    return legacyToken;
  }
  if (legacyToken) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  const supabaseToken = await getSupabaseAccessToken();
  if (supabaseToken) {
    return supabaseToken;
  }

  return refreshToken();
}

export async function isAdminAuthenticated(): Promise<boolean> {
  let token = await getAnyAccessToken();
  let response = await fetchAdminMe(token || undefined);

  if (response.ok) {
    return true;
  }

  if (response.status === 401) {
    const refreshedToken = await refreshToken();
    if (!refreshedToken || refreshedToken === token) {
      return false;
    }

    token = refreshedToken;
    response = await fetchAdminMe(token);
    return response.ok;
  }

  return false;
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  let token = await getAnyAccessToken();
  let response = await fetchAdminMe(token || undefined);

  if (!response.ok && response.status === 401) {
    const refreshedToken = await refreshToken();
    if (!refreshedToken || refreshedToken === token) {
      return null;
    }

    token = refreshedToken;
    response = await fetchAdminMe(token);
  }

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.admin;
}

export function getAuthHeader(): { Authorization: string } | Record<string, never> {
  const token = getStoredAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let token = await getAnyAccessToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const refreshedToken = await refreshToken();
    if (!refreshedToken || refreshedToken === token) {
      throw new Error('Session expired');
    }

    token = refreshedToken;
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return response;
}
