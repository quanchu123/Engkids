// API route: GET/PUT the English Farming Game save payload for a logged-in user.
//
// Requirements: 11.1 (save per user), 11.2 (logged-in → Supabase), 13.1 (route).
//
// Auth model:
//  - Writes/reads to `farm_saves` use the SERVICE ROLE Supabase client (mirrors
//    getSupabaseAdmin() in src/services/video.ts) so the server bypasses RLS.
//  - The caller is identified by their Supabase auth user, resolved from EITHER
//    an `Authorization: Bearer <token>` header OR the Supabase auth cookie.
//  - The auth user id is mapped to a `user_profiles` row (by `auth_id`), creating
//    the row if missing — server-side mirror of progress-sync's
//    getOrCreateAuthProfileId(). No valid user → 401.
//
// Anonymous players never reach this route; the client save layer falls back to
// localStorage when there is no logged-in user (see src/game/farm/save/farmSave.ts).

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Max serialized payload size accepted on PUT (defends the DB / abuse). */
const MAX_PAYLOAD_CHARS = 200_000;

/** Service-role Supabase client — server-only, bypasses RLS. */
function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

/**
 * Resolve the Supabase auth user id from the request.
 *
 * Tries a bearer token first (anon client + getUser(token)), then falls back to
 * the Supabase auth cookie. Returns null on any failure so callers respond 401.
 */
async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  // 1) Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const anon = createClient(supabaseUrl, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
        } = await anon.auth.getUser(token);
        if (user?.id) return user.id;
      } catch {
        // fall through to cookie auth
      }
    }
  }

  // 2) Supabase auth cookie
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve (or create) the `user_profiles.id` for a Supabase auth user, using the
 * service-role client. Mirrors progress-sync.getOrCreateAuthProfileId server-side.
 */
async function getOrCreateProfileId(
  admin: SupabaseClient,
  authUserId: string,
): Promise<string | null> {
  const { data: existing } = await admin
    .from('user_profiles')
    .select('id')
    .eq('auth_id', authUserId)
    .maybeSingle();

  if (existing && typeof (existing as { id?: unknown }).id === 'string') {
    return (existing as { id: string }).id;
  }

  // Look up the auth user's email so we can link an existing email-only profile.
  let email: string | null = null;
  try {
    const { data } = await admin.auth.admin.getUserById(authUserId);
    email = data.user?.email ?? null;
  } catch {
    email = null;
  }

  if (email) {
    const { data: byEmail } = await admin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .is('auth_id', null)
      .limit(1)
      .maybeSingle();

    if (byEmail && typeof (byEmail as { id?: unknown }).id === 'string') {
      const profileId = (byEmail as { id: string }).id;
      await admin
        .from('user_profiles')
        .update({ auth_id: authUserId })
        .eq('id', profileId);
      return profileId;
    }
  }

  const { data: inserted, error } = await admin
    .from('user_profiles')
    .insert({ auth_id: authUserId, email })
    .select('id')
    .single();

  if (error || !inserted) {
    return null;
  }

  return (inserted as { id: string }).id;
}

// GET /api/games/farm/save — return { payload } for the logged-in user (or null).
export async function GET(request: NextRequest) {
  let admin: SupabaseClient;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const authUserId = await getAuthUserId(request);
  if (!authUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = await getOrCreateProfileId(admin, authUserId);
  if (!profileId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await admin
    .from('farm_saves')
    .select('payload')
    .eq('user_profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.error('Load farm save error:', error.message);
    return NextResponse.json({ error: 'Failed to load farm save' }, { status: 500 });
  }

  const payload = (data as { payload?: unknown } | null)?.payload ?? null;
  return NextResponse.json(
    { payload },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}

// PUT /api/games/farm/save — upsert { payload } for the logged-in user.
export async function PUT(request: NextRequest) {
  let admin: SupabaseClient;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const authUserId = await getAuthUserId(request);
  if (!authUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = (body as { payload?: unknown } | null)?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json(
      { error: 'payload must be a non-null object' },
      { status: 400 },
    );
  }

  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_PAYLOAD_CHARS) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const profileId = await getOrCreateProfileId(admin, authUserId);
  if (!profileId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // schema_version comes from payload.version when present, defaulting to 1.
  const versionRaw = (payload as { version?: unknown }).version;
  const schemaVersion =
    typeof versionRaw === 'number' && Number.isFinite(versionRaw)
      ? Math.trunc(versionRaw)
      : 1;

  const { error } = await admin.from('farm_saves').upsert(
    {
      user_profile_id: profileId,
      payload,
      schema_version: schemaVersion,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_profile_id' },
  );

  if (error) {
    console.error('Save farm save error:', error.message);
    return NextResponse.json({ error: 'Failed to save farm save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
