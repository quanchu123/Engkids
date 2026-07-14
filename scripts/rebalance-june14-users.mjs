import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');

const TARGET_DATE = { year: 2026, month: 6, day: 14 };
const LAG_DATE = { year: 2026, month: 6, day: 15 };
const TARGET_TOTAL_COUNTABLE = 341;
const EXPECTED_CURRENT_COUNTABLE = 333;
const EXPECTED_JUNE14_COUNT = 0;
const EXPECTED_JUNE15_COUNT = 0;

const MOVE_PLAN = new Map([
  ['2026-06-19', 3],
  ['2026-06-20', 1],
  ['2026-06-21', 1],
  ['2026-06-22', 1],
  ['2026-06-23', 1],
  ['2026-06-24', 1],
  ['2026-06-25', 1],
  ['2026-06-26', 1],
  ['2026-06-27', 1],
  ['2026-06-29', 3],
  ['2026-06-30', 9],
  ['2026-07-01', 1],
  ['2026-07-02', 1],
  ['2026-07-03', 1],
  ['2026-07-04', 3],
  ['2026-07-05', 3],
  ['2026-07-06', 1],
  ['2026-07-07', 1],
  ['2026-07-08', 1],
  ['2026-07-09', 1],
  ['2026-07-10', 1],
  ['2026-07-11', 1],
  ['2026-07-12', 4],
  ['2026-07-13', 5],
]);

const NEW_USERS = [
  {
    email: 'nguyenvanhai1989@gmail.com',
    name: 'Nguyễn Minh Khang',
    parent_name: 'Nguyễn Văn Hải',
    child_age: 6,
    parent_age: 37,
    gender: 'male',
    birth_date: '2020-04-18',
    address: 'Thạch Thất, Hà Nội',
  },
  {
    email: 'tranquochuy91@gmail.com',
    name: 'Trần Gia Hân',
    parent_name: 'Trần Quốc Huy',
    child_age: 7,
    parent_age: 36,
    gender: 'female',
    birth_date: '2019-11-02',
    address: 'Hòa Lạc, Thạch Thất',
  },
  {
    email: 'phamminhtuan88@gmail.com',
    name: 'Phạm Bảo An',
    parent_name: 'Phạm Minh Tuấn',
    child_age: 5,
    parent_age: 34,
    gender: 'male',
    birth_date: '2021-06-09',
    address: 'Sơn Tây, Hà Nội',
  },
  {
    email: 'lehongson123@gmail.com',
    name: 'Lê Khánh Vy',
    parent_name: 'Lê Hồng Sơn',
    child_age: 8,
    parent_age: 38,
    gender: 'female',
    birth_date: '2018-08-16',
    address: 'Phường Trung Hưng, Sơn Tây',
  },
  {
    email: 'voanhduc1989@gmail.com',
    name: 'Võ Gia Bảo',
    parent_name: 'Võ Anh Đức',
    child_age: 6,
    parent_age: 33,
    gender: 'male',
    birth_date: '2020-02-24',
    address: 'TX Sơn Tây',
  },
  {
    email: 'hoangminhduc@gmail.com',
    name: 'Hoàng Thảo Ngọc',
    parent_name: 'Hoàng Minh Đức',
    child_age: 7,
    parent_age: 37,
    gender: 'female',
    birth_date: '2019-05-12',
    address: 'xã Hòa Lạc, Hà Nội',
  },
  {
    email: 'dangquockhanh94@gmail.com',
    name: 'Đặng Minh Nhật',
    parent_name: 'Đặng Quốc Khánh',
    child_age: 5,
    parent_age: 39,
    gender: 'male',
    birth_date: '2021-09-21',
    address: 'Cổ Đông, Sơn Tây',
  },
  {
    email: 'buivanhung1991@gmail.com',
    name: 'Bùi Tuệ An',
    parent_name: 'Bùi Văn Hùng',
    child_age: 6,
    parent_age: 35,
    gender: 'female',
    birth_date: '2020-12-03',
    address: 'xã Thạch Hòa, Hà Nội',
  },
];

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const protectedEmails = new Set(['admin@comiclingua.com', 'viet@ultra.com']);
const testPatterns = [/test/i, /demo/i, /sample/i, /qa/i, /sandbox/i, /staging/i, /temp/i, /bot/i];

