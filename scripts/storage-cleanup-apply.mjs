#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
const minAgeHours = Number(process.argv.find((arg) => arg.startsWith('--min-age-hours='))?.split('=')[1] || '1');
const apply = process.argv.includes('--apply');
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
    refs.add(clean.replace(/^\/+/, ''));
    return;
  }
  try {
    const url = new URL(clean);
    for (const marker of ['/api/videos/file/', '/api/images/file/', '/api/assets/file/']) {
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

  const { data: settings } = await db.from('site_settings').select('key,value');
  for (const setting of settings || []) {
    if (setting?.value && typeof setting.value === 'object') {
      for (const value of Object.values(setting.value)) addRef(refs, value);
    }
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

const refs = await collectRefs();
const now = Date.now();
const minAgeMs = Math.max(0, minAgeHours) * 60 * 60 * 1000;
const files = await walk(uploadsDir);
const marked = files.map((file) => {
  const base = path.basename(file.rel);
  const referenced = refs.has(file.rel) || refs.has(base);
  const managed = FILE_RE.test(base) || file.rel.startsWith('story-images/');
  return { ...file, referenced, managed, stale: !referenced && managed && now - file.mtimeMs >= minAgeMs };
});
const stale = marked.filter((file) => file.stale).sort((a, b) => b.size - a.size);
const staleBytes = stale.reduce((sum, file) => sum + file.size, 0);
const deleted = [];

if (apply) {
  for (const file of stale) {
    await unlink(path.join(uploadsDir, file.rel));
    deleted.push(file.rel);
    console.log(`deleted ${bytes(file.size).padStart(8)} ${file.rel}`);
  }
} else {
  for (const file of stale) console.log(`would delete ${bytes(file.size).padStart(8)} ${file.rel}`);
}

const summary = {
  uploadsDir,
  dryRun: !apply,
  staleCount: stale.length,
  staleBytes,
  staleLabel: bytes(staleBytes),
  deleted,
};

const db = supabaseAdmin();
if (db) {
  await db.from('storage_cleanup_events').insert({
    actor: 'storage-cleanup-apply-script',
    dry_run: !apply,
    summary,
  });
}

console.log(JSON.stringify(summary, null, 2));
