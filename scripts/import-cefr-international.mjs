#!/usr/bin/env node
// Import CEFR-J (A1-B2) + Octanove (C1-C2) vocabulary into word_bank_items.
// CEFR level is taken from the source (not a length heuristic). Vietnamese is
// machine-translated via Groq in batches and flagged needs-review.
//
//   node scripts/import-cefr-international.mjs --dry          # analyze only, no writes, no Groq
//   node scripts/import-cefr-international.mjs --limit=50 --apply   # translate+write first 50 (smoke test)
//   node scripts/import-cefr-international.mjs --apply        # full run
//
// Reuses the same Supabase admin + upsert(onConflict:en_lower) pattern as
// scripts/import-curriculum-word-bank.mjs, and the Groq model/prompt shape from
// src/services/ai-translate.ts.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const DRY = process.argv.includes('--dry');
const APPLY = process.argv.includes('--apply');
const USE_GOOGLE = process.argv.includes('--google');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0);

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const TRANSLATE_BATCH = 80;
// Google free endpoint: translate one word per call, run several in parallel.
const GOOGLE_CONCURRENCY = 8;

// CEFR band -> the app's 4 active stages.
const STAGE = { A1: 'a2-key', A2: 'a2-key', B1: 'b1-preliminary', B2: 'b2-first', C1: 'c1-advanced', C2: 'c1-advanced' };

const SOURCES = {
  cefrj: {
    file: 'cefrj-vocabulary-profile-1.5.csv',
    source: 'cefrj-tono-lab',
    sourceUrl: 'https://github.com/openlanguageprofiles/olp-en-cefrj',
    licenseName: 'CEFR-J Wordlist (Tono Lab, TUFS) - free for research & commercial use with citation',
    licenseUrl: 'http://www.cefr-j.org/data/CEFRJ_wordlist_ver1.6.xlsx',
    attribution: 'CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies.',
  },
  octanove: {
    file: 'octanove-vocabulary-profile-c1c2-1.0.csv',
    source: 'octanove-c1c2',
    sourceUrl: 'https://github.com/openlanguageprofiles/olp-en-cefrj',
    licenseName: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution: 'Octanove Vocabulary Profile C1/C2 v1.0 (Octanove Labs), CC BY-SA 4.0.',
  },
};

// Phrasal-verb / abbreviation tails we never want as kid vocabulary.
const PHRASAL_TAIL = /\s(to|up|in|out|on|off|over|down|away|back|through|along|around|after|into)$/i;

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    const row = {};
    header.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
}

// Returns the cleaned headword or null if it should be dropped.
function cleanHeadword(headword) {
  const first = String(headword || '').split('/')[0].trim();
  if (!first) return null;
  if (first.length < 3) return null;
  // single word OR two-word noun phrase, lowercase letters/hyphen/apostrophe only
  if (!/^[a-z][a-z'-]*( [a-z][a-z'-]*)?$/.test(first)) return null;
  if (PHRASAL_TAIL.test(first)) return null;
  return first;
}

function loadSource(key) {
  const meta = SOURCES[key];
  const text = readFileSync(path.join(root, 'data', 'cefr-international', meta.file), 'utf8');
  const rows = parseCsv(text);
  const out = [];
  for (const r of rows) {
    const level = (r.CEFR || '').trim().toUpperCase();
    const stage = STAGE[level];
    if (!stage) continue;
    const en = cleanHeadword(r.headword);
    if (!en) continue;
    out.push({
      en,
      en_lower: en.toLowerCase(),
      stage,
      cefr_level: level,
      part_of_speech: (r.pos || '').trim() || 'unknown',
      ...meta,
    });
  }
  return out;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Existing handpicked seed en_lower set — never clobber these.
async function fetchSeedKeys(sb) {
  const keys = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('word_bank_items')
      .select('en_lower')
      .eq('source', 'engkids-original-seed-2026')
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) keys.add(r.en_lower);
    if (data.length < 1000) break;
  }
  return keys;
}

// CEFR rows already imported (so a resumed run only translates what's missing).
async function fetchExistingCefrKeys(sb) {
  const keys = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('word_bank_items')
      .select('en_lower')
      .in('source', ['cefrj-tono-lab', 'octanove-c1c2'])
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) keys.add(r.en_lower);
    if (data.length < 1000) break;
  }
  return keys;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractJson(content) {
  let s = content.trim();
  if (s.includes('```')) {
    const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) s = m[1].trim();
  }
  if (!s.startsWith('{') && !s.startsWith('[')) {
    const i = s.indexOf('{');
    if (i > 0) s = s.slice(i);
  }
  return JSON.parse(s);
}

// Translate a batch of single words -> short Vietnamese gloss. Aligned by index.
async function translateBatch(words) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY missing.');
  const system = `Bạn là từ điển Anh-Việt cho trẻ em học tiếng Anh. Dịch mỗi TỪ tiếng Anh thành nghĩa tiếng Việt ngắn gọn, phổ thông, đúng nghĩa thường gặp nhất. Chỉ trả nghĩa, KHÔNG kèm loại từ, KHÔNG phiên âm, KHÔNG giải thích. Giữ NGUYÊN thứ tự và SỐ LƯỢNG.
Trả về DUY NHẤT JSON: { "vi": ["nghĩa 1", "nghĩa 2", ...] } với mảng "vi" đúng bằng số từ đầu vào.`;
  const user = `Dịch ${words.length} từ sau (giữ đúng thứ tự):\n${JSON.stringify(words)}`;

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.vi) ? parsed.vi : [];
  return words.map((_, i) => (typeof list[i] === 'string' ? list[i].trim() : ''));
}

