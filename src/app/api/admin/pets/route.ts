import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/api-auth';
import { createPet, expForLevel, levelFromExp, MAX_STAT, type PetState } from '@/lib/pet';
import { PET_SPECIES, getSpecies, currentStage } from '@/lib/pet-species';
import { readAccountJson, writeAccountJson } from '@/lib/server/account-file-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const BUCKET = 'progress-state';
const PET_MAX_LEVEL = 10;

type ProfileRow = {
  id: string;
  auth_id: string | null;
  email: string | null;
  name: string | null;
  parent_name?: string | null;
  child_age?: number | null;
  created_at?: string | null;
};

type ProgressRow = {
  user_profile_id: string;
  pet: PetState | null;
};

type StoredEnvelope = {
  updatedAt?: string;
  payload?: AccountPayload;
};

type AccountPayload = {
  progress?: unknown;
  settings?: unknown;
  economy?: {
    coins?: number;
    streakFreezes?: number;
    lastSpinDate?: string | null;
    ownedAvatarItems?: string[];
    equippedAvatar?: unknown;
    pet?: PetState | null;
  };
  extras?: unknown;
  updatedAt?: string;
  [key: string]: unknown;
};

const PROFILE_SELECTS = [
  'id, auth_id, email, name, parent_name, child_age, created_at',
  'id, auth_id, email, name',
];

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function expAtLevel(level: number): number {
  const target = Math.max(1, Math.min(PET_MAX_LEVEL, Math.floor(level)));
  let exp = 0;
  for (let current = 1; current < target; current += 1) {
    exp += expForLevel(current);
  }
  return exp;
}

function normalizePet(value: unknown): PetState | null {
  if (!value || typeof value !== 'object') return null;
  const pet = value as Partial<PetState>;
  if (typeof pet.species !== 'string' || !getSpecies(pet.species)) return null;
  return {
    species: pet.species,
    name: typeof pet.name === 'string' && pet.name.trim() ? pet.name.trim().slice(0, 20) : 'Bạn nhỏ',
    hunger: typeof pet.hunger === 'number' ? pet.hunger : MAX_STAT,
    happiness: typeof pet.happiness === 'number' ? pet.happiness : MAX_STAT,
    clean: typeof pet.clean === 'number' ? pet.clean : MAX_STAT,
    energy: typeof pet.energy === 'number' ? pet.energy : MAX_STAT,
    exp: typeof pet.exp === 'number' ? Math.max(0, Math.floor(pet.exp)) : 0,
    lastCareAt: pet.lastCareAt && typeof pet.lastCareAt === 'object' ? pet.lastCareAt : {},
    careRhythm: pet.careRhythm,
    lastTick: typeof pet.lastTick === 'number' ? pet.lastTick : Date.now(),
  };
}

function setPetLevel(pet: PetState, level: number): PetState {
  return {
    ...pet,
    hunger: MAX_STAT,
    happiness: MAX_STAT,
    clean: MAX_STAT,
    energy: MAX_STAT,
    exp: expAtLevel(level),
    lastTick: Date.now(),
  };
}

function mapPet(pet: PetState | null) {
  if (!pet) return null;
  const species = getSpecies(pet.species);
  const level = levelFromExp(pet.exp).level;
  const stage = species ? currentStage(species, level) : null;
  return {
    ...pet,
    level,
    speciesName: species?.nameVi ?? pet.species,
    stageName: stage?.nameVi ?? null,
    stageArt: stage?.art ?? null,
    isFullLevel: level >= PET_MAX_LEVEL,
  };
}

