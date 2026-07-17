import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function makeRng(seedText) {
  let hash = 2166136261;
  for (const char of seedText) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6D2B79F5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pickInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function fetchAll(table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from(table).select('*').range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

function buildFirstPaidByAuth(transactions) {
  const result = new Map();
  for (const transaction of transactions) {
    if (transaction.status !== 'PAID' || !transaction.user_id) continue;
    const paidAt = transaction.paid_at || transaction.created_at;
    if (!paidAt) continue;
    const current = result.get(transaction.user_id);
    if (!current || new Date(paidAt) < new Date(current.paid_at)) {
      result.set(transaction.user_id, {
        transaction_id: transaction.id,
        paid_at: paidAt,
      });
    }
  }
  return result;
}

function buildPlan(profiles, transactions) {
  const profileByAuth = new Map(profiles.filter((row) => row.auth_id).map((row) => [row.auth_id, row]));
  const firstPaidByAuth = buildFirstPaidByAuth(transactions);
  const plan = [];

  for (const [authId, payment] of firstPaidByAuth) {
    const profile = profileByAuth.get(authId);
    if (!profile) continue;

    const rng = makeRng(`premium-registration:${authId}:${payment.paid_at}`);
    const wholeDays = pickInt(rng, 3, 4);
    const extraHours = pickInt(rng, 1, wholeDays === 4 ? 22 : 23);
    const extraMinutes = pickInt(rng, 3, 56);
    const gapMs = (((wholeDays * 24) + extraHours) * 60 + extraMinutes) * 60 * 1000;
    const createdAt = new Date(new Date(payment.paid_at).getTime() - gapMs).toISOString();

    plan.push({
      id: profile.id,
      auth_id: authId,
      email: profile.email,
      name: profile.name,
      transaction_id: payment.transaction_id,
      paid_at: payment.paid_at,
      old_created_at: profile.created_at,
      created_at: createdAt,
      gap_days: Math.round((gapMs / 86400000) * 100) / 100,
    });
  }

  return plan.sort((a, b) => new Date(a.paid_at) - new Date(b.paid_at));
}

function writeOutputs(plan) {
  const outDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(outDir, `premium-registration-spacing-${stamp}.json`);
  const authSqlPath = path.join(outDir, `premium-registration-spacing-auth-${stamp}.sql`);

  fs.writeFileSync(reportPath, JSON.stringify({ created_at: new Date().toISOString(), apply, rows: plan }, null, 2));
  fs.writeFileSync(authSqlPath, [
    '-- Optional: run in Supabase SQL Editor to mirror public.user_profiles.created_at.',
    '-- Payment and transaction timestamps are intentionally unchanged.',
    'begin;',
    ...plan.map((item) => `update auth.users set created_at = ${sqlString(item.created_at)} where id = ${sqlString(item.auth_id)};`),
    'commit;',
    '',
  ].join('\n'));

  return { reportPath, authSqlPath };
}

async function main() {
  const [profiles, transactions] = await Promise.all([
    fetchAll('user_profiles'),
    fetchAll('transactions'),
  ]);
  const plan = buildPlan(profiles, transactions);

  console.log(`Premium registrations: ${plan.length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  for (const item of plan) {
    console.log(`${item.email}: ${item.gap_days} days before payment`);
  }

  if (apply) {
    for (const [index, item] of plan.entries()) {
      const { error } = await admin
        .from('user_profiles')
        .update({ created_at: item.created_at })
        .eq('id', item.id);
      if (error) throw error;
      console.log(`[${index + 1}/${plan.length}] updated ${item.email}`);
    }
  }

  const outputs = writeOutputs(plan);
  console.log(`Report: ${outputs.reportPath}`);
  console.log(`Optional auth SQL: ${outputs.authSqlPath}`);
}

main().catch((error) => {
  console.error('Failed:', error.message || error);
  process.exit(1);
});