function getVietnamDateKey(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function isAdminRole(value) {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'admin' || normalized === 'super_admin' || normalized === 'god';
}

function isTestAccount(profile) {
  const haystack = [
    profile.id,
    profile.auth_id,
    profile.email,
    profile.name,
    profile.provider,
    profile.role,
    profile.parent_name,
    profile.location,
    profile.account_type,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();

  return testPatterns.some((pattern) => pattern.test(haystack));
}

function isProtectedProfile(profile) {
  const email = String(profile.email || '').toLowerCase();
  const role = String(profile.role || '').toLowerCase();
  const accountType = String(profile.account_type || '').toLowerCase();
  const name = String(profile.name || '').toLowerCase();

  return (
    protectedEmails.has(email) ||
    email.includes('admin') ||
    isAdminRole(role) ||
    isAdminRole(accountType) ||
    name.includes('super admin') ||
    name.includes('god of the web') ||
    isTestAccount(profile)
  );
}

function isPremiumProfile(profile) {
  return Boolean(profile.is_premium) || String(profile.account_type || '').toLowerCase() === 'premium' || Boolean(profile.premium_until);
}

function toUtcIsoFromVietnamMinute(date, minuteOfDay, second = 0) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return new Date(Date.UTC(date.year, date.month - 1, date.day, hour - 7, minute, second)).toISOString();
}

function makeRng(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i += 1) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function rng() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function pickInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function isWeekend(date) {
  const day = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return day === 0 || day === 6;
}

function chooseSlot(rng, date) {
  const slots = isWeekend(date)
    ? [
        { start: 7 * 60 + 20, end: 9 * 60 + 45, weight: 0.18 },
        { start: 10 * 60 + 15, end: 11 * 60 + 35, weight: 0.08 },
        { start: 14 * 60 + 20, end: 17 * 60 + 20, weight: 0.19 },
        { start: 19 * 60, end: 22 * 60 + 35, weight: 0.43 },
        { start: 22 * 60 + 40, end: 23 * 60 + 35, weight: 0.12 },
      ]
    : [
        { start: 6 * 60 + 25, end: 8 * 60 + 30, weight: 0.13 },
        { start: 9 * 60 + 15, end: 10 * 60 + 50, weight: 0.07 },
        { start: 11 * 60 + 20, end: 13 * 60 + 30, weight: 0.16 },
        { start: 15 * 60 + 25, end: 17 * 60 + 50, weight: 0.20 },
        { start: 19 * 60, end: 22 * 60 + 30, weight: 0.36 },
        { start: 22 * 60 + 35, end: 23 * 60 + 30, weight: 0.08 },
      ];

  const total = slots.reduce((sum, slot) => sum + slot.weight, 0);
  let cursor = rng() * total;
  for (const slot of slots) {
    cursor -= slot.weight;
    if (cursor <= 0) return slot;
  }
  return slots[slots.length - 1];
}

function isTooClose(usedTimes, timestamp) {
  return usedTimes.some((used) => Math.abs(used - timestamp) < 6 * 60 * 1000);
}

function makeNaturalCreatedAt(date, seedText, usedTimes) {
  const rng = makeRng(seedText);
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const slot = chooseSlot(rng, date);
    const minuteOfDay = pickInt(rng, slot.start, slot.end);
    const second = pickInt(rng, 3, 56);
    const iso = toUtcIsoFromVietnamMinute(date, minuteOfDay, second);
    const timestamp = new Date(iso).getTime();
    if (isTooClose(usedTimes, timestamp)) continue;
    usedTimes.push(timestamp);
    return iso;
  }

  const fallbackStart = isWeekend(date) ? 7 * 60 + 20 : 6 * 60 + 25;
  const fallbackEnd = isWeekend(date) ? 23 * 60 + 35 : 23 * 60 + 30;
  for (let minuteOfDay = fallbackStart; minuteOfDay <= fallbackEnd; minuteOfDay += 7) {
    const iso = toUtcIsoFromVietnamMinute(date, minuteOfDay, pickInt(rng, 1, 58));
    const timestamp = new Date(iso).getTime();
    if (isTooClose(usedTimes, timestamp)) continue;
    usedTimes.push(timestamp);
    return iso;
  }

  throw new Error(`Could not create a natural timestamp for ${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`);
}

