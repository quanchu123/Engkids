#!/usr/bin/env node
// HARD RESET the curriculum tables before a clean re-import. Deletes in FK order
// (steps -> lessons -> units -> word_bank_items). Verified safe beforehand:
// vocabulary_items (user-saved words) do NOT FK to word_bank_items, and
// lesson_progress / lesson_events are empty, so no user data is lost.
//
//   node scripts/wb-hard-reset.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function count(table) {
  const { count } = await sb.from(table).select('id', { count: 'exact', head: true });
  return count || 0;
}

async function delAll(table) {
  // Delete every row. "id is not null" is always true and works for both
  // uuid and text primary keys (a text sentinel would break uuid columns).
  const { error } = await sb.from(table).delete().not('id', 'is', null);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  const tables = ['lesson_steps', 'lessons', 'curriculum_units', 'word_bank_items'];
  const before = {};
  for (const t of tables) before[t] = await count(t);
  console.log('BEFORE', JSON.stringify(before));
  for (const t of tables) {
    process.stdout.write(`deleting ${t}... `);
    await delAll(t);
    console.log('done');
  }
  const after = {};
  for (const t of tables) after[t] = await count(t);
  console.log('AFTER', JSON.stringify(after));
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
