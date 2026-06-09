import { createClient } from '@supabase/supabase-js';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { UPLOADS_DIR } from '@/services/storage';

const FILE_RE = /^[a-f0-9-]{36}\.(mp4|webm|mov|ogg|mp3|wav|m4a|aac|jpg|jpeg|png|webp|avif)$/i;

export interface StorageFileRow {
  rel: string;
  size: number;
  mtimeMs: number;
  referenced: boolean;
  staleCandidate: boolean;
}

export interface StorageAuditReport {
  uploadsDir: string;
  totalBytes: number;
  fileCount: number;
  referencedCount: number;
  staleBytes: number;
  staleCount: number;
  biggestFiles: StorageFileRow[];
  staleCandidates: StorageFileRow[];
  dbCounts: Record<string, number>;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function addRef(refs: Set<string>, value: unknown) {
  if (typeof value !== 'string') return;
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
  } catch {
    // Ignore malformed external URLs.
  }
}

async function walkFiles(root: string): Promise<StorageFileRow[]> {
  const rows: StorageFileRow[] = [];
  async function visit(current: string) {
    let info;
    try {
      info = await stat(current);
    } catch {
      return;
    }
    if (info.isFile()) {
      rows.push({ rel: path.relative(root, current).replace(/\\/g, '/'), size: info.size, mtimeMs: info.mtimeMs, referenced: false, staleCandidate: false });
      return;
    }
    if (!info.isDirectory()) return;
    const children = await readdir(current).catch(() => []);
    await Promise.all(children.map((child) => visit(path.join(current, child))));
  }
  await visit(root);
  return rows;
}

async function tableCount(table: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return count || 0;
}

export async function collectStorageRefs(): Promise<Set<string>> {
  const refs = new Set<string>(['.gitkeep']);
  const supabase = getSupabaseAdmin();
  if (!supabase) return refs;

  const { data: videos } = await supabase.from('videos').select('object_key,thumbnail_url,deleted_at').is('deleted_at', null);
  for (const video of videos || []) {
    addRef(refs, (video as Record<string, unknown>).object_key);
    addRef(refs, (video as Record<string, unknown>).thumbnail_url);
  }

  const { data: stories } = await supabase.from('stories').select('cover_image,panels');
  for (const story of stories || []) {
    const row = story as Record<string, unknown>;
    addRef(refs, row.cover_image);
    const panels = Array.isArray(row.panels) ? row.panels : [];
    for (const panel of panels) addRef(refs, (panel as Record<string, unknown>)?.image);
  }

  const { data: settings } = await supabase.from('site_settings').select('key,value').eq('key', 'background_music').maybeSingle();
  if (settings?.value) addRef(refs, (settings.value as Record<string, unknown>).objectKey);

  let assets: unknown[] | null = null;
  try {
    const result = await supabase.from('lesson_assets').select('original_url,optimized_url').eq('active', true);
    assets = result.data as unknown[] | null;
  } catch {
    assets = null;
  }
  for (const asset of assets || []) {
    addRef(refs, (asset as Record<string, unknown>).original_url);
    addRef(refs, (asset as Record<string, unknown>).optimized_url);
  }

  return refs;
}

export async function auditStorage(minAgeHours = 1): Promise<StorageAuditReport> {
  const refs = await collectStorageRefs();
  const files = await walkFiles(UPLOADS_DIR);
  const minAgeMs = Math.max(0, minAgeHours) * 60 * 60 * 1000;
  const now = Date.now();
  const marked = files.map((file) => {
    const base = path.basename(file.rel);
    const referenced = refs.has(file.rel) || refs.has(base);
    const isManaged = FILE_RE.test(base) || file.rel.startsWith('story-images/');
    return {
      ...file,
      referenced,
      staleCandidate: !referenced && isManaged && now - file.mtimeMs >= minAgeMs,
    };
  });
  const stale = marked.filter((file) => file.staleCandidate).sort((a, b) => b.size - a.size);
  const totalBytes = marked.reduce((sum, file) => sum + file.size, 0);
  const staleBytes = stale.reduce((sum, file) => sum + file.size, 0);
  const dbCounts: Record<string, number> = {};
  for (const table of ['stories', 'videos', 'word_bank_items', 'lessons', 'lesson_assets', 'static_asset_manifest', 'storage_cleanup_events', 'assessment_attempts', 'assessment_responses']) {
    dbCounts[table] = await tableCount(table);
  }
  return {
    uploadsDir: UPLOADS_DIR,
    totalBytes,
    fileCount: marked.length,
    referencedCount: marked.filter((file) => file.referenced).length,
    staleBytes,
    staleCount: stale.length,
    biggestFiles: [...marked].sort((a, b) => b.size - a.size).slice(0, 30),
    staleCandidates: stale.slice(0, 100),
    dbCounts,
  };
}

export async function cleanupStorage(options: { dryRun?: boolean; minAgeHours?: number } = {}) {
  const dryRun = options.dryRun !== false;
  const report = await auditStorage(options.minAgeHours ?? 1);
  const deleted: string[] = [];
  if (!dryRun) {
    for (const file of report.staleCandidates) {
      await unlink(path.join(UPLOADS_DIR, file.rel)).catch(() => undefined);
      deleted.push(file.rel);
    }
    const supabase = getSupabaseAdmin();
    try {
      await supabase?.from('storage_cleanup_events').insert({ actor: 'admin-api', dry_run: false, summary: { deleted, staleBytes: report.staleBytes } });
    } catch {
      // Cleanup has already happened; event logging is best-effort.
    }
  }
  return { dryRun, deleted, report };
}