function makeUpdatedAt(createdAt, seedText) {
  const rng = makeRng(`updated:${seedText}`);
  const created = new Date(createdAt).getTime();
  const bumpMinutes = pickInt(rng, 18, 72 * 60);
  return new Date(created + bumpMinutes * 60 * 1000).toISOString();
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function makePassword() {
  return `Engkids@${crypto.randomBytes(5).toString('hex')}A1`;
}

function gmailUniquenessKey(email) {
  const [local = '', domain = ''] = String(email).toLowerCase().split('@');
  return domain === 'gmail.com' ? `${domain}:${local.replace(/\./g, '')}` : `${domain}:${local}`;
}

function hasUsedEmail(email, usedEmails) {
  const normalized = String(email).toLowerCase();
  return usedEmails.has(normalized) || usedEmails.has(gmailUniquenessKey(normalized));
}

function rememberEmail(email, usedEmails) {
  const normalized = String(email).toLowerCase();
  usedEmails.add(normalized);
  usedEmails.add(gmailUniquenessKey(normalized));
}

function uniqueEmail(candidate, usedEmails) {
  let email = candidate;
  let suffix = 2;
  while (hasUsedEmail(email, usedEmails)) {
    email = candidate.replace('@gmail.com', `${suffix}@gmail.com`);
    suffix += 1;
  }
  rememberEmail(email, usedEmails);
  return email;
}

function groupByDate(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.created_at) continue;
    const key = getVietnamDateKey(row.created_at);
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

async function fetchProfiles() {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function buildMovePlan(rows) {
  const eligibleByDate = groupByDate(rows.filter((profile) => !isProtectedProfile(profile) && !isPremiumProfile(profile)));
  const plan = [];

  for (const [dateKey, count] of MOVE_PLAN.entries()) {
    const candidates = (eligibleByDate.get(dateKey) || [])
      .slice()
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    if (candidates.length < count) {
      throw new Error(`Not enough movable users on ${dateKey}: need ${count}, have ${candidates.length}`);
    }

    plan.push(...candidates.slice(0, count).map((profile) => ({ sourceDate: dateKey, profile })));
  }

  return plan;
}

function toProfilePayload(authId, spec, createdAt, updatedAt, columns) {
  const desiredPayload = {
    auth_id: authId,
    email: spec.email,
    name: spec.name,
    parent_name: spec.parent_name,
    child_age: spec.child_age,
    parent_age: spec.parent_age,
    gender: spec.gender,
    birth_date: spec.birth_date,
    address: spec.address,
    role: 'user',
    account_type: 'free',
    is_premium: false,
    created_at: createdAt,
    updated_at: updatedAt,
  };

  if (!columns?.length) return desiredPayload;
  return Object.fromEntries(Object.entries(desiredPayload).filter(([key]) => columns.includes(key)));
}

function buildSummary(countableRows, movedPlan, createdPlans) {
  const byDate = new Map();
  for (const row of countableRows) {
    if (!row.created_at) continue;
    const key = getVietnamDateKey(row.created_at);
    byDate.set(key, (byDate.get(key) || 0) + 1);
  }

  return {
    countableTotal: countableRows.length,
    june14: byDate.get('2026-06-14') || 0,
    june15: byDate.get('2026-06-15') || 0,
    byDate: Object.fromEntries([...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))),
    moved: movedPlan.map((item) => ({
      email: item.profile.email,
      from: item.sourceDate,
      to: '2026-06-14',
    })),
    created: createdPlans.map((item) => ({
      email: item.email,
      date: '2026-06-15',
    })),
  };
}

async function createNewUser(spec, index, columns, usedEmails, usedTimes) {
  const email = uniqueEmail(spec.email, usedEmails);
  const password = makePassword();
  const createdAt = makeNaturalCreatedAt(LAG_DATE, `new:${index}:${email}`, usedTimes);
  const updatedAt = makeUpdatedAt(createdAt, `new:${index}:${email}`);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: spec.name,
      display_name: spec.name,
      parent_name: spec.parent_name,
      child_age: String(spec.child_age),
      parent_age: String(spec.parent_age),
      gender: spec.gender,
      birth_date: spec.birth_date,
      address: spec.address,
    },
  });

  if (error) throw error;

  const authId = data.user.id;
  const payload = toProfilePayload(authId, { ...spec, email }, createdAt, updatedAt, columns);

  try {
    const { error: profileError } = await admin
      .from('user_profiles')
      .upsert(payload, { onConflict: 'auth_id' });
    if (profileError) throw profileError;

    const { data: profileRow, error: profileReadError } = await admin
      .from('user_profiles')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();
    if (profileReadError) throw profileReadError;

    if (profileRow?.id) {
      const { error: progressError } = await admin
        .from('user_progress')
        .upsert(
          {
            user_profile_id: profileRow.id,
            total_stars: 0,
            current_streak: 0,
          },
          { onConflict: 'user_profile_id' },
        );

      if (progressError) {
        console.warn(`Progress row skipped for ${email}: ${progressError.message}`);
      }
    }
  } catch (error) {
    await admin.auth.admin.deleteUser(authId).catch(() => {});
    throw error;
  }

  return { auth_id: authId, email, password, created_at: createdAt, updated_at: updatedAt };
}

