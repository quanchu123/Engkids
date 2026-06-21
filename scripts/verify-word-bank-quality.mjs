#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PAGE_SIZE = 1000;
const OUT_DIR = path.join('output', 'audits');
const STRICT = process.argv.includes('--strict');
const MIN_PLAYABLE_PER_LEVEL = Number(process.env.WORD_BANK_MIN_PLAYABLE_PER_LEVEL || 25);
const LEVELS = ['a2-key', 'b1-preliminary', 'b2-first', 'c1-advanced'];
const SYNTHETIC_PREFIX_RE = /^(red|blue|green|yellow|black|white|pink|brown|big|small|hot|cold|open|closed|clean|dirty|quiet|fast|slow|brave|careful|creative|crowded|helpful|healthy|important|possible|responsible|successful|useful)\s+/i;

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function noMarks(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function norm(value) { return String(value || '').trim().toLowerCase(); }
function badVi(row) {
  const vi = String(row.vi || '').trim();
  const lower = norm(vi);
  if (!vi || lower === 'translation_pending' || lower.includes('translation pending')) return true;
  // The OLD junk was a placeholder of the literal shape "từ <english headword>"
  // (e.g. en="abandon" -> vi="từ abandon"). Block only that exact shape, not any
  // genuine Vietnamese gloss that happens to start with tu/tư/tủ ("Từ điển",
  // "Tự do", "Tủ sách"). Match ascii-stripped vi === "<prefix> <english word>".
  const ascii = noMarks(vi);
  const en = noMarks(row.en_lower || row.en);
  if (en) {
    for (const prefix of ['tu', 'tinh tu', 'dong tu']) {
      if (ascii === `${prefix} ${en}`) return true;
    }
  }
  return false;
}
function badExample(row) {
  const ex = String(row.example || '').trim();
  if (!ex) return true;
  const lower = ex.toLowerCase();
  return lower.includes('wordnet definition:') || lower === 'i can see ___.';
}
function playable(row) {
  const en = String(row.en || '').trim();
  if (!en || !/[a-z]/i.test(en)) return false;
  if (/^[a-z]{1,2}$/i.test(en)) return false;
  if (row.quality_status === 'blocked' || row.vi_review_status === 'blocked' || row.vi_review_status === 'translation_pending') return false;
  if (badVi(row)) return false;
  if (SYNTHETIC_PREFIX_RE.test(en) && en.includes(' ')) return false;
  return true;
}
async function fetchRows(db) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from('word_bank_items')
      .select('id,en,en_lower,vi,level,topic,example,active,source_id,license_status,review_status,quality_status,safety_status,vi_review_status,vi_source_id,vi_license_name,vi_attribution,vi_confidence')
      .eq('active', true)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const rows = await fetchRows(client());
  const dupes = new Map();
  for (const row of rows) {
    const key = norm(row.en_lower || row.en);
    dupes.set(key, (dupes.get(key) || 0) + 1);
  }
  const playableRows = rows.filter(playable);
  const byLevel = Object.fromEntries(LEVELS.map((level) => [level, rows.filter((row) => row.level === level).length]));
  const playableByLevel = Object.fromEntries(LEVELS.map((level) => [level, playableRows.filter((row) => row.level === level).length]));
  const report = {
    activeWords: rows.length,
    duplicateEnLowerGroups: [...dupes.values()].filter((count) => count > 1).length,
    translationPending: rows.filter((row) => norm(row.vi) === 'translation_pending' || row.vi_review_status === 'translation_pending').length,
    badVietnameseRows: rows.filter(badVi).length,
    badExamples: rows.filter(badExample).length,
    tooShortEnglish: rows.filter((row) => /^[a-z]{1,2}$/i.test(String(row.en || '').trim())).length,
    learnerPlayable: playableRows.length,
    byLevel,
    playableByLevel,
    missingViMetadata: rows.filter((row) => playable(row) && (!row.vi_source_id || !row.vi_license_name || !row.vi_attribution)).length,
    sampleBlocked: rows.filter((row) => !playable(row)).slice(0, 20).map((row) => ({ en: row.en, vi: row.vi, level: row.level, viReviewStatus: row.vi_review_status, qualityStatus: row.quality_status })),
  };
  const failures = [];
  // Floor guards against the bank silently shrinking. The clean rebuilt bank is
  // ~1000 fully-sourced words (CEFR-J/Octanove + Wiktionary VI + Tatoeba), where
  // every active row is learner-playable — quality over the old 11k of mostly
  // untranslated junk. 900 leaves headroom while still catching a regression.
  if (report.activeWords < 900) failures.push('word_bank_items active < 900');
  if (report.duplicateEnLowerGroups !== 0) failures.push('duplicate en_lower groups exist');
  if (report.missingViMetadata !== 0) failures.push('playable rows missing vi metadata');
  if (playableRows.some((row) => badVi(row))) failures.push('bad Vietnamese visible in learner-playable rows');
  if (STRICT) {
    for (const level of LEVELS) if ((playableByLevel[level] || 0) < MIN_PLAYABLE_PER_LEVEL) failures.push(`${level} playable rows < ${MIN_PLAYABLE_PER_LEVEL}`);
  }
  report.failures = failures;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'word-bank-quality-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});