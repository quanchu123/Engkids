'use client';

/**
 * Admin Authentication Service
 * 
 * This file re-exports functions from the new JWT-based auth client.
 * Kept for backwards compatibility with existing components.
 * 
 * For new code, import directly from '@/lib/admin-auth-client'
 */

import { 
  adminLogin, 
  adminLogout, 
  isAdminAuthenticated,
  getAccessToken,
  refreshToken 
} from '@/lib/admin-auth-client';

// Re-export for backwards compatibility
export { 
  adminLogin, 
  adminLogout, 
  isAdminAuthenticated,
  getAccessToken,
  refreshToken 
};

// Alias for old function names
export const localAdminAuth = async (email: string, password: string): Promise<boolean> => {
  const result = await adminLogin(email, password);
  return result.success;
};

// Sync check - only checks if token exists (use isAdminAuthenticated for full check)
export const isLocalAdminAuthenticated = (): boolean => {
  return getAccessToken() !== null;
};

export const localAdminSignOut = async (): Promise<void> => {
  await adminLogout();
};
