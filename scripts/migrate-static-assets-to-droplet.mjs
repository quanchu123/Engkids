#!/usr/bin/env node
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const execFileAsync = promisify(execFile);
const root = process.cwd();
const publicRoot = path.join(root, 'public');
const uploadsDir = process.env.UPLOADS_DIR || path.join(publicRoot, 'uploads');
const staticRoot = path.join(uploadsDir, 'static-assets');
const manifestPath = path.join(root, 'data', 'static-assets', 'manifest.json');
const minBytes = Number(process.env.STATIC_ASSET_MIN_BYTES || 128 * 1024);
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const skipWebp = process.argv.includes('--skip-webp');
const roots = [
  path.join(publicRoot, 'games', 'pet'),
  path.join(publicRoot, 'games', 'english-farm', 'assets'),
];

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function walk(dir) {
  const out = [];
  async function visit(current) {
    let info;
    try { info = await stat(current); } catch { return; }
    if (info.isFile()) {
      if (/\.(png|webp)$/i.test(current) && info.size >= minBytes) out.push({ path: current, size: info.size });
      return;
    }
    if (!info.isDirectory()) return;
    const children = await readdir(current).catch(() => []);
    await Promise.all(children.map((child) => visit(path.join(current, child))));
  }
  await visit(dir);
  return out;
}

async function sha256(filePath) {
  return crypto.createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function maybeWebp(file) {
  if (skipWebp || !/\.png$/i.test(file.path)) return null;
  const out = file.path.replace(/\.png$/i, '.webp');
  const pngInfo = await stat(file.path);
  const webpInfo = await stat(out).catch(() => null);
  if (webpInfo && !force && webpInfo.mtimeMs >= pngInfo.mtimeMs) return out;
  if (dryRun) return out;
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-i', file.path,
      '-vf', 'scale=1280:1280:force_original_aspect_ratio=decrease',
      '-quality', '82',
      '-compression_level', '6',
      out,
    ], { timeout: 60_000 });
    return out;
  } catch (error) {
    console.warn(`[assets] webp skipped for ${path.relative(root, file.path)}: ${error.message || error}`);
    return null;
  }
}

async function copyAsset(sourcePath) {
  const rel = path.relative(publicRoot, sourcePath).replace(/\\/g, '/');
  const dest = path.join(staticRoot, rel);
  const sourceInfo = await stat(sourcePath);
  if (!dryRun) {
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(sourcePath, dest);
  }
  const storedInfo = dryRun ? sourceInfo : await stat(dest);
  const hash = dryRun ? 'dry-run' : await sha256(dest);
  return {
    id: rel,
    source_path: `/${rel}`,
    stored_path: rel,
    public_url: `/api/assets/file/${rel.split('/').map(encodeURIComponent).join('/')}`,
    original_bytes: sourceInfo.size,
    optimized_bytes: /\.webp$/i.test(sourcePath) ? storedInfo.size : null,
    sha256: hash,
    derivative_format: /\.webp$/i.test(sourcePath) ? 'webp' : null,
    active: true,
    migrated_at: new Date().toISOString(),
  };
}

const discovered = (await Promise.all(roots.map(walk))).flat();
const sourcePaths = new Set(discovered.map((file) => file.path));

for (const file of discovered) {
  const webp = await maybeWebp(file);
  if (webp) {
    const webpInfo = await stat(webp).catch(() => null);
    if (webpInfo && webpInfo.size >= 1) sourcePaths.add(webp);
  }
}

const rows = [];
for (const sourcePath of [...sourcePaths].sort()) {
  const row = await copyAsset(sourcePath);
  rows.push(row);
  console.log(`${dryRun ? 'would copy' : 'copied'} ${formatBytes(row.original_bytes).padStart(8)}  ${row.source_path} -> ${row.public_url}`);
}

if (!dryRun) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), uploadsDir, staticRoot, rows }, null, 2));

  const supabase = getSupabaseAdmin();
  if (supabase && rows.length) {
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('static_asset_manifest').upsert(rows.slice(i, i + 200), { onConflict: 'id' });
      if (error) throw new Error(`static_asset_manifest upsert failed: ${error.message}`);
    }
  }
}

const total = rows.reduce((sum, row) => sum + row.original_bytes, 0);
console.log(`[assets] ${dryRun ? 'dry-run ' : ''}migrated=${rows.length} total=${formatBytes(total)} staticRoot=${staticRoot}`);
