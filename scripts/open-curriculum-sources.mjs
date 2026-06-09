#!/usr/bin/env node
import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const root = process.cwd();
const mode = process.argv[2] || 'validate';
const registryPath = path.join(root, 'data', 'open-curriculum', 'source-registry.json');
const snapshotDir = path.join(root, 'data', 'open-curriculum', 'snapshots');
const MAX_SNAPSHOT_BYTES = 220_000;
const REQUIRED = ['sourceId', 'title', 'publisher', 'url', 'licenseName', 'licenseUrl', 'attribution', 'allowedUse', 'sourceKind', 'importMode'];
const VALID_LEVELS = new Set(['a2-key', 'b1-preliminary', 'b2-first', 'c1-advanced']);
const VALID_KINDS = new Set(['framework', 'lexical', 'reading']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readRegistry() {
  const rows = JSON.parse(await readFile(registryPath, 'utf8'));
  if (!Array.isArray(rows)) throw new Error('source-registry.json must be an array.');
  const seen = new Set();
  const errors = [];
  for (const [index, source] of rows.entries()) {
    const label = source?.sourceId || `source ${index + 1}`;
    for (const field of REQUIRED) if (!String(source?.[field] || '').trim()) errors.push(`${label}: missing ${field}`);
    if (seen.has(source.sourceId)) errors.push(`${label}: duplicate sourceId`);
    seen.add(source.sourceId);
    if (!VALID_KINDS.has(source.sourceKind)) errors.push(`${label}: invalid sourceKind`);
    if (!Array.isArray(source.levelMapping) || source.levelMapping.some((level) => !VALID_LEVELS.has(level))) errors.push(`${label}: invalid levelMapping`);
    try { new URL(source.url); } catch { errors.push(`${label}: invalid url`); }
    try { new URL(source.licenseUrl); } catch { errors.push(`${label}: invalid licenseUrl`); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return rows;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchSnapshot(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response;
  const chunks = [];
  let total = 0;
  let truncated = false;
  try {
    response = await fetch(source.url, {
      headers: { 'User-Agent': 'Engkids curriculum source verifier/1.0' },
      signal: controller.signal,
    });
    if (response.body) {
      const reader = response.body.getReader();
      while (total < MAX_SNAPSHOT_BYTES) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        const remaining = MAX_SNAPSHOT_BYTES - total;
        const chunk = Buffer.from(value).subarray(0, remaining);
        chunks.push(chunk);
        total += chunk.length;
        if (value.length > remaining) {
          truncated = true;
          break;
        }
      }
      if (total >= MAX_SNAPSHOT_BYTES) truncated = true;
      await reader.cancel().catch(() => undefined);
    }
  } finally {
    clearTimeout(timeout);
  }
  const bytes = Buffer.concat(chunks);
  const text = bytes.toString('utf8');
  const snapshot = {
    sourceId: source.sourceId,
    url: source.url,
    fetchedAt: new Date().toISOString(),
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    bytesRead: bytes.length,
    truncated,
    snapshotHash: sha256(text),
    // Keep a tiny diagnostic preview only. Actual learning rows must come from reviewed extracts.
    preview: text.replace(/\s+/g, ' ').slice(0, 600),
  };
  await mkdir(snapshotDir, { recursive: true });
  await writeFile(path.join(snapshotDir, `${source.sourceId}.json`), JSON.stringify(snapshot, null, 2));
  return snapshot;
}

async function loadSnapshot(sourceId) {
  return JSON.parse(await readFile(path.join(snapshotDir, `${sourceId}.json`), 'utf8'));
}

async function stageSources(sources) {
  const supabase = getSupabaseAdmin();
  for (const source of sources) {
    const snapshot = await loadSnapshot(source.sourceId).catch(() => null);
    const sourceHash = snapshot?.snapshotHash || sha256(JSON.stringify(source));
    const { error: sourceError } = await supabase.from('curriculum_import_sources').upsert({
      id: source.sourceId,
      title: source.title,
      publisher: source.publisher,
      license_proof: source.licenseUrl,
      allowed_use: source.allowedUse,
      level: source.levelMapping[0],
      file_path: '',
      content_type: source.sourceKind,
      import_mode: source.importMode,
      approved: false,
      source_hash: sourceHash,
      source_url: source.url,
      attribution: source.attribution,
      license_name: source.licenseName,
      license_url: source.licenseUrl,
      source_kind: source.sourceKind,
      trust_status: 'trusted',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (sourceError) throw new Error(`${source.sourceId}: ${sourceError.message}`);

    const payload = {
      title: source.title,
      publisher: source.publisher,
      sourceKind: source.sourceKind,
      importMode: source.importMode,
      allowedUse: source.allowedUse,
      levelMapping: source.levelMapping,
      snapshot: snapshot ? {
        status: snapshot.status,
        contentType: snapshot.contentType,
        bytesRead: snapshot.bytesRead,
        truncated: snapshot.truncated,
        snapshotHash: snapshot.snapshotHash,
      } : null,
      note: 'Trusted source staged for admin review. No learner-facing lesson/content is published by this step.',
    };

    const { error: deleteError } = await supabase
      .from('curriculum_import_staging')
      .delete()
      .eq('source_id', source.sourceId)
      .eq('entity_type', 'source-reference')
      .in('review_status', ['pending', 'approved']);
    if (deleteError) throw new Error(`${source.sourceId}: ${deleteError.message}`);

    const { error: stagingError } = await supabase.from('curriculum_import_staging').insert({
      source_id: source.sourceId,
      row_index: 1,
      entity_type: 'source-reference',
      payload,
      review_status: 'pending',
      source_url: source.url,
      attribution: source.attribution,
      license_name: source.licenseName,
      license_url: source.licenseUrl,
      source_hash: sourceHash,
    });
    if (stagingError) throw new Error(`${source.sourceId}: ${stagingError.message}`);
  }
}

async function approveSource(sourceId) {
  if (!sourceId) throw new Error('Pass --source=<sourceId>');
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error: sourceError } = await supabase.from('curriculum_import_sources').update({ approved: true, imported_at: now, updated_at: now }).eq('id', sourceId);
  if (sourceError) throw new Error(sourceError.message);
  const { error: stagingError } = await supabase.from('curriculum_import_staging').update({ review_status: 'approved' }).eq('source_id', sourceId).eq('review_status', 'pending');
  if (stagingError) throw new Error(stagingError.message);
}

const sources = await readRegistry();

if (mode === 'validate') {
  console.log(`Open curriculum source registry OK: ${sources.length} source(s).`);
} else if (mode === 'fetch') {
  for (const source of sources) {
    try {
      const snapshot = await fetchSnapshot(source);
      console.log(`${source.sourceId}: HTTP ${snapshot.status}, ${snapshot.bytesRead} bytes, hash=${snapshot.snapshotHash.slice(0, 12)}`);
    } catch (error) {
      const snapshot = {
        sourceId: source.sourceId,
        url: source.url,
        fetchedAt: new Date().toISOString(),
        ok: false,
        status: 0,
        contentType: '',
        bytesRead: 0,
        truncated: false,
        snapshotHash: sha256(`${source.sourceId}:${source.url}:${error.message || error}`),
        error: error.message || String(error),
      };
      await mkdir(snapshotDir, { recursive: true });
      await writeFile(path.join(snapshotDir, `${source.sourceId}.json`), JSON.stringify(snapshot, null, 2));
      console.warn(`${source.sourceId}: fetch failed (${snapshot.error}); staged metadata can still be reviewed.`);
    }
  }
} else if (mode === 'stage') {
  await stageSources(sources);
  console.log(`Staged ${sources.length} trusted source reference(s) for admin review.`);
} else if (mode === 'approve') {
  const sourceId = process.argv.find((arg) => arg.startsWith('--source='))?.slice('--source='.length);
  await approveSource(sourceId);
  console.log(`Approved staged source reference: ${sourceId}`);
} else {
  throw new Error('Use validate, fetch, stage, or approve.');
}