function matchesSearch(profile: ProfileRow, search: string): boolean {
  if (!search) return true;
  return [profile.email, profile.name, profile.parent_name, profile.auth_id, profile.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(search);
}

async function fetchProfiles(admin: SupabaseClient): Promise<ProfileRow[]> {
  let lastError: unknown = null;
  for (const columns of PROFILE_SELECTS) {
    let query = admin.from('user_profiles').select(columns).limit(500);
    if (columns.includes('created_at')) query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (!error && Array.isArray(data)) return data as unknown as ProfileRow[];
    lastError = error;
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to load profiles');
}

async function fetchProgressPets(admin: SupabaseClient, profileIds: string[]): Promise<Map<string, PetState | null>> {
  const byProfile = new Map<string, PetState | null>();
  if (profileIds.length === 0) return byProfile;

  const { data, error } = await admin
    .from('user_progress')
    .select('user_profile_id, pet')
    .in('user_profile_id', profileIds);

  if (error || !Array.isArray(data)) return byProfile;
  for (const row of data as ProgressRow[]) byProfile.set(row.user_profile_id, normalizePet(row.pet));
  return byProfile;
}

async function readStoredPayload(authUserId: string | null): Promise<StoredEnvelope | null> {
  if (!authUserId) return null;
  return readAccountJson<StoredEnvelope>(BUCKET, authUserId);
}

async function getPetForProfile(profile: ProfileRow, progressPets: Map<string, PetState | null>) {
  const stored = await readStoredPayload(profile.auth_id);
  const filePet = normalizePet(stored?.payload?.economy?.pet);
  return {
    pet: filePet || progressPets.get(profile.id) || null,
    updatedAt: stored?.updatedAt || stored?.payload?.updatedAt || null,
  };
}

function mapUser(profile: ProfileRow, pet: PetState | null, updatedAt: string | null) {
  return {
    id: profile.id,
    authId: profile.auth_id,
    email: profile.email,
    name: profile.name,
    parentName: profile.parent_name ?? null,
    childAge: profile.child_age ?? null,
    createdAt: profile.created_at ?? null,
    updatedAt,
    pet: mapPet(pet),
  };
}

async function writePetToAccountFile(profile: ProfileRow, pet: PetState): Promise<AccountPayload | null> {
  if (!profile.auth_id) return null;

  const stored = await readStoredPayload(profile.auth_id);
  const payload: AccountPayload = {
    ...(stored?.payload && typeof stored.payload === 'object' ? stored.payload : {}),
  };
  payload.economy = {
    ...(payload.economy || {}),
    pet,
  };
  payload.updatedAt = new Date().toISOString();

  await writeAccountJson(BUCKET, profile.auth_id, payload);
  return payload;
}

async function mirrorPetToSupabase(admin: SupabaseClient, profileId: string, pet: PetState) {
  try {
    await admin
      .from('user_progress')
      .upsert({ user_profile_id: profileId, pet }, { onConflict: 'user_profile_id' });
  } catch (error) {
    console.error('Failed to mirror admin pet update to Supabase:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

    const search = new URL(request.url).searchParams.get('search')?.trim().toLowerCase() || '';
    const profiles = (await fetchProfiles(admin)).filter((profile) => matchesSearch(profile, search));
    const progressPets = await fetchProgressPets(admin, profiles.map((profile) => profile.id));
    const users = await Promise.all(
      profiles.map(async (profile) => {
        const { pet, updatedAt } = await getPetForProfile(profile, progressPets);
        return mapUser(profile, pet, updatedAt);
      }),
    );

    return NextResponse.json({
      maxLevel: PET_MAX_LEVEL,
      species: PET_SPECIES.map((item) => ({ id: item.id, nameVi: item.nameVi, emoji: item.emoji })),
      users,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin pets GET error:', error);
    return NextResponse.json({ error: 'Failed to load pet accounts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const profileId = typeof body?.profileId === 'string' ? body.profileId.trim() : '';
    const mode = body?.mode === 'full' ? 'full' : 'level';
    const requestedLevel = mode === 'full' ? PET_MAX_LEVEL : Number(body?.level);
    const level = Number.isFinite(requestedLevel) ? Math.max(1, Math.min(PET_MAX_LEVEL, Math.floor(requestedLevel))) : 1;
    const speciesId = typeof body?.speciesId === 'string' && getSpecies(body.speciesId) ? body.speciesId : PET_SPECIES[0].id;

    if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 });

    const { data: profile, error } = await admin
      .from('user_profiles')
      .select(PROFILE_SELECTS[0])
      .eq('id', profileId)
      .maybeSingle();

    if (error || !profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

    const profileRow = profile as unknown as ProfileRow;
    const progressPets = await fetchProgressPets(admin, [profileId]);
    const { pet: currentPet } = await getPetForProfile(profileRow, progressPets);
    const basePet = currentPet || createPet(speciesId, profileRow.name || 'Bạn nhỏ');
    const nextPet = setPetLevel(basePet, level);

    await writePetToAccountFile(profileRow, nextPet);
    await mirrorPetToSupabase(admin, profileId, nextPet);

    return NextResponse.json({
      maxLevel: PET_MAX_LEVEL,
      user: mapUser(profileRow, nextPet, new Date().toISOString()),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin pets PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update pet level' }, { status: 500 });
  }
}
