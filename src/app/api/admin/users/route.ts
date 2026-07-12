import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const PAGE_SIZE = 200;
const MAX_USERS = 5000;

type AuthUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  role?: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  is_anonymous?: boolean | null;
  banned_until?: string | null;
  updated_at?: string | null;
};

type ProfileRow = {
  auth_id: string | null;
  email: string | null;
  name: string | null;
  parent_name?: string | null;
  child_age?: number | null;
  account_type?: string | null;
  premium_until?: string | null;
  is_premium?: boolean | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AdminUserRow = {
  id: string;
  authId: string;
  email: string | null;
  name: string;
  provider: string | null;
  role: string;
  parentName: string | null;
  childAge: number | null;
  accountType: string;
  isPremium: boolean;
  premiumUntil: string | null;
  emailConfirmedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  updatedAt: string | null;
  isAnonymous: boolean;
  hasProfile: boolean;
};

const PROFILE_SELECTS = [
  'auth_id, email, name, parent_name, child_age, account_type, premium_until, is_premium, avatar_url, created_at, updated_at',
  'auth_id, email, name, account_type, premium_until, is_premium, avatar_url, created_at, updated_at',
];

function getAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    },
  });
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.floor(parsed) : null;
  }
  return null;
}

function getProvider(user: AuthUserRow): string | null {
  const appProvider = getString(user.app_metadata?.provider);
  if (appProvider) return appProvider;

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers)) {
    const first = providers.find((item) => typeof item === 'string' && item.trim());
    if (typeof first === 'string') return first.trim();
  }

  return getString(user.user_metadata?.provider) || getString(user.user_metadata?.auth_provider);
}

function getDisplayName(user: AuthUserRow, profile: ProfileRow | null): string {
  return (
    getString(profile?.name) ||
    getString(user.user_metadata?.name) ||
    getString(user.user_metadata?.full_name) ||
    getString(user.email) ||
    user.id
  );
}

function getParentName(user: AuthUserRow, profile: ProfileRow | null): string | null {
  return (
    getString(profile?.parent_name) ||
    getString(user.user_metadata?.parent_name) ||
    getString(user.user_metadata?.parentName)
  );
}

function getChildAge(user: AuthUserRow, profile: ProfileRow | null): number | null {
  const profileAge = getNumber(profile?.child_age);
  if (profileAge !== null) return profileAge;

  const metadataAge = getNumber(user.user_metadata?.child_age);
  if (metadataAge !== null) return metadataAge;

  return getNumber(user.user_metadata?.childAge);
}

function getAccountType(profile: ProfileRow | null): string {
  const accountType = getString(profile?.account_type);
  if (accountType) return accountType;

  if (profile?.is_premium) return 'premium';
  if (profile?.premium_until && new Date(profile.premium_until).getTime() > Date.now()) return 'premium';
  return 'free';
}

function isPremiumAccount(profile: ProfileRow | null): boolean {
  if (profile?.is_premium) return true;
  if (getString(profile?.account_type) === 'premium') return true;
  if (!profile?.premium_until) return false;
  return new Date(profile.premium_until).getTime() > Date.now();
}

function mapUser(user: AuthUserRow, profile: ProfileRow | null): AdminUserRow {
  const premiumUntil = getString(profile?.premium_until);
  const accountType = getAccountType(profile);
  const isPremium = isPremiumAccount(profile);

  return {
    id: user.id,
    authId: user.id,
    email: getString(profile?.email) || user.email,
    name: getDisplayName(user, profile),
    provider: getProvider(user),
    role: getString(user.role) || 'authenticated',
    parentName: getParentName(user, profile),
    childAge: getChildAge(user, profile),
    accountType: isPremium && accountType !== 'premium' ? 'premium' : accountType,
    isPremium,
    premiumUntil,
    emailConfirmedAt: getString(user.email_confirmed_at) || getString(user.confirmed_at),
    createdAt: user.created_at,
    lastSignInAt: getString(user.last_sign_in_at),
    updatedAt: getString(profile?.updated_at) || getString(user.updated_at),
    isAnonymous: Boolean(user.is_anonymous),
    hasProfile: Boolean(profile),
  };
}

async function fetchProfilesForUsers(admin: SupabaseClient, authIds: string[]): Promise<Map<string, ProfileRow>> {
  const uniqueIds = Array.from(new Set(authIds.filter(Boolean)));
  const profileMap = new Map<string, ProfileRow>();
  if (uniqueIds.length === 0) return profileMap;

  let lastError: unknown = null;
  for (const columns of PROFILE_SELECTS) {
    const { data, error } = await admin
      .from('user_profiles')
      .select(columns)
      .in('auth_id', uniqueIds);

    if (!error && Array.isArray(data)) {
      for (const row of data as unknown as ProfileRow[]) {
        if (row.auth_id) {
          profileMap.set(row.auth_id, row);
        }
      }
      return profileMap;
    }

    lastError = error;
  }

  if (lastError) {
    throw lastError;
  }

  return profileMap;
}

async function fetchAllUsers(admin: SupabaseClient): Promise<AdminUserRow[]> {
  const rows: AdminUserRow[] = [];
  let page = 1;

  while (rows.length < MAX_USERS) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });

    if (error) {
      throw error;
    }

    const authUsers = (data.users || []) as AuthUserRow[];
    if (authUsers.length === 0) {
      break;
    }

    const profileMap = await fetchProfilesForUsers(admin, authUsers.map((user) => user.id));
    for (const authUser of authUsers) {
      rows.push(mapUser(authUser, profileMap.get(authUser.id) || null));
    }

    if (!data.nextPage || authUsers.length < PAGE_SIZE) {
      break;
    }

    page = data.nextPage;
  }

  return rows
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_USERS);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const users = await fetchAllUsers(admin);
    return NextResponse.json({ users }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin users GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