async function main() {
  const profiles = await fetchProfiles();
  const columns = profiles[0] ? Object.keys(profiles[0]) : [];
  const countableRows = profiles.filter((profile) => !isProtectedProfile(profile));
  const movableRows = countableRows.filter((profile) => !isPremiumProfile(profile));
  const countableByDate = groupByDate(countableRows);
  const currentCountable = countableRows.length;
  const currentJune14 = countableByDate.get('2026-06-14')?.length || 0;
  const currentJune15 = countableByDate.get('2026-06-15')?.length || 0;
  const movePlan = buildMovePlan(movableRows);
  const newUserCount = NEW_USERS.length;

  console.log('Mode: rebalance June 14 / June 15 demo users');
  console.log(`Current countable users: ${currentCountable}`);
  console.log(`Current 2026-06-14 count: ${currentJune14}`);
  console.log(`Current 2026-06-15 count: ${currentJune15}`);
  console.log(`Users to move to 2026-06-14: ${movePlan.length}`);
  console.log(`Users to create on 2026-06-15: ${newUserCount}`);
  console.log(`Target countable total: ${TARGET_TOTAL_COUNTABLE}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log('');

  if (!apply) {
    const futureCount = currentCountable + newUserCount;
    console.log(`Dry run only. After applying, countable total will reach ${futureCount} and 2026-06-14 will have ${movePlan.length} users.`);
    return;
  }

  const alreadyApplied =
    currentCountable === TARGET_TOTAL_COUNTABLE &&
    currentJune14 === 47 &&
    currentJune15 === 8;

  if (alreadyApplied) {
    console.log('Rebalance already applied. Verification passed.');
    return;
  }

  if (currentCountable !== EXPECTED_CURRENT_COUNTABLE || currentJune14 !== EXPECTED_JUNE14_COUNT || currentJune15 !== EXPECTED_JUNE15_COUNT) {
    throw new Error([
      'Unexpected current state.',
      `Expected countable=${EXPECTED_CURRENT_COUNTABLE}, june14=${EXPECTED_JUNE14_COUNT}, june15=${EXPECTED_JUNE15_COUNT}.`,
      `Got countable=${currentCountable}, june14=${currentJune14}, june15=${currentJune15}.`,
      'Abort to avoid double-applying the rebalance.',
    ].join(' '));
  }

  const usedTimesJune14 = [];
  const movedRows = [];

  console.log('Moving existing users to 2026-06-14...');
  for (const [index, item] of movePlan.entries()) {
    const createdAt = makeNaturalCreatedAt(TARGET_DATE, `move:${item.profile.auth_id}:${index}`, usedTimesJune14);
    const updatedAt = makeUpdatedAt(createdAt, `move:${item.profile.auth_id}:${index}`);
    const { error } = await admin
      .from('user_profiles')
      .update({
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .eq('id', item.profile.id);
    if (error) throw error;

    movedRows.push({
      auth_id: item.profile.auth_id,
      email: item.profile.email,
      created_at: createdAt,
      updated_at: updatedAt,
      source_date: item.sourceDate,
    });
    console.log(`[${index + 1}/${movePlan.length}] ${item.profile.email} -> 14/06/2026`);
  }

  const usedEmails = new Set(profiles.map((profile) => String(profile.email || '').toLowerCase()).filter(Boolean));
  for (const spec of NEW_USERS) {
    rememberEmail(spec.email, usedEmails);
  }

  const createdRows = [];
  const usedTimesJune15 = [];
  console.log('');
  console.log('Creating new users on 2026-06-15...');
  for (const [index, spec] of NEW_USERS.entries()) {
    const created = await createNewUser(spec, index, columns, usedEmails, usedTimesJune15);
    createdRows.push(created);
    console.log(`[${index + 1}/${NEW_USERS.length}] ${created.email}`);
  }

  const refreshed = await fetchProfiles();
  const refreshedCountable = refreshed.filter((profile) => !isProtectedProfile(profile));
  const refreshedByDate = groupByDate(refreshedCountable);
  const finalCountable = refreshedCountable.length;
  const finalJune14 = refreshedByDate.get('2026-06-14')?.length || 0;
  const finalJune15 = refreshedByDate.get('2026-06-15')?.length || 0;

  const summary = buildSummary(refreshedCountable, movePlan, createdRows);
  const outDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryPath = path.join(outDir, `rebalance-june14-summary-${stamp}.json`);
  const authSqlPath = path.join(outDir, `rebalance-june14-auth-users-created-at-update-${stamp}.sql`);

  fs.writeFileSync(summaryPath, JSON.stringify({
    created_at: new Date().toISOString(),
    apply,
    targetTotal: TARGET_TOTAL_COUNTABLE,
    movedCount: movedRows.length,
    createdCount: createdRows.length,
    finalCountable,
    finalJune14,
    finalJune15,
    movedRows,
    createdRows,
    finalByDate: summary.byDate,
  }, null, 2));

  fs.writeFileSync(
    authSqlPath,
    [
      '-- Optional: run this in Supabase SQL Editor if auth.users timestamps must match user_profiles.',
      '-- This script creates 8 new users and moves 47 existing users to 2026-06-14 in public.user_profiles.',
      'begin;',
      ...movedRows.map((item) => `update auth.users set created_at = ${sqlString(item.created_at)}, updated_at = ${sqlString(item.updated_at)} where id = ${sqlString(item.auth_id)};`),
      ...createdRows.map((item) => `update auth.users set created_at = ${sqlString(item.created_at)}, updated_at = ${sqlString(item.updated_at)} where id = ${sqlString(item.auth_id)};`),
      'commit;',
      '',
    ].join('\n'),
  );

  console.log('');
  console.log(`Summary written: ${summaryPath}`);
  console.log(`Optional auth timestamp SQL written: ${authSqlPath}`);
  console.log('');
  console.log(`Final countable users: ${finalCountable}`);
  console.log(`Final 2026-06-14 count: ${finalJune14}`);
  console.log(`Final 2026-06-15 count: ${finalJune15}`);

  if (finalCountable !== TARGET_TOTAL_COUNTABLE || finalJune14 !== 47 || finalJune15 !== 8) {
    throw new Error('Verification failed after applying rebalance.');
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error('Failed:', error.message || error);
  process.exit(1);
});
