#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const mode = process.argv[2] || 'validate';
const explicitManifestPath = process.argv.find((arg) => arg.startsWith('--manifest='))?.slice('--manifest='.length);
const manifestPath = explicitManifestPath
  || path.join(root, 'data', 'licensed-curriculum', 'manifest.json');
const stagingPath = path.join(root, 'data', 'licensed-curriculum', 'staging', 'licensed-extract.json');
const VALID_LEVELS = new Set(['a2-key', 'b1-preliminary', 'b2-first', 'c1-advanced']);
const DIRECT_TYPES = new Set(['word-bank-csv', 'word-bank-json', 'lesson-json']);
const REVIEW_TYPES = new Set(['pdf', 'docx']);

function readManifest() {
  if (!fs.existsSync(manifestPath) && mode === 'validate' && !explicitManifestPath) {
    const examplePath = path.join(root, 'data', 'licensed-curriculum', 'manifest.example.json');
    console.warn(`Missing private manifest; validating example instead: ${examplePath}`);
    const rows = JSON.parse(fs.readFileSync(examplePath, 'utf8').replace(/^\uFEFF/, ''));
    if (!Array.isArray(rows)) throw new Error('Manifest must be a JSON array.');
    return rows;
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}. Copy data/licensed-curriculum/manifest.example.json to manifest.json and mark approved sources.`);
  }
  const rows = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(rows)) throw new Error('Manifest must be a JSON array.');
  return rows;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function normalizeSource(row, index) {
  const label = `source ${index + 1}`;
  const source = {
    sourceId: String(row.sourceId || '').trim(),
    title: String(row.title || '').trim(),
    publisher: String(row.publisher || '').trim(),
    licenseProof: String(row.licenseProof || '').trim(),
    sourceUrl: String(row.sourceUrl || row.source_url || '').trim(),
    attribution: String(row.attribution || '').trim(),
    licenseName: String(row.licenseName || row.license_name || '').trim(),
    licenseUrl: String(row.licenseUrl || row.license_url || '').trim(),
    allowedUse: String(row.allowedUse || '').trim(),
    level: String(row.level || '').trim(),
    filePath: String(row.filePath || '').trim(),
    contentType: String(row.contentType || '').trim(),
    importMode: String(row.importMode || 'review').trim(),
    approved: row.approved === true,
  };
  const errors = [];
  if (!source.sourceId) errors.push(`${label}: missing sourceId`);
  if (!source.title) errors.push(`${label}: missing title`);
  if (!source.publisher) errors.push(`${label}: missing publisher`);
  if (!source.licenseProof) errors.push(`${label}: missing licenseProof`);
  if (!source.sourceUrl) errors.push(`${label}: missing sourceUrl`);
  if (!source.attribution) errors.push(`${label}: missing attribution`);
  if (!source.licenseName) errors.push(`${label}: missing licenseName`);
  if (!source.licenseUrl) errors.push(`${label}: missing licenseUrl`);
  if (!source.allowedUse) errors.push(`${label}: missing allowedUse`);
  if (!VALID_LEVELS.has(source.level)) errors.push(`${label}: invalid level ${source.level}`);
  if (!source.filePath) errors.push(`${label}: missing filePath`);
  const absolutePath = path.resolve(root, source.filePath);
  if (mode !== 'validate' && !fs.existsSync(absolutePath)) errors.push(`${label}: file not found ${source.filePath}`);
  if (!DIRECT_TYPES.has(source.contentType) && !REVIEW_TYPES.has(source.contentType)) errors.push(`${label}: unsupported contentType ${source.contentType}`);
  if (mode !== 'validate' && !source.approved) errors.push(`${label}: approved must be true before import/extract`);
  return { ...source, absolutePath, errors };
}

function validateSources() {
  const manifest = readManifest();
  const seen = new Set();
  const normalized = manifest.map(normalizeSource);
  const errors = [];
  for (const source of normalized) {
    if (seen.has(source.sourceId)) errors.push(`duplicate sourceId ${source.sourceId}`);
    seen.add(source.sourceId);
    errors.push(...source.errors);
  }
  if (errors.length > 0) throw new Error(errors.join('\n'));
  console.log(`Licensed manifest OK: ${normalized.length} approved source(s).`);
  return normalized;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function splitCsvLine(line) {
  const out = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      out.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current.trim());
  return out;
}

function normalizeWord(row, source, index) {
  return {
    en: String(row.en || row.word || row.english || '').trim(),
    vi: String(row.vi || row.vietnamese || row.meaning_vi || '').trim(),
    level: VALID_LEVELS.has(String(row.level || '').trim()) ? String(row.level).trim() : source.level,
    topic: String(row.topic || 'general').trim().toLowerCase(),
    example: String(row.example || row.example_sentence || '').trim(),
    part_of_speech: String(row.part_of_speech || row.pos || 'other').trim(),
    source: source.sourceId,
    source_id: source.sourceId,
    license_status: 'licensed',
    review_status: 'approved',
    source_hash: source.sourceHash,
    source_url: source.sourceUrl,
    attribution: source.attribution,
    license_name: source.licenseName,
    license_url: source.licenseUrl,
    tags: Array.isArray(row.tags) ? row.tags : [],
    sort_order: Number(row.sort_order) || index + 1,
    active: row.active !== false,
  };
}

function extractSource(source) {
  const sourceHash = sha256File(source.absolutePath);
  const withHash = { ...source, sourceHash };
  if (source.contentType === 'word-bank-csv') {
    const rows = parseCsv(fs.readFileSync(source.absolutePath, 'utf8')).map((row, index) => normalizeWord(row, withHash, index));
    return { source: withHash, words: rows, lessons: [], staging: [] };
  }
  if (source.contentType === 'word-bank-json') {
    const rows = JSON.parse(fs.readFileSync(source.absolutePath, 'utf8'));
    if (!Array.isArray(rows)) throw new Error(`${source.sourceId}: word-bank-json must be an array`);
    return { source: withHash, words: rows.map((row, index) => normalizeWord(row, withHash, index)), lessons: [], staging: [] };
  }
  if (source.contentType === 'lesson-json') {
    const rows = JSON.parse(fs.readFileSync(source.absolutePath, 'utf8'));
    if (!Array.isArray(rows)) throw new Error(`${source.sourceId}: lesson-json must be an array`);
    return { source: withHash, words: [], lessons: rows, staging: [] };
  }
  return {
    source: withHash,
    words: [],
    lessons: [],
    staging: [{ entity_type: source.contentType, payload: { filePath: source.filePath, title: source.title, note: 'Manual review required before import.' } }],
  };
}

function validateExtracted(extracts) {
  const errors = [];
  for (const extract of extracts) {
    for (const [index, word] of extract.words.entries()) {
      const label = `${extract.source.sourceId} word ${index + 1}`;
      if (!word.en) errors.push(`${label}: missing en`);
      if (!word.vi) errors.push(`${label}: missing vi`);
      if (!word.example) errors.push(`${label}: missing example`);
      if (!VALID_LEVELS.has(word.level)) errors.push(`${label}: invalid level ${word.level}`);
    }
  }
  if (errors.length) throw new Error(errors.slice(0, 40).join('\n'));
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function upsertExtracts(extracts) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  for (const extract of extracts) {
    const source = extract.source;
    const { error: sourceError } = await supabase.from('curriculum_import_sources').upsert({
      id: source.sourceId,
      title: source.title,
      publisher: source.publisher,
      license_proof: source.licenseProof,
      allowed_use: source.allowedUse,
      source_url: source.sourceUrl,
      attribution: source.attribution,
      license_name: source.licenseName,
      license_url: source.licenseUrl,
      source_kind: source.contentType.startsWith('word-bank') ? 'lexical' : 'reading',
      trust_status: 'trusted',
      level: source.level,
      file_path: source.filePath,
      content_type: source.contentType,
      import_mode: source.importMode,
      approved: source.approved,
      source_hash: source.sourceHash,
      imported_at: now,
      updated_at: now,
    });
    if (sourceError) throw new Error(`${source.sourceId}: ${sourceError.message}`);

    for (let i = 0; i < extract.words.length; i += 200) {
      const chunk = extract.words.slice(i, i + 200).map((word) => ({ ...word, imported_at: now, updated_at: now }));
      const { error } = await supabase.from('word_bank_items').upsert(chunk, { onConflict: 'en_lower' });
      if (error) throw new Error(`${source.sourceId} word import: ${error.message}`);
    }

    if (extract.staging.length) {
      const { error } = await supabase.from('curriculum_import_staging').insert(extract.staging.map((item, index) => ({
        source_id: source.sourceId,
        row_index: index + 1,
        entity_type: item.entity_type,
        payload: item.payload,
        review_status: 'pending',
        source_url: source.sourceUrl,
        attribution: source.attribution,
        license_name: source.licenseName,
        license_url: source.licenseUrl,
        source_hash: source.sourceHash,
      })));
      if (error) throw new Error(`${source.sourceId} staging: ${error.message}`);
    }
  }
}

const sources = validateSources();

if (mode === 'validate') {
  console.log(JSON.stringify({ sources: sources.length, status: 'schema-ok' }, null, 2));
} else if (mode === 'extract') {
  const extracts = sources.map(extractSource);
  validateExtracted(extracts);
  fs.mkdirSync(path.dirname(stagingPath), { recursive: true });
  fs.writeFileSync(stagingPath, JSON.stringify(extracts, null, 2));
  console.log(`Wrote staging extract: ${stagingPath}`);
} else if (mode === 'import') {
  const extracts = sources.map(extractSource);
  validateExtracted(extracts);
  await upsertExtracts(extracts);
  console.log(`Imported licensed curriculum from ${extracts.length} source(s).`);
} else {
  throw new Error(`Unknown mode ${mode}. Use validate, extract, or import.`);
}
