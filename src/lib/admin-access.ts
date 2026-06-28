import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isAdminEmail } from '@/config/admin';
import { normalizeAdminRole, type AdminRole } from '@/lib/admin-roles';

export type { AdminRole };

export interface ResolvedAdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  source: 'supabase' | 'legacy_jwt';
}

interface ProfileRoleRow {
  role?: string | null;
}

export async function resolveSupabaseAdminUser(
  supabase: SupabaseClient,
  user: User,
): Promise<ResolvedAdminUser | null> {
  if (!user.email) {
    return null;
  }

  let role: AdminRole | null =
    normalizeAdminRole(user.app_metadata?.role) ||
    normalizeAdminRole(user.app_metadata?.admin_role) ||
    (isAdminEmail(user.email) ? 'admin' : null);

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('auth_id', user.id)
      .maybeSingle() as { data: ProfileRoleRow | null };

    const normalizedRole = normalizeAdminRole(profile?.role);
    if (normalizedRole) {
      role = normalizedRole;
    }
  } catch {
    // user_profiles may not exist or may not include a role column
  }

  if (!role) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.user_metadata?.full_name || null,
    role,
    source: 'supabase',
  };
}
