#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
const minAgeHours = Number(process.argv.find((arg) => arg.startsWith('--min-age-hours='))?.split('=')[1] || '1');
const maxFiles = Number(process.argv.find((arg) => arg.startsWith('--max-files='))?.split('=')[1] || '30');
const FILE_RE = /^[a-f0-9-]{36}\.(mp4|webm|mov|ogg|mp3|wav|m4a|aac|jpg|jpeg|png|webp|avif)$/i;

function bytes(value) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = value;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function addRef(refs, value) {
  if (!value || typeof value !== 'string') return;
  const clean = value.trim();
  if (!clean) return;
  if (!/^https?:\/\//i.test(clean)) {
    refs.add(path.basename(clean.replace('/uploads/', '').replace(/^\/+/, '')));
    return;
  }
  try {
    const url = new URL(clean);
    for (const marker of ['/api/videos/file/', '/api/images/file/']) {
      const index = url.pathname.indexOf(marker);
      if (index >= 0) refs.add(decodeURIComponent(url.pathname.slice(index + marker.length)));
    }
  } catch {}
}

async function collectRefs() {
  const refs = new Set(['.gitkeep']);
  const db = supabaseAdmin();
  if (!db) return refs;
  const { data: videos } = await db.from('videos').select('object_key,thumbnail_url,deleted_at').is('deleted_at', null);
  for (const video of videos || []) { addRef(refs, video.object_key); addRef(refs, video.thumbnail_url); }
  const { data: stories } = await db.from('stories').select('cover_image,panels');
  for (const story of stories || []) {
    addRef(refs, story.cover_image);
    for (const panel of Array.isArray(story.panels) ? story.panels : []) addRef(refs, panel?.image);
  }
  const { data: assets } = await db.from('lesson_assets').select('original_url,optimized_url').eq('active', true);
  for (const asset of assets || []) { addRef(refs, asset.original_url); addRef(refs, asset.optimized_url); }
  return refs;
}

async function walk(root) {
  const rows = [];
  async function visit(current) {
    let info;
    try { info = await stat(current); } catch { return; }
    if (info.isFile()) {
      rows.push({ rel: path.relative(root, current).replace(/\\/g, '/'), size: info.size, mtimeMs: info.mtimeMs });
      return;
    }
    if (!info.isDirectory()) return;
    const children = await readdir(current).catch(() => []);
    await Promise.all(children.map((child) => visit(path.join(current, child))));
  }
  await visit(root);
  return rows;
}

async function count(table) {
  const db = supabaseAdmin();
  if (!db) return 0;
  const { count: total } = await db.from(table).select('*', { count: 'exact', head: true });
  return total || 0;
}

const refs = await collectRefs();
const files = await walk(uploadsDir);
const now = Date.now();
const minAgeMs = Math.max(0, minAgeHours) * 60 * 60 * 1000;
const marked = files.map((file) => {
  const base = path.basename(file.rel);
  const referenced = refs.has(file.rel) || refs.has(base);
  const stale = !referenced && (FILE_RE.test(base) || file.rel.startsWith('story-images/')) && now - file.mtimeMs >= minAgeMs;
  return { ...file, referenced, stale };
});
const stale = marked.filter((file) => file.stale).sort((a, b) => b.size - a.size);
const totalBytes = marked.reduce((sum, file) => sum + file.size, 0);
const staleBytes = stale.reduce((sum, file) => sum + file.size, 0);
const dbCounts = {};
for (const table of ['stories', 'videos', 'word_bank_items', 'lessons', 'lesson_assets', 'static_asset_manifest', 'storage_cleanup_events', 'assessment_attempts', 'assessment_responses']) dbCounts[table] = await count(table);

console.log(JSON.stringify({
  uploadsDir,
  total: { files: marked.length, bytes: totalBytes, label: bytes(totalBytes) },
  referenced: marked.filter((file) => file.referenced).length,
  stale: { files: stale.length, bytes: staleBytes, label: bytes(staleBytes) },
  dbCounts,
  biggestFiles: [...marked].sort((a, b) => b.size - a.size).slice(0, maxFiles).map((file) => ({ ...file, label: bytes(file.size) })),
  staleCandidates: stale.slice(0, maxFiles).map((file) => ({ ...file, label: bytes(file.size) })),
}, null, 2));
