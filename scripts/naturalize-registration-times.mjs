import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const protectedEmails = new Set(['admin@comiclingua.com', 'viet@ultra.com']);
const startDate = { year: 2026, month: 6, day: 18 };
const endDate = { year: 2026, month: 7, day: 13 };
const endMinuteOfDay = (19 * 60);
const minGapMs = 6 * 60 * 1000;

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

function isProtectedProfile(profile) {
  const email = String(profile.email || '').toLowerCase();
  const role = String(profile.role || '').toLowerCase();
  const accountType = String(profile.account_type || '').toLowerCase();
  const name = String(profile.name || '').toLowerCase();

  return (
    protectedEmails.has(email) ||
    email.includes('admin') ||
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'god' ||
    accountType === 'admin' ||
    name.includes('super admin') ||
    name.includes('god of the web')
  );
}

function toUtcIsoFromVietnamMinute(date, minuteOfDay, second = 0) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return new Date(Date.UTC(date.year, date.month - 1, date.day, hour - 7, minute, second)).toISOString();
}

function getVietnamDateParts(value) {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value)).split('-').map(Number);
  return { year, month, day };
}

function getVietnamDateKey(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function formatVietnamDateLabel({ year, month, day }) {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function shiftVietnamDate(date, offsetDays) {
  const cursor = new Date(Date.UTC(date.year, date.month - 1, date.day));
  cursor.setUTCDate(cursor.getUTCDate() + offsetDays);
  return {
    year: cursor.getUTCFullYear(),
    month: cursor.getUTCMonth() + 1,
    day: cursor.getUTCDate(),
  };
}

function enumerateVietnamDates(start, end) {
  const dates = [];
  const cursor = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const last = new Date(Date.UTC(end.year, end.month - 1, end.day));
  while (cursor <= last) {
    dates.push({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate(),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function compareDateParts(a, b) {
  return Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day);
}

function isEndDate(date) {
  return compareDateParts(date, endDate) === 0;
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

  const usableSlots = slots
    .map((slot) => ({
      ...slot,
      end: isEndDate(date) ? Math.min(slot.end, endMinuteOfDay) : slot.end,
      start: isEndDate(date) && slot.start >= endMinuteOfDay ? Math.max(17 * 60 + 45, endMinuteOfDay - 50) : slot.start,
    }))
    .filter((slot) => slot.start <= slot.end);
  const total = usableSlots.reduce((sum, slot) => sum + slot.weight, 0);
  let cursor = rng() * total;
  for (const slot of usableSlots) {
    cursor -= slot.weight;
    if (cursor <= 0) return slot;
  }
  return usableSlots[usableSlots.length - 1];
}

function isTooClose(usedTimes, timestamp) {
  return usedTimes.some((used) => Math.abs(used - timestamp) < minGapMs);
}

function makeNaturalCreatedAt(date, seedText, usedTimes, beforeIso = null) {
  const rng = makeRng(seedText);
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const slot = chooseSlot(rng, date);
    const minuteOfDay = pickInt(rng, slot.start, slot.end);
    const second = pickInt(rng, 3, 56);
    const iso = toUtcIsoFromVietnamMinute(date, minuteOfDay, second);
    const timestamp = new Date(iso).getTime();
    if (beforeIso && timestamp >= new Date(beforeIso).getTime() - (15 * 60 * 1000)) continue;
    if (isTooClose(usedTimes, timestamp)) continue;
    usedTimes.push(timestamp);
    return iso;
  }

  const fallbackStart = isEndDate(date) ? 6 * 60 + 20 : 6 * 60;
  const fallbackEnd = isEndDate(date) ? endMinuteOfDay : 23 * 60 + 35;
  for (let minuteOfDay = fallbackStart; minuteOfDay <= fallbackEnd; minuteOfDay += 7) {
    const iso = toUtcIsoFromVietnamMinute(date, minuteOfDay, pickInt(rng, 1, 58));
    const timestamp = new Date(iso).getTime();
    if (beforeIso && timestamp >= new Date(beforeIso).getTime() - (15 * 60 * 1000)) continue;
    if (isTooClose(usedTimes, timestamp)) continue;
    usedTimes.push(timestamp);
    return iso;
  }

  throw new Error(`Could not create a natural timestamp for ${formatVietnamDateLabel(date)}`);
}

function makeUpdatedAt(createdAt, seedText, premiumPaidAt = null) {
  const rng = makeRng(`updated:${seedText}`);
  const created = new Date(createdAt).getTime();
  const end = new Date(toUtcIsoFromVietnamMinute(endDate, endMinuteOfDay, 0)).getTime();
  let updated;

  if (premiumPaidAt) {
    updated = new Date(premiumPaidAt).getTime() + pickInt(rng, 45, 12 * 60) * 1000;
  } else {
    const bumpMinutes = pickInt(rng, 18, 72 * 60);
    updated = created + bumpMinutes * 60 * 1000;
  }

  return new Date(Math.min(Math.max(updated, created + 10 * 60 * 1000), end)).toISOString();
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildNonPremiumDateAssignments(count, reservedByDate) {
  const dates = enumerateVietnamDates(startDate, endDate);
  const quotas = new Map(dates.map((date) => {
    const key = getDateKeyFromParts(date);
    const reserved = reservedByDate.get(key) || 0;
    return [key, Math.max(0, 5 - reserved)];
  }));
  const initialTotal = [...quotas.values()].reduce((sum, quota) => sum + quota, 0);
  let remaining = count - initialTotal;
  if (remaining < 0) throw new Error(`Too few non-premium users for ${dates.length} days`);

  const rng = makeRng('engkids-natural-registration-date-quotas-2026-07-13');
  while (remaining > 0) {
    const candidates = dates.filter((date) => {
      const key = getDateKeyFromParts(date);
      const reserved = reservedByDate.get(key) || 0;
      const maxForDay = isWeekend(date) ? 13 : 11;
      return (quotas.get(key) || 0) + reserved < maxForDay;
    });
    if (!candidates.length) throw new Error('Could not fit non-premium users into date quotas');

    const weighted = candidates.map((date, index) => {
      const recency = 0.82 + (index / Math.max(candidates.length - 1, 1)) * 0.35;
      const weekend = isWeekend(date) ? 1.12 : 1;
      const wave = 0.88 + (((date.day * 17) % 9) / 30);
      return { date, weight: recency * weekend * wave };
    });
    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let cursor = rng() * total;
    const selected = weighted.find((item) => {
      cursor -= item.weight;
      return cursor <= 0;
    }) || weighted[weighted.length - 1];
    const key = getDateKeyFromParts(selected.date);
    quotas.set(key, (quotas.get(key) || 0) + 1);
    remaining -= 1;
  }

  return dates.flatMap((date) => {
    const key = getDateKeyFromParts(date);
    return Array.from({ length: quotas.get(key) || 0 }, () => date);
  });
}

function getDateKeyFromParts(date) {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function shuffle(items, seedText) {
  const rng = makeRng(seedText);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

async function fetchTransactions() {
  const { data, error } = await admin
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

function buildFirstPaidTransactionByAuth(transactions) {
  const byAuth = new Map();
  for (const transaction of transactions) {
    if (transaction.status !== 'PAID') continue;
    const paidAt = transaction.paid_at || transaction.created_at;
    if (!paidAt || !transaction.user_id) continue;
    const existing = byAuth.get(transaction.user_id);
    if (!existing || new Date(paidAt) < new Date(existing.paidAt)) {
      byAuth.set(transaction.user_id, { ...transaction, paidAt });
    }
  }
  return byAuth;
}

function buildPlan(profiles, transactions) {
  const protectedRows = profiles.filter(isProtectedProfile);
  const normalRows = profiles.filter((profile) => !isProtectedProfile(profile));
  const firstPaidByAuth = buildFirstPaidTransactionByAuth(transactions);
  const premiumRows = normalRows.filter((profile) => firstPaidByAuth.has(profile.auth_id));
  const nonPremiumRows = normalRows.filter((profile) => !firstPaidByAuth.has(profile.auth_id));
  const usedTimes = [];
  const plan = [];
  const premiumReservedByDate = new Map();

  for (const profile of premiumRows) {
    const transaction = firstPaidByAuth.get(profile.auth_id);
    const paidAt = transaction.paidAt;
    const paidDate = getVietnamDateParts(paidAt);
    const rng = makeRng(`premium-offset:${profile.auth_id}:${profile.email}`);
    const daysBefore = pickInt(rng, 2, 6);
    const createdDate = shiftVietnamDate(paidDate, -daysBefore);
    const createdAt = makeNaturalCreatedAt(createdDate, `premium-created:${profile.auth_id}:${paidAt}`, usedTimes, paidAt);
    const updatedAt = makeUpdatedAt(createdAt, profile.auth_id, paidAt);
    const dateKey = getVietnamDateKey(createdAt);
    premiumReservedByDate.set(dateKey, (premiumReservedByDate.get(dateKey) || 0) + 1);

    plan.push({
      kind: 'premium',
      id: profile.id,
      auth_id: profile.auth_id,
      email: profile.email,
      name: profile.name,
      old_created_at: profile.created_at,
      old_updated_at: profile.updated_at,
      created_at: createdAt,
      updated_at: updatedAt,
      paid_at: paidAt,
      days_before_purchase: daysBefore,
      transaction_id: transaction.id,
      order_code: transaction.order_code,
    });
  }

  const assignedDates = buildNonPremiumDateAssignments(nonPremiumRows.length, premiumReservedByDate);
  const shuffledRows = shuffle(nonPremiumRows, 'engkids-natural-registration-row-order-2026-07-13');

  for (const [index, profile] of shuffledRows.entries()) {
    const date = assignedDates[index];
    const createdAt = makeNaturalCreatedAt(date, `normal-created:${index}:${profile.auth_id}:${profile.email}`, usedTimes);
    const updatedAt = makeUpdatedAt(createdAt, profile.auth_id);
    plan.push({
      kind: 'normal',
      id: profile.id,
      auth_id: profile.auth_id,
      email: profile.email,
      name: profile.name,
      old_created_at: profile.created_at,
      old_updated_at: profile.updated_at,
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }

  return {
    protectedRows,
    normalRows,
    premiumRows,
    nonPremiumRows,
    transactions,
    plan: plan.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  };
}

function summarizePlan(plan) {
  const byDate = new Map();
  for (const item of plan) {
    const key = getVietnamDateKey(item.created_at);
    const current = byDate.get(key) || { total: 0, premium: 0 };
    current.total += 1;
    if (item.kind === 'premium') current.premium += 1;
    byDate.set(key, current);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function writeOutputs(context) {
  const outDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const planPath = path.join(outDir, `natural-registration-times-${stamp}.json`);
  const authSqlPath = path.join(outDir, `natural-registration-auth-users-created-at-update-${stamp}.sql`);

  fs.writeFileSync(
    planPath,
    JSON.stringify({
      created_at: new Date().toISOString(),
      apply,
      mode: 'natural-registration-times',
      vietnamWindow: {
        start: startDate,
        end: endDate,
        endTime: '19:00',
      },
      protectedCount: context.protectedRows.length,
      normalCount: context.normalRows.length,
      premiumCount: context.premiumRows.length,
      rows: context.plan,
      byDate: Object.fromEntries(summarizePlan(context.plan)),
    }, null, 2),
  );

  fs.writeFileSync(
    authSqlPath,
    [
      '-- Optional: run this in Supabase SQL Editor if auth.users timestamps must match user_profiles.',
      '-- The script updates public.user_profiles directly; Supabase Admin API cannot update auth.users.created_at.',
      'begin;',
      ...context.plan
        .filter((item) => item.auth_id)
        .map((item) => `update auth.users set created_at = ${sqlString(item.created_at)}, updated_at = ${sqlString(item.updated_at)} where id = ${sqlString(item.auth_id)};`),
      'commit;',
      '',
    ].join('\n'),
  );

  return { planPath, authSqlPath };
}

function printPreview(context) {
  const counts = summarizePlan(context.plan);
  console.log('Mode: natural registration times');
  console.log(`Protected/admin rows unchanged: ${context.protectedRows.length}`);
  console.log(`Normal rows to update: ${context.normalRows.length}`);
  console.log(`Premium rows linked to paid transactions: ${context.premiumRows.length}`);
  console.log(`Vietnam window: ${formatVietnamDateLabel(startDate)} -> ${formatVietnamDateLabel(endDate)} 19:00`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log('');
  console.log('By day:');
  for (const [date, value] of counts) {
    console.log(`${date}: ${value.total}${value.premium ? ` (${value.premium} premium registrations)` : ''}`);
  }
  console.log('');
  console.log('Sample:');
  for (const item of context.plan.slice(0, 14)) {
    const createdVn = new Date(item.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
    const paidVn = item.paid_at
      ? new Date(item.paid_at).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
      : '';
    console.log(`${item.email} -> ${createdVn}${paidVn ? ` | paid ${paidVn} (${item.days_before_purchase} days later)` : ''}`);
  }
}

async function applyPlan(plan) {
  for (const [index, item] of plan.entries()) {
    const { error } = await admin
      .from('user_profiles')
      .update({
        created_at: item.created_at,
        updated_at: item.updated_at,
      })
      .eq('id', item.id);
    if (error) throw error;
    console.log(`[${index + 1}/${plan.length}] ${item.email}`);
  }
}

async function main() {
  const profiles = await fetchProfiles();
  const transactions = await fetchTransactions();
  const context = buildPlan(profiles, transactions);
  printPreview(context);

  let applied = false;
  if (apply) {
    console.log('');
    console.log('Updating public.user_profiles timestamps...');
    await applyPlan(context.plan);
    applied = true;
  }

  const { planPath, authSqlPath } = writeOutputs(context);
  console.log('');
  console.log(`Plan written: ${planPath}`);
  console.log(`Optional auth timestamp SQL written: ${authSqlPath}`);
  if (!applied) {
    console.log('');
    console.log('Dry run only. Add --apply to update user_profiles timestamps.');
  } else {
    console.log('Done.');
  }
}

main().catch((error) => {
  console.error('Failed:', error.message || error);
  process.exit(1);
});