// Google free endpoint: one word -> Vietnamese gloss. No API key, no daily quota.
async function googleTranslateOne(word) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(word)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Engkids curriculum import' } });
  if (!res.ok) return '';
  const data = await res.json();
  const vi = Array.isArray(data?.[0]) ? data[0].map((p) => p?.[0] || '').join('').trim() : '';
  return (vi || '').toLowerCase() === word.toLowerCase() ? '' : vi;
}

// Translate a batch via Google with bounded concurrency. Aligned by index.
async function translateBatchGoogle(words) {
  const out = new Array(words.length).fill('');
  for (let i = 0; i < words.length; i += GOOGLE_CONCURRENCY) {
    const group = words.slice(i, i + GOOGLE_CONCURRENCY);
    const results = await Promise.all(group.map((w) => googleTranslateOne(w).catch(() => '')));
    results.forEach((vi, j) => { out[i + j] = vi; });
  }
  return out;
}

async function main() {
  const cefrj = loadSource('cefrj');
  const octa = loadSource('octanove');

  // Dedupe within sources (CEFR-J first wins; lower level kept on dupe).
  const byKey = new Map();
  for (const row of [...cefrj, ...octa]) {
    if (!byKey.has(row.en_lower)) byKey.set(row.en_lower, row);
  }
  let candidates = [...byKey.values()];

  const byStage = {};
  for (const c of candidates) byStage[c.stage] = (byStage[c.stage] || 0) + 1;
  console.log('Parsed CEFR sources:', { cefrj: cefrj.length, octanove: octa.length, distinct: candidates.length, byStage });

  if (DRY) {
    const sb = getSupabaseAdmin();
    const seed = await fetchSeedKeys(sb);
    const collides = candidates.filter((c) => seed.has(c.en_lower)).length;
    console.log(`Seed rows (protected): ${seed.size}. CEFR words colliding with seed (will skip): ${collides}.`);
    console.log(`Net new/updatable rows: ${candidates.length - collides}.`);
    console.log('Sample:', candidates.slice(0, 10).map((c) => `${c.en} [${c.cefr_level}->${c.stage}]`));
    console.log('DRY run — no Groq calls, no writes.');
    return;
  }

  if (!APPLY) {
    console.log('Pass --dry to analyze or --apply to write. Optionally --limit=N for a smoke test.');
    return;
  }

  const sb = getSupabaseAdmin();
  const seed = await fetchSeedKeys(sb);
  candidates = candidates.filter((c) => !seed.has(c.en_lower));

  // Skip CEFR words already imported (so a resume run only does what's missing).
  const existing = await fetchExistingCefrKeys(sb);
  const before = candidates.length;
  candidates = candidates.filter((c) => !existing.has(c.en_lower));
  console.log(`Already in DB: ${existing.size} CEFR rows. Skipping ${before - candidates.length} already-imported.`);

  if (LIMIT) candidates = candidates.slice(0, LIMIT);
  const provider = USE_GOOGLE ? 'google' : 'groq';
  console.log(`Translating + importing ${candidates.length} rows via ${provider} (seed-protected, limit=${LIMIT || 'none'}).`);

  const now = new Date().toISOString();
  let imported = 0;
  let sortOrder = 100000; // keep CEFR rows after handpicked seed in default ordering

  for (let i = 0; i < candidates.length; i += TRANSLATE_BATCH) {
    const batch = candidates.slice(i, i + TRANSLATE_BATCH);
    let vi;
    if (USE_GOOGLE) {
      vi = await translateBatchGoogle(batch.map((c) => c.en));
    } else {
      try {
        vi = await translateBatch(batch.map((c) => c.en));
      } catch (err) {
        console.error(`Batch ${i}-${i + batch.length} translate failed: ${err.message}. Retrying once in 5s...`);
        await sleep(5000);
        vi = await translateBatch(batch.map((c) => c.en));
      }
    }

    const viLicenseName = USE_GOOGLE
      ? 'Google Translate machine translation candidate'
      : 'Groq llama-3.3-70b machine translation candidate';
    const viAttribution = USE_GOOGLE
      ? 'Machine translation (Google), pending human review.'
      : 'Machine translation (Groq), pending human review.';

    const payload = batch
      .map((c, j) => ({ c, viText: (vi[j] || '').trim() }))
      .filter(({ viText }) => viText && viText.toLowerCase() !== 'translation_pending')
      .map(({ c, viText }) => ({
        en: c.en,
        vi: viText,
        level: c.stage,
        topic: 'general',
        example: `I can use the word "${c.en}".`,
        part_of_speech: c.part_of_speech,
        source: c.source,
        source_id: c.source,
        source_url: c.sourceUrl,
        license_status: 'open-license',
        license_name: c.licenseName,
        attribution: c.attribution,
        review_status: 'approved',
        cefr_level: c.cefr_level,
        quality_status: 'approved',
        safety_status: 'safe',
        cefr_reason: 'Level taken directly from CEFR-J / Octanove CEFR vocabulary profile.',
        vi_review_status: 'needs-review',
        vi_confidence: 0.6,
        vi_source_id: c.source,
        vi_source_url: c.sourceUrl,
        vi_license_name: viLicenseName,
        vi_attribution: viAttribution,
        vi_updated_at: now,
        sort_order: sortOrder++,
        active: true,
        updated_at: now,
      }));

    if (payload.length) {
      const { error } = await sb.from('word_bank_items').upsert(payload, { onConflict: 'en_lower' });
      if (error) throw new Error(`Upsert failed at batch ${i}: ${error.message}`);
      imported += payload.length;
    }
    console.log(`  ${Math.min(i + batch.length, candidates.length)}/${candidates.length} processed, ${imported} imported`);
    await sleep(400);
  }

  console.log(`Done. Imported/updated ${imported} CEFR rows.`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
