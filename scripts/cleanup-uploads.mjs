#!/usr/bin/env node
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

loadEnv({ path: '.env.local', override: false });

const cwd = process.cwd();
const uploadsDir = process.env.UPLOADS_DIR || path.join(cwd, 'public', 'uploads');
const shouldDelete = process.argv.includes('--delete');
const verbose = process.argv.includes('--verbose');
const maxAgeHoursArg = process.argv.find((arg) => arg.startsWith('--min-age-hours='));
const minAgeHours = maxAgeHoursArg ? Number(maxAgeHoursArg.split('=')[1]) : 1;
const minAgeMs = Math.max(0, Number.isFinite(minAgeHours) ? minAgeHours : 1) * 60 * 60 * 1000;
const now = Date.now();

const VIDEO_FILE_RE = /^[a-f0-9-]{36}\.(mp4|webm|mov|ogg|mp3|wav|m4a|aac|jpg|jpeg|png|webp)$/i;

function bytes(value) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = value;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false }, global: { fetch } });
}

function addFileRef(refs, value) {
  if (!value || typeof value !== 'string') return;
  const clean = value.trim();
  if (!clean) return;

  if (!/^https?:\/\//i.test(clean)) {
    refs.add(path.basename(clean.replace('/uploads/', '').replace(/^\/+/, '')));
    return;
  }

  try {
    const url = new URL(clean);
    const marker = '/api/videos/file/';
    const imageMarker = '/api/images/file/';
    if (url.pathname.includes(marker)) {
      refs.add(decodeURIComponent(url.pathname.slice(url.pathname.indexOf(marker) + marker.length)));
    }
    if (url.pathname.includes(imageMarker)) {
      refs.add(decodeURIComponent(url.pathname.slice(url.pathname.indexOf(imageMarker) + imageMarker.length)));
    }
  } catch {
    // Ignore malformed external URL.
  }
}

function collectStoryImageRefs(refs, story) {
  addFileRef(refs, story?.cover_image);
  for (const panel of Array.isArray(story?.panels) ? story.panels : []) addFileRef(refs, panel?.image);
}

async function collectRefs() {
  const supabase = getSupabaseAdmin();
  const refs = new Set(['.gitkeep']);

  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('object_key,thumbnail_url,deleted_at')
    .is('deleted_at', null);
  if (videosError) throw new Error(`Failed to load videos: ${videosError.message}`);
  for (const video of videos || []) {
    addFileRef(refs, video.object_key);
    addFileRef(refs, video.thumbnail_url);
  }

  const { data: settings, error: settingsError } = await supabase
    .from('site_settings')
    .select('key,value')
    .eq('key', 'background_music')
    .maybeSingle();
  if (!settingsError && settings?.value) addFileRef(refs, settings.value.objectKey);

  const { data: stories, error: storiesError } = await supabase
    .from('stories')
    .select('cover_image,panels');
  if (!storiesError) for (const story of stories || []) collectStoryImageRefs(refs, story);

  return refs;
}

async function walkFiles(root) {
  const out = [];
  async function visit(current) {
    let info;
    try {
      info = await stat(current);
    } catch {
      return;
    }
    if (info.isFile()) {
      out.push({ path: current, rel: path.relative(root, current).replace(/\\/g, '/'), size: info.size, mtimeMs: info.mtimeMs });
      return;
    }
    if (!info.isDirectory()) return;
    const children = await readdir(current).catch(() => []);
    await Promise.all(children.map((child) => visit(path.join(current, child))));
  }
  await visit(root);
  return out;
}

const refs = await collectRefs();
const files = await walkFiles(uploadsDir);
const stale = files.filter((file) => {
  const base = path.basename(file.rel);
  if (refs.has(file.rel) || refs.has(base)) return false;
  if (!VIDEO_FILE_RE.test(base) && !file.rel.startsWith('story-images/')) return false;
  return now - file.mtimeMs >= minAgeMs;
});

const staleBytes = stale.reduce((sum, file) => sum + file.size, 0);
console.log(`[uploads] dir: ${uploadsDir}`);
console.log(`[uploads] referenced files: ${refs.size}`);
console.log(`[uploads] stale candidates: ${stale.length} (${bytes(staleBytes)})`);
if (!shouldDelete) console.log('[uploads] dry-run only. Add --delete to remove candidates.');

for (const file of stale.sort((a, b) => b.size - a.size)) {
  console.log(`${shouldDelete ? 'delete' : 'would delete'} ${bytes(file.size).padStart(8)}  ${file.rel}`);
  if (shouldDelete) await unlink(file.path).catch((error) => console.warn(`[uploads] failed ${file.rel}: ${error.message}`));
}

if (verbose) {
  console.log('\n[uploads] kept refs:');
  for (const ref of [...refs].sort()) console.log(ref);
}
