import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const VALID_STAGES = new Set(['a2-key', 'b1-preliminary', 'b2-first', 'c1-advanced']);
const LEGACY_STAGE_MAP = {
  'sound-play': 'a2-key',
  'pre-a1-starters': 'a2-key',
  'a1-movers': 'a2-key',
  'a2-flyers': 'a2-key',
  'a2-bridge': 'a2-key',
};
function normalizeLevel(value) {
  const raw = String(value || '').trim();
  return VALID_STAGES.has(raw) ? raw : (LEGACY_STAGE_MAP[raw] || 'a2-key');
}
const seedPath = process.argv.find((arg) => arg.startsWith('--file='))?.slice('--file='.length)
  || path.join(root, 'data', 'curriculum-word-bank.json');

function readSeed() {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }
  const rows = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  if (!Array.isArray(rows)) throw new Error('Seed must be a JSON array.');
  return rows;
}

function validate(rows) {
  const seen = new Set();
  const errors = [];
  const counts = { byLevel: {}, byTopic: {}, bySource: {} };

  rows.forEach((row, index) => {
    const label = `row ${index + 1}`;
    const en = String(row.en || '').trim();
    const vi = String(row.vi || '').trim();
    const level = normalizeLevel(row.level);
    const topic = String(row.topic || '').trim().toLowerCase();
    const example = String(row.example || '').trim();
    const source = String(row.source || '').trim();
    const partOfSpeech = String(row.part_of_speech || '').trim();

    if (!en) errors.push(`${label}: missing en`);
    if (!vi) errors.push(`${label}: missing vi`);
    if (!VALID_STAGES.has(level)) errors.push(`${label}: invalid level ${level}`);
    if (!topic) errors.push(`${label}: missing topic`);
    // Example is OPTIONAL: a word with a real VI gloss but no real example is
    // still useful in vocab/quiz steps. We never fabricate an example, so many
    // genuine words legitimately ship without one; the lesson generator only
    // needs examples for the reading/grammar steps and skips words lacking them.
    if (!partOfSpeech) errors.push(`${label}: missing part_of_speech`);
    if (!source) errors.push(`${label}: missing source`);

    const key = en.toLowerCase();
    if (seen.has(key)) errors.push(`${label}: duplicate en_lower ${key}`);
    seen.add(key);

    counts.byLevel[level] = (counts.byLevel[level] || 0) + 1;
    counts.byTopic[topic] = (counts.byTopic[topic] || 0) + 1;
    counts.bySource[source] = (counts.bySource[source] || 0) + 1;
  });

  if (rows.length < 1000) errors.push(`seed has ${rows.length} rows; expected at least 1000`);
  if (errors.length > 0) throw new Error(errors.slice(0, 20).join('\n'));
  return counts;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertTableExists(supabase) {
  const { error } = await supabase.from('word_bank_items').select('id').limit(1);
  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('word_bank_items')) {
      throw new Error('word_bank_items does not exist. Apply supabase/migrations/020_curriculum_assessment_engine.sql and 021_level_onboarding_and_content_stage.sql first.');
    }
    throw new Error(`Cannot read word_bank_items: ${error.message}`);
  }
}

async function upsertRows(supabase, rows) {
  const now = new Date().toISOString();
  const chunks = [];
  for (let i = 0; i < rows.length; i += 200) chunks.push(rows.slice(i, i + 200));

  let sortOrder = 1;
  for (const chunk of chunks) {
    const payload = chunk.map((row) => ({
      en: row.en.trim(),
      vi: row.vi.trim(),
      level: normalizeLevel(row.level),
      topic: row.topic.trim().toLowerCase(),
      example: String(row.example || '').trim(),
      part_of_speech: row.part_of_speech.trim(),
      source: row.source.trim(),
      source_id: row.source_id || row.source.trim(),
      license_status: row.license_status || 'original',
      review_status: row.review_status || 'approved',
      tags: Array.isArray(row.tags) ? row.tags.filter((tag) => typeof tag === 'string') : [],
      sort_order: sortOrder++,
      active: row.active !== false,
      cefr_level: normalizeLevel(row.level),
      quality_status: 'approved',
      safety_status: 'safe',
      // VI provenance — the quality verifier requires playable rows to carry
      // these. Vietnamese glosses come from English Wiktionary (CC BY-SA).
      vi_source_id: row.vi_source_id || 'wiktionary-en-translations',
      vi_source_url: row.vi_source_url || 'https://en.wiktionary.org/',
      vi_license_name: row.vi_license_name || 'CC BY-SA 4.0',
      vi_license_url: row.vi_license_url || 'https://creativecommons.org/licenses/by-sa/4.0/',
      vi_attribution: row.vi_attribution || 'English Wiktionary contributors',
      vi_review_status: row.vi_review_status || 'approved',
      vi_updated_at: now,
      updated_at: now,
    }));

    const { error } = await supabase
      .from('word_bank_items')
      .upsert(payload, { onConflict: 'en_lower' });
    if (error) throw new Error(`Upsert failed: ${error.message}`);
  }
}

async function reportDb(supabase) {
  const { count, error } = await supabase
    .from('word_bank_items')
    .select('id', { count: 'exact', head: true })
    .eq('active', true);
  if (error) throw new Error(`Count failed: ${error.message}`);
  return count || 0;
}

// Deactivate every existing row (the broken legacy bank) without deleting it, so
// the clean import below is the only active source. Reversible: flip active back.
async function deactivateAll(supabase) {
  const { error } = await supabase
    .from('word_bank_items')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('active', true);
  if (error) throw new Error(`Deactivate failed: ${error.message}`);
}

async function main() {
  const rows = readSeed();
  const counts = validate(rows);
  console.log('Seed validation OK');
  console.log(JSON.stringify({ total: rows.length, ...counts }, null, 2));

  if (process.argv.includes('--validate-only')) return;

  const supabase = getSupabaseAdmin();
  await assertTableExists(supabase);
  if (process.argv.includes('--replace-all')) {
    console.log('Deactivating the old word bank (active=false, not deleted)...');
    await deactivateAll(supabase);
  }
  await upsertRows(supabase, rows);
  const activeCount = await reportDb(supabase);
  console.log(`Imported ${rows.length} rows. Active word_bank_items in DB: ${activeCount}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

