import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { resolveSupabaseAdminUser } from '@/lib/admin-access';
import { ADMIN_UNLIMITED_UNTIL, isAdminRole } from '@/lib/admin-roles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProfileRow {
  auth_id: string;
  email: string | null;
  name: string | null;
  parent_name: string | null;
  child_age: number | null;
  parent_age: number | null;
  gender: string | null;
  address: string | null;
  account_type: string | null;
  is_premium: boolean | null;
  premium_until: string | null;
  role: string | null;
}

function getSupabaseServerClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || null;
}

function normalizeAge(value: unknown, min: number, max: number): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function isPremiumActive(
  profile: Pick<ProfileRow, 'account_type' | 'is_premium' | 'premium_until' | 'role'>,
  isAdminUser = false,
): boolean {
  if (isAdminUser || isAdminRole(profile.role) || profile.account_type === 'admin') {
    return true;
  }

  return (
    (profile.is_premium === true || profile.account_type === 'premium') &&
    !!profile.premium_until &&
    new Date(profile.premium_until) > new Date()
  );
}

function premiumPayload(
  profile: Pick<ProfileRow, 'account_type' | 'is_premium' | 'premium_until' | 'role'> | null,
  isAdminUser: boolean,
) {
  const active = profile ? isPremiumActive(profile, isAdminUser) : isAdminUser;
  const isUnlimitedAdmin = isAdminUser || isAdminRole(profile?.role) || profile?.account_type === 'admin';

  return {
    active,
    until: isUnlimitedAdmin ? ADMIN_UNLIMITED_UNTIL : profile?.premium_until ?? null,
    accountType: isUnlimitedAdmin ? 'admin' : profile?.account_type ?? 'free',
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await resolveSupabaseAdminUser(supabase, user);

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('auth_id, email, name, parent_name, child_age, parent_age, gender, address, account_type, is_premium, premium_until, role')
      .eq('auth_id', user.id)
      .maybeSingle<ProfileRow>();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      profile: profile ?? {
        auth_id: user.id,
        email: user.email ?? null,
        name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
        parent_name: null,
        child_age: null,
        parent_age: null,
        gender: null,
        address: null,
        account_type: 'free',
        is_premium: false,
        premium_until: null,
        role: admin?.role ?? 'user',
      },
      premium: premiumPayload(profile, Boolean(admin)),
      email: user.email ?? profile?.email ?? null,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Account profile GET error:', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await resolveSupabaseAdminUser(supabase, user);

    const body = await request.json().catch(() => ({}));
    const name = normalizeText(body.name, 80);
    const parentName = normalizeText(body.parentName, 80);
    const childAge = normalizeAge(body.childAge, 1, 18);
    const parentAge = normalizeAge(body.parentAge, 18, 100);
    const gender = ['male', 'female', 'other'].includes(body.gender) ? body.gender : null;
    const address = normalizeText(body.address, 200);

    if (!name || childAge === null) {
      return NextResponse.json({ error: 'Vui lòng nhập họ tên và tuổi của trẻ.' }, { status: 400 });
    }

    const payload = {
      auth_id: user.id,
      email: user.email ?? null,
      name,
      parent_name: parentName,
      child_age: childAge,
      parent_age: parentAge,
      gender,
      address,
    };

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'auth_id' })
      .select('auth_id, email, name, parent_name, child_age, parent_age, gender, address, account_type, is_premium, premium_until, role')
      .single<ProfileRow>();

    if (error) {
      throw error;
    }

    await supabase.auth.updateUser({
      data: {
        name,
        parent_name: parentName,
        child_age: String(childAge),
        parent_age: parentAge ? String(parentAge) : undefined,
        gender: gender ?? undefined,
        address: address ?? undefined,
      },
    });

    return NextResponse.json({
      profile,
      premium: premiumPayload(profile, Boolean(admin)),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Account profile PUT error:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
