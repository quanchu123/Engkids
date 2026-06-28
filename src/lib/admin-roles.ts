export type AdminRole = 'admin' | 'super_admin' | 'god';

export const ADMIN_UNLIMITED_UNTIL = '9999-12-31T23:59:59Z';

export function normalizeAdminRole(role: string | null | undefined): AdminRole | null {
  if (role === 'admin' || role === 'super_admin' || role === 'god') {
    return role;
  }
  return null;
}

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return normalizeAdminRole(role) !== null;
}
