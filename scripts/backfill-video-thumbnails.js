const { execFile } = require('child_process');
const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { promisify } = require('util');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const execFileAsync = promisify(execFile);
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_PREFIX = '/uploads';
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.ogg']);

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('[thumb] skipping thumbnail backfill: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch },
  });
}

function safeObjectName(objectKey) {
  if (!objectKey || /^https?:\/\//i.test(objectKey)) return null;
  const clean = String(objectKey).replace(`${PUBLIC_PREFIX}/`, '').replace(/^\/+/, '');
  const base = path.basename(clean);
  if (!base || base !== clean || base.includes('..')) return null;
  return base;
}

function publicFileUrl(name) {
  return `/api/videos/file/${encodeURIComponent(name)}`;
}

function shouldBackfill(row, force) {
  if (!row.object_key) return false;
  if (force) return true;
  const current = row.thumbnail_url || '';
  return !current || current.startsWith('data:image/') || !Number.isFinite(row.duration) || row.duration <= 0;
}

async function generateThumbnail(objectKey) {
  const name = safeObjectName(objectKey);
  if (!name) return null;

  const ext = path.extname(name).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(ext)) return null;

  const inputPath = path.join(UPLOADS_DIR, name);
  const outputName = `${path.parse(name).name}.jpg`;
  const outputPath = path.join(UPLOADS_DIR, outputName);

  try {
    await fs.access(inputPath);
  } catch {
    console.warn(`[thumb] missing video file: ${inputPath}`);
    return null;
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss',
      '00:00:01',
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-2',
      '-q:v',
      '3',
      outputPath,
    ], { timeout: 30_000 });

    return publicFileUrl(outputName);
  } catch (error) {
    const fallbackName = `${path.parse(name).name}-${randomUUID()}.jpg`;
    const fallbackPath = path.join(UPLOADS_DIR, fallbackName);
    await fs.unlink(outputPath).catch(() => {});

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        inputPath,
        '-frames:v',
        '1',
        '-vf',
        'scale=640:-2',
        '-q:v',
        '3',
        fallbackPath,
      ], { timeout: 30_000 });
      return publicFileUrl(fallbackName);
    } catch {
      await fs.unlink(fallbackPath).catch(() => {});
      console.warn(`[thumb] ffmpeg failed for ${name}: ${error.message}`);
      return null;
    }
  }
}

async function probeDuration(objectKey) {
  const name = safeObjectName(objectKey);
  if (!name) return 0;

  const ext = path.extname(name).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(ext)) return 0;

  const inputPath = path.join(UPLOADS_DIR, name);
  try {
    await fs.access(inputPath);
  } catch {
    return 0;
  }

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ], { timeout: 15_000 });
    const duration = Number.parseFloat(String(stdout).trim());
    return Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0;
  } catch (error) {
    console.warn(`[thumb] ffprobe failed for ${name}: ${error.message}`);
    return 0;
  }
}

async function main() {
  const force = process.argv.includes('--force') || process.env.THUMBNAIL_FORCE === '1';
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data, error } = await supabase
    .from('videos')
    .select('id,title,object_key,thumbnail_url,deleted_at')
    .is('deleted_at', null)
    .not('object_key', 'is', null);

  if (error) throw new Error(`Failed to load videos: ${error.message}`);

  const rows = (data || []).filter((row) => shouldBackfill(row, force));
  console.log(`[thumb] ${rows.length} video(s) need thumbnail backfill`);

  let updated = 0;
  for (const row of rows) {
    const currentThumbnail = row.thumbnail_url || '';
    const needsThumbnail = force || !currentThumbnail || currentThumbnail.startsWith('data:image/');
    const needsDuration = force || !Number.isFinite(row.duration) || row.duration <= 0;
    const thumbnailUrl = needsThumbnail ? await generateThumbnail(row.object_key) : null;
    const duration = needsDuration ? await probeDuration(row.object_key) : 0;

    const updates = {};
    if (thumbnailUrl) updates.thumbnail_url = thumbnailUrl;
    if (duration > 0) updates.duration = duration;
    if (Object.keys(updates).length === 0) continue;

    const { error: updateError } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', row.id);

    if (updateError) {
      console.warn(`[thumb] failed to update ${row.id}: ${updateError.message}`);
      continue;
    }

    updated += 1;
    console.log(`[thumb] updated ${row.title || row.id}: ${JSON.stringify(updates)}`);
  }

  console.log(`[thumb] done, updated ${updated}/${rows.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
