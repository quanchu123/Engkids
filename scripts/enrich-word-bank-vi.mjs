#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PAGE_SIZE = 1000;
const APPLY = process.argv.includes('--apply');
const USE_MACHINE = process.argv.includes('--machine') || process.env.WORD_BANK_VI_MACHINE === '1';
const USE_GOOGLE = process.argv.includes('--google') || process.env.WORD_BANK_VI_PROVIDER === 'google';
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || process.env.WORD_BANK_VI_LIMIT || 0);
const APPLY_BATCH_SIZE = Number(process.env.WORD_BANK_VI_APPLY_BATCH_SIZE || 100);
const MACHINE_CONCURRENCY = Math.max(1, Number(process.env.WORD_BANK_VI_CONCURRENCY || (USE_GOOGLE ? 8 : 1)));
const MACHINE_DELAY_MS = Math.max(0, Number(process.env.WORD_BANK_VI_DELAY_MS || 0));
const RAW_DIR = process.env.OPEN_TRANSLATION_RAW_DIR || path.join('data', 'open-curriculum', 'translations');
const OUT_DIR = path.join('output', 'audits');

const OPEN_SOURCE_META = {
  freedict: {
    sourceId: 'freedict-eng-vie',
    sourceUrl: 'https://freedict.org/',
    licenseName: 'GPL-compatible FreeDict dictionary license, verify per downloaded file',
    licenseUrl: 'https://freedict.org/',
    attribution: 'FreeDict project',
    confidence: 0.95,
  },
  wiktionary: {
    sourceId: 'wiktionary-wiktextract',
    sourceUrl: 'https://www.wiktionary.org/',
    licenseName: 'CC BY-SA / GFDL, verify extracted dump metadata',
    licenseUrl: 'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use',
    attribution: 'Wiktionary contributors',
    confidence: 0.9,
  },
  omw: {
    sourceId: 'open-multilingual-wordnet',
    sourceUrl: 'https://omwn.org/',
    licenseName: 'Open Multilingual Wordnet license, verify per package',
    licenseUrl: 'https://omwn.org/',
    attribution: 'Open Multilingual Wordnet contributors',
    confidence: 0.85,
  },
  tatoeba: {
    sourceId: 'tatoeba-eng-vie-context',
    sourceUrl: 'https://tatoeba.org/en/downloads',
    licenseName: 'CC BY 2.0 FR',
    licenseUrl: 'https://tatoeba.org/en/downloads',
    attribution: 'Tatoeba contributors',
    confidence: 0.7,
  },
  google: {
    sourceId: 'google-machine-translation',
    sourceUrl: 'https://translate.google.com/',
    licenseName: 'Machine translation candidate, needs human review',
    licenseUrl: 'https://policies.google.com/terms',
    attribution: 'Google Translate machine translation candidate',
    confidence: 0.45,
  },
  mymemory: {
    sourceId: 'mymemory-machine-translation',
    sourceUrl: 'https://mymemory.translated.net/',
    licenseName: 'Machine translation candidate, needs human review',
    licenseUrl: 'https://mymemory.translated.net/doc/spec.php',
    attribution: 'MyMemory machine translation candidate',
    confidence: 0.45,
  },
};

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function detectSource(file) {
  const lower = file.toLowerCase();
  if (lower.includes('freedict')) return OPEN_SOURCE_META.freedict;
  if (lower.includes('wiktionary') || lower.includes('wiktextract')) return OPEN_SOURCE_META.wiktionary;
  if (lower.includes('omw') || lower.includes('wordnet')) return OPEN_SOURCE_META.omw;
  if (lower.includes('tatoeba')) return OPEN_SOURCE_META.tatoeba;
  return OPEN_SOURCE_META.wiktionary;
}

function parseDelimited(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    const sep = line.includes('\t') ? '\t' : ',';
    const parts = line.split(sep).map((part) => part.trim().replace(/^"|"$/g, ''));
    if (parts.length < 2) continue;
    const [en, vi] = parts;
    if (en && vi) out.push({ en, vi });
  }
  return out;
}

function parseJsonRows(text) {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.rows) ? parsed.rows : [];
  return rows.map((row) => ({
    en: row.en || row.english || row.word || row.lemma || row.source || '',
    vi: row.vi || row.vietnamese || row.translation || row.target || row.meaning || '',
  })).filter((row) => row.en && row.vi);
}

function parseJsonlRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      rows.push(...parseJsonRows(`[${line}]`));
    } catch {}
  }
  return rows;
}

