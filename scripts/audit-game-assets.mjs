#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const gamesDir = path.resolve('public', 'games');
const maxFiles = Number(process.env.GAME_AUDIT_MAX_FILES || 15);
const largeAssetBytes = Number(process.env.GAME_AUDIT_LARGE_BYTES || 1024 * 1024);

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

async function walk(root) {
  const files = [];
  async function visit(current) {
    let info;
    try {
      info = await stat(current);
    } catch {
      return;
    }
    if (info.isFile()) {
      files.push({ path: current, rel: path.relative(root, current).replace(/\\/g, '/'), size: info.size });
      return;
    }
    if (!info.isDirectory()) return;
    const children = await readdir(current).catch(() => []);
    await Promise.all(children.map((child) => visit(path.join(current, child))));
  }
  await visit(root);
  return files;
}

const games = await readdir(gamesDir, { withFileTypes: true }).catch(() => []);
const summaries = [];

for (const game of games.filter((entry) => entry.isDirectory())) {
  const root = path.join(gamesDir, game.name);
  const files = await walk(root);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const paths = new Set(files.map((file) => file.rel));
  const preferred = files.filter((file) => {
    if (!/\.png$/i.test(file.rel)) return true;
    return !paths.has(file.rel.replace(/\.png$/i, '.webp'));
  });
  const preferredTotal = preferred.reduce((sum, file) => sum + file.size, 0);
  const large = files.filter((file) => file.size >= largeAssetBytes).sort((a, b) => b.size - a.size);
  const runtimeLarge = preferred.filter((file) => file.size >= largeAssetBytes).sort((a, b) => b.size - a.size);
  const videos = files.filter((file) => /\.(mp4|webm|mov)$/i.test(file.rel));
  summaries.push({ game: game.name, total, preferredTotal, count: files.length, large, runtimeLarge, videos });
}

summaries.sort((a, b) => b.preferredTotal - a.preferredTotal);

console.log('== game asset totals ==');
for (const row of summaries) {
  const warnings = [];
  if (row.large.length) warnings.push(`${row.large.length} > ${formatBytes(largeAssetBytes)}`);
  if (row.videos.length) warnings.push(`${row.videos.length} video`);
  console.log(`${formatBytes(row.preferredTotal).padStart(8)} runtime  ${formatBytes(row.total).padStart(8)} disk  ${String(row.count).padStart(4)} files  ${row.game}${warnings.length ? `  [${warnings.join(', ')}]` : ''}`);
}

console.log('\n== largest runtime game files ==');
const allFiles = summaries.flatMap((summary) => summary.runtimeLarge.map((file) => ({ ...file, game: summary.game })));
allFiles.sort((a, b) => b.size - a.size);
if (allFiles.length === 0) {
  console.log('No runtime-preferred game asset is larger than threshold.');
} else {
  for (const file of allFiles.slice(0, maxFiles)) {
    console.log(`${formatBytes(file.size).padStart(8)}  ${file.game}/${file.rel}`);
  }
}

console.log('\n== recommendations ==');
for (const row of summaries.filter((summary) => summary.runtimeLarge.length || summary.videos.length).slice(0, 8)) {
  if (row.game === 'pet') {
    console.log('- pet: stage PNGs are heavy; convert generated art to WebP/AVIF or resize stage art to displayed max size.');
  } else if (row.game === 'english-farm') {
    console.log('- english-farm: large tile/crop PNGs load into Phaser memory; resize tile assets and keep only needed override art.');
  } else if (row.videos.length) {
    console.log(`- ${row.game}: MP4 assets count ${row.videos.length}; keep short/compressed or CDN-host them.`);
  } else {
    console.log(`- ${row.game}: compress ${row.large.length} large asset(s).`);
  }
}
