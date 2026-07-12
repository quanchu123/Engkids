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
  email?: string | null;
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
  address?: string | null;
  role?: string | null;
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
  parentName: string;
  childAge: number | null;
  accountType: string;
  isPremium: boolean;
  premiumUntil: string | null;
  location: string;
  emailConfirmedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  updatedAt: string | null;
  isAnonymous: boolean;
  hasProfile: boolean;
};

type AdminUsersPatchBody = {
  authId?: unknown;
  updates?: Record<string, unknown>;
};

const PROFILE_SELECTS = [
  'auth_id, email, name, parent_name, child_age, account_type, premium_until, is_premium, avatar_url, address, role, created_at, updated_at',
  'auth_id, email, name, parent_name, child_age, account_type, premium_until, is_premium, avatar_url, address, created_at, updated_at',
  'auth_id, email, name, account_type, premium_until, is_premium, avatar_url, address, role, created_at, updated_at',
  'auth_id, email, name, account_type, premium_until, is_premium, avatar_url, address, created_at, updated_at',
];

const FALLBACK_LOCATIONS = [
  'Sơn Tây, Hà Nội',
  'Thạch Thất, Hà Nội',
  'Hòa Lạc, Hà Nội',
  'Cầu Giấy, Hà Nội',
  'Thanh Xuân, Hà Nội',
  'Nam Từ Liêm, Hà Nội',
  'Bắc Từ Liêm, Hà Nội',
  'Đống Đa, Hà Nội',
  'Hoàn Kiếm, Hà Nội',
  'Long Biên, Hà Nội',
  'Gia Lâm, Hà Nội',
  'Hà Đông, Hà Nội',
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

function normalizeText(value: unknown, maxLength: number): string | null {
  const text = getString(value);
  if (!text) return null;
  return text.slice(0, maxLength);
}

function normalizeEmail(value: unknown): string | null {
  const text = normalizeText(value, 320);
  return text ? text.toLowerCase() : null;
}

function normalizeChildAge(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const age = getNumber(value);
  if (age === null) return null;
  return Math.max(1, Math.min(18, age));
}

function getShortLabel(value: string): string {
  const cleaned = value
    .split('@')[0]
    .replace(/[^a-zA-Z0-9À-ỹ\s._-]/g, ' ')
    .replace(/[._-]+/g, ' ')
    .trim();

  const firstToken = cleaned.split(/\s+/).find(Boolean) || 'Khach';
  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase();
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
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

function getProfileRole(profile: ProfileRow | null): string | null {
  return getString(profile?.role)?.toLowerCase() || null;
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

function getParentName(user: AuthUserRow, profile: ProfileRow | null): string {
  const actual =
    getString(profile?.parent_name) ||
    getString(user.user_metadata?.parent_name) ||
    getString(user.user_metadata?.parentName);
  if (actual) return actual;

  const seed = getString(user.email)?.split('@')[0] || user.id;
  return `Phụ huynh ${getShortLabel(seed)}`;
}

function getStoredParentName(user: AuthUserRow, profile: ProfileRow | null): string | null {
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
  const accountType = getString(profile?.account_type)?.toLowerCase();
  if (accountType) return accountType;

  if (profile?.is_premium) return 'premium';
  if (profile?.premium_until && new Date(profile.premium_until).getTime() > Date.now()) return 'premium';
  return 'free';
}

function isPremiumAccount(profile: ProfileRow | null): boolean {
  if (profile?.is_premium) return true;
  if (getString(profile?.account_type)?.toLowerCase() === 'premium') return true;
  if (!profile?.premium_until) return false;
  return new Date(profile.premium_until).getTime() > Date.now();
}

function getLocation(user: AuthUserRow, profile: ProfileRow | null): string {
  const actual =
    getString(profile?.address) ||
    getString(user.user_metadata?.address) ||
    getString(user.user_metadata?.location);
  if (actual) return actual;

  const seed = [
    getString(profile?.parent_name),
    getString(user.user_metadata?.parent_name),
    getString(user.email),
    user.id,
  ]
    .filter((value): value is string => Boolean(value))
    .join('|');

  const index = hashSeed(seed || user.id) % FALLBACK_LOCATIONS.length;
  return FALLBACK_LOCATIONS[index];
}

function getStoredLocation(user: AuthUserRow, profile: ProfileRow | null): string | null {
  return (
    getString(profile?.address) ||
    getString(user.user_metadata?.address) ||
    getString(user.user_metadata?.location)
  );
}

function mapUser(user: AuthUserRow, profile: ProfileRow | null): AdminUserRow {
  const premiumUntil = getString(profile?.premium_until);
  const accountType = getAccountType(profile);
  const isPremium = isPremiumAccount(profile);

  return {
    id: user.id,
    authId: user.id,
    email: getString(profile?.email) || user.email || null,
    name: getDisplayName(user, profile),
    provider: getProvider(user),
    role: getProfileRole(profile) || getString(user.role)?.toLowerCase() || 'authenticated',
    parentName: getParentName(user, profile),
    childAge: getChildAge(user, profile),
    accountType: isPremium && accountType !== 'premium' ? 'premium' : accountType,
    isPremium,
    premiumUntil,
    location: getLocation(user, profile),
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

export async function PATCH(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as AdminUsersPatchBody;
    const authId = getString(body.authId);
    const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};

    if (!authId) {
      return NextResponse.json({ error: 'authId is required' }, { status: 400 });
    }

    const hasName = Object.prototype.hasOwnProperty.call(updates, 'name');
    const hasEmail = Object.prototype.hasOwnProperty.call(updates, 'email');
    const hasParentName = Object.prototype.hasOwnProperty.call(updates, 'parentName');
    const hasChildAge = Object.prototype.hasOwnProperty.call(updates, 'childAge');
    const hasLocation = Object.prototype.hasOwnProperty.call(updates, 'location');

    const nextName = hasName ? normalizeText(updates.name, 120) : null;
    const nextEmail = hasEmail ? normalizeEmail(updates.email) : null;
    const nextParentName = hasParentName ? normalizeText(updates.parentName, 120) : null;
    const nextChildAge = hasChildAge ? normalizeChildAge(updates.childAge) : null;
    const nextLocation = hasLocation ? normalizeText(updates.location, 200) : null;

    if (hasName && !nextName) {
      return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 });
    }

    if (hasEmail && !nextEmail) {
      return NextResponse.json({ error: 'Email không được để trống' }, { status: 400 });
    }

    if (hasChildAge) {
      const rawChildAge = typeof updates.childAge === 'string' ? updates.childAge.trim() : String(updates.childAge ?? '').trim();
      if (rawChildAge && nextChildAge === null) {
        return NextResponse.json({ error: 'Tuổi không hợp lệ' }, { status: 400 });
      }
    }

    const { data: currentUserData, error: currentUserError } = await admin.auth.admin.getUserById(authId);
    if (currentUserError || !currentUserData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUser = currentUserData.user;
    const currentProfile = (await fetchProfilesForUsers(admin, [authId])).get(authId) || null;
    const currentEmail = getString(currentUser.email);

    const metadata = currentUser.user_metadata && typeof currentUser.user_metadata === 'object'
      ? { ...currentUser.user_metadata }
      : {};

    const resolvedName = hasName && nextName ? nextName : getDisplayName(currentUser, currentProfile);
    const resolvedEmail = hasEmail && nextEmail ? nextEmail : currentEmail;
    const resolvedParentName = hasParentName ? nextParentName : getStoredParentName(currentUser, currentProfile);
    const resolvedChildAge = hasChildAge ? nextChildAge : getChildAge(currentUser, currentProfile);
    const resolvedLocation = hasLocation ? nextLocation : getStoredLocation(currentUser, currentProfile);

    if (hasName) {
      metadata.name = nextName;
      metadata.full_name = nextName;
    }

    if (hasParentName) {
      metadata.parent_name = nextParentName;
      metadata.parentName = nextParentName;
    }

    if (hasChildAge) {
      metadata.child_age = nextChildAge === null ? null : String(nextChildAge);
      metadata.childAge = nextChildAge === null ? null : String(nextChildAge);
    }

    if (hasLocation) {
      metadata.address = nextLocation;
      metadata.location = nextLocation;
    }

    if (hasEmail) {
      metadata.email = nextEmail;
    }

    const authUpdate: Parameters<typeof admin.auth.admin.updateUserById>[1] = {
      user_metadata: metadata,
    };

    if (nextEmail && nextEmail !== currentEmail) {
      authUpdate.email = nextEmail;
      authUpdate.email_confirm = true;
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(authId, authUpdate);
    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update user' }, { status: 400 });
    }

    const profilePayload = {
      auth_id: authId,
      email: resolvedEmail,
      name: resolvedName,
      parent_name: resolvedParentName,
      child_age: resolvedChildAge,
      address: resolvedLocation,
    };

    const { error: profileError } = await admin
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'auth_id' });

    if (profileError) {
      return NextResponse.json({ error: profileError.message || 'Failed to update profile' }, { status: 400 });
    }

    const { data: refreshedUserData, error: refreshedUserError } = await admin.auth.admin.getUserById(authId);
    if (refreshedUserError || !refreshedUserData?.user) {
      return NextResponse.json({ error: 'Failed to reload user after update' }, { status: 500 });
    }

    const refreshedProfile = (await fetchProfilesForUsers(admin, [authId])).get(authId) || null;

    return NextResponse.json(
      { user: mapUser(refreshedUserData.user, refreshedProfile) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Admin users PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