function loadOpenTranslations(rawDir = RAW_DIR) {
  const map = new Map();
  if (!fs.existsSync(rawDir)) return map;
  const files = fs.readdirSync(rawDir, { recursive: true })
    .filter((file) => /\.(json|jsonl|csv|tsv|txt)$/i.test(String(file)))
    .map((file) => path.join(rawDir, String(file)));

  for (const file of files) {
    const meta = detectSource(file);
    const text = fs.readFileSync(file, 'utf8');
    let rows = [];
    if (/\.json$/i.test(file)) rows = parseJsonRows(text);
    else if (/\.jsonl$/i.test(file)) rows = parseJsonlRows(text);
    else rows = parseDelimited(text);
    for (const row of rows) {
      const key = norm(row.en);
      const vi = String(row.vi || '').trim();
      if (!key || !vi || vi.toLowerCase() === 'translation_pending') continue;
      if (!map.has(key)) map.set(key, { vi, ...meta, reviewStatus: 'approved' });
    }
  }
  return map;
}

async function fetchRows(client) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('word_bank_items')
      .select('id,en,vi,active,vi_review_status,vi_confidence,quality_status')
      .eq('active', true)
      .order('en', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function googleTranslate(en) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(en)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Engkids curriculum enrichment audit' } });
  if (!res.ok) return null;
  const data = await res.json();
  const vi = Array.isArray(data?.[0]) ? data[0].map((part) => part?.[0] || '').join('').trim() : '';
  if (!vi || typeof vi !== 'string') return null;
  return { vi, ...OPEN_SOURCE_META.google, reviewStatus: 'needs-review' };
}

async function machineTranslate(en) {
  if (USE_GOOGLE) {
    const google = await googleTranslate(en).catch(() => null);
    if (google) return google;
  }
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(en)}&langpair=en|vi`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Engkids curriculum enrichment audit' } });
  if (!res.ok) return null;
  const data = await res.json();
  const vi = data?.responseData?.translatedText;
  if (!vi || typeof vi !== 'string') return null;
  return { vi: vi.trim(), ...OPEN_SOURCE_META.mymemory, reviewStatus: 'needs-review' };
}

async function applyCandidates(client, candidates) {
  if (!candidates.length) return;
  for (const { row, match } of candidates) {
    const update = {
      vi: match.vi,
      vi_review_status: match.reviewStatus,
      vi_source_id: match.sourceId,
      vi_source_url: match.sourceUrl,
      vi_license_name: match.licenseName,
      vi_license_url: match.licenseUrl,
      vi_attribution: match.attribution,
      vi_confidence: match.confidence,
      vi_updated_at: new Date().toISOString(),
      quality_status: match.reviewStatus === 'approved' ? 'approved' : 'needs-review',
      source_hash: hash(`${match.sourceId}:${row.en}:${match.vi}`),
    };
    const { error } = await client.from('word_bank_items').update(update).eq('id', row.id);
    if (error) throw error;
  }
}

async function main() {
  const client = supabase();
  const openMap = loadOpenTranslations();
  const rows = await fetchRows(client);
  const candidates = [];
  const skippedApproved = [];
  const pending = rows.filter((row) => !row.vi || norm(row.vi) === 'translation_pending' || row.vi_review_status === 'translation_pending');

  let appliedRows = 0;
  let checkedRows = 0;
  const pendingToProcess = LIMIT ? pending.slice(0, LIMIT) : pending;
  for (let offset = 0; offset < pendingToProcess.length; offset += MACHINE_CONCURRENCY) {
    const group = pendingToProcess.slice(offset, offset + MACHINE_CONCURRENCY);
    const translated = await Promise.all(group.map(async (row) => {
      const open = openMap.get(norm(row.en));
      let match = open || null;
      if (!match && USE_MACHINE) match = await machineTranslate(row.en);
      return match?.vi && norm(match.vi) !== 'translation_pending' ? { row, match } : null;
    }));
    checkedRows += group.length;
    for (const candidate of translated) {
      if (candidate) candidates.push(candidate);
    }
    if (APPLY && candidates.length - appliedRows >= APPLY_BATCH_SIZE) {
      const batch = candidates.slice(appliedRows, candidates.length);
      await applyCandidates(client, batch);
      appliedRows += batch.length;
      console.log(JSON.stringify({ progress: true, checkedRows, matchedRows: candidates.length, appliedRows, remainingPendingEstimate: Math.max(pendingToProcess.length - checkedRows, 0) }));
    }
    await sleep(MACHINE_DELAY_MS);
  }

  if (APPLY && candidates.length > appliedRows) {
    const batch = candidates.slice(appliedRows);
    await applyCandidates(client, batch);
    appliedRows += batch.length;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    apply: APPLY,
    useMachine: USE_MACHINE,
    provider: USE_GOOGLE ? 'google' : USE_MACHINE ? 'mymemory' : 'open-source-only',
    concurrency: MACHINE_CONCURRENCY,
    rawDir: RAW_DIR,
    openTranslationEntries: openMap.size,
    activeRows: rows.length,
    pendingRows: pending.length,
    matchedRows: candidates.length,
    skippedApproved: skippedApproved.length,
    sample: candidates.slice(0, 25).map(({ row, match }) => ({ en: row.en, oldVi: row.vi, newVi: match.vi, source: match.sourceId, status: match.reviewStatus })),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'word-bank-vi-enrichment-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) console.log('Dry-run only. Add --apply to write matched rows. Add --machine to request machine candidates as needs-review.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});