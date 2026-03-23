/**
 * Admin Authentication Client
 * Client-side auth helpers using JWT tokens
 */

'use client';

import { AdminUser } from '@/services/admin-auth';

const ACCESS_TOKEN_KEY = 'admin_access_token';

interface LoginResponse {
  success: boolean;
  admin: AdminUser;
  accessToken: string;
}

/**
 * Login admin with email/password
 */
export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include', // Important for cookies
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  // Store access token in memory/sessionStorage (NOT localStorage for security)
  sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);

  return data;
}

/**
 * Logout admin
 */
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
 * Get current access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Refresh access token using refresh token cookie
 */
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

/**
 * Check if admin is authenticated
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  // First check if we have an access token
  let token = getAccessToken();
  
  if (!token) {
    // Try to refresh
    token = await refreshToken();
  }

  if (!token) {
    return false;
  }

  // Verify token is valid by calling /api/admin/me
  try {
    const response = await fetch('/api/admin/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token expired, try refresh
      token = await refreshToken();
      if (!token) return false;

      // Retry with new token
      const retryResponse = await fetch('/api/admin/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return retryResponse.ok;
    }

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get current admin user
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  let token = getAccessToken();

  if (!token) {
    token = await refreshToken();
  }

  if (!token) return null;

  try {
    const response = await fetch('/api/admin/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try refresh
        token = await refreshToken();
        if (!token) return null;

        const retryResponse = await fetch('/api/admin/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!retryResponse.ok) return null;
        const data = await retryResponse.json();
        return data.admin;
      }
      return null;
    }

    const data = await response.json();
    return data.admin;
  } catch {
    return null;
  }
}

/**
 * Get auth header for API requests
 */
export function getAuthHeader(): { Authorization: string } | Record<string, never> {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Make authenticated API request
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = getAccessToken();

  if (!token) {
    token = await refreshToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  // If 401, try refresh and retry once
  if (response.status === 401) {
    token = await refreshToken();
    if (!token) {
      throw new Error('Session expired');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  return response;
}
