#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const roots = [
  path.resolve('public', 'games', 'pet'),
  path.resolve('public', 'games', 'english-farm', 'assets'),
];
const minBytes = Number(process.env.GAME_OPTIMIZE_MIN_BYTES || 80 * 1024);
const force = process.argv.includes('--force');
const qualityArg = process.argv.find((arg) => arg.startsWith('--quality='));
const quality = qualityArg ? Number(qualityArg.split('=')[1]) : 78;

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
  const out = [];
  async function visit(current) {
    let info;
    try {
      info = await stat(current);
    } catch {
      return;
    }
    if (info.isFile()) {
      if (/\.png$/i.test(current) && info.size >= minBytes) out.push({ path: current, size: info.size });
      return;
    }
    if (!info.isDirectory()) return;
    const children = await readdir(current).catch(() => []);
    await Promise.all(children.map((child) => visit(path.join(current, child))));
  }
  await visit(root);
  return out;
}

async function convert(file) {
  const out = file.path.replace(/\.png$/i, '.webp');
  const existing = await stat(out).catch(() => null);
  if (existing && !force && existing.mtimeMs >= (await stat(file.path)).mtimeMs) {
    return { skipped: true, file: file.path, input: file.size, output: existing.size };
  }

  await execFileAsync('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-i', file.path,
    '-vf', 'scale=1024:1024:force_original_aspect_ratio=decrease',
    '-quality', String(quality),
    '-compression_level', '6',
    out,
  ], { timeout: 60_000 });

  const output = await stat(out);
  return { skipped: false, file: file.path, out, input: file.size, output: output.size };
}

let converted = 0;
let skipped = 0;
let inputBytes = 0;
let outputBytes = 0;

for (const root of roots) {
  const files = await walk(root);
  for (const file of files) {
    const result = await convert(file);
    inputBytes += result.input;
    outputBytes += result.output;
    if (result.skipped) skipped += 1;
    else converted += 1;
    const rel = path.relative(process.cwd(), result.file).replace(/\\/g, '/');
    console.log(`${result.skipped ? 'skip' : 'webp'} ${formatBytes(result.input).padStart(8)} -> ${formatBytes(result.output).padStart(8)}  ${rel}`);
  }
}

console.log(`[game-assets] converted=${converted} skipped=${skipped} png-total=${formatBytes(inputBytes)} webp-total=${formatBytes(outputBytes)} saved-if-used=${formatBytes(Math.max(0, inputBytes - outputBytes))}`);
