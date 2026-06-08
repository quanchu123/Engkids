#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const cwd = process.cwd();
const uploadsDir = process.env.UPLOADS_DIR || path.join(cwd, 'public', 'uploads');
const roots = [
  cwd,
  uploadsDir,
  path.join(cwd, '.next'),
  path.join(cwd, 'public'),
  path.join(cwd, 'public', 'games'),
  path.join(cwd, 'public', 'games', 'pet'),
  path.join(cwd, 'public', 'games', 'english-farm'),
  path.join(cwd, 'node_modules'),
  path.join(cwd, 'recovery'),
  path.join(cwd, 'output'),
  '/root/.pm2/logs',
  '/var/log',
].filter((value, index, list) => list.indexOf(value) === index);

const skipDirs = new Set(['.git', 'node_modules', '.next']);
const maxFiles = Number(process.env.AUDIT_MAX_FILES || 25);

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(target, options = {}) {
  const entries = [];
  let total = 0;
  let fileCount = 0;

  async function visit(current, depth) {
    let info;
    try {
      info = await stat(current);
    } catch {
      return;
    }

    if (info.isFile()) {
      total += info.size;
      fileCount += 1;
      entries.push({ path: current, size: info.size, mtime: info.mtime });
      return;
    }

    if (!info.isDirectory()) return;
    if (depth > 0 && skipDirs.has(path.basename(current)) && !options.includeHeavy) return;

    let children;
    try {
      children = await readdir(current);
    } catch {
      return;
    }

    await Promise.all(children.map((child) => visit(path.join(current, child), depth + 1)));
  }

  await visit(target, 0);
  entries.sort((a, b) => b.size - a.size);
  return { total, fileCount, entries };
}

async function topChildren(target) {
  let children;
  try {
    children = await readdir(target);
  } catch {
    return [];
  }

  const rows = [];
  for (const child of children) {
    const full = path.join(target, child);
    const summary = await walk(full, { includeHeavy: true });
    rows.push({ path: full, size: summary.total, files: summary.fileCount });
  }
  return rows.sort((a, b) => b.size - a.size).slice(0, 20);
}

async function run(command, args) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 15_000 });
    return (stdout || stderr).trim();
  } catch (error) {
    return error.message;
  }
}

function printRows(rows, mapper) {
  for (const row of rows) console.log(mapper(row));
}

console.log('== Engkids server storage/perf audit ==');
console.log(`cwd: ${cwd}`);
console.log(`UPLOADS_DIR: ${uploadsDir}`);

if (process.platform !== 'win32') {
  console.log('\n== disk ==');
  console.log(await run('df', ['-h']));
  console.log('\n== inode ==');
  console.log(await run('df', ['-ih']));
  console.log('\n== memory ==');
  console.log(await run('free', ['-h']));
  console.log('\n== uptime/load ==');
  console.log(await run('uptime', []));
  console.log('\n== pm2 ==');
  console.log(await run('pm2', ['status']));
}

console.log('\n== watched roots ==');
for (const root of roots) {
  if (!(await exists(root))) continue;
  const summary = await walk(root, { includeHeavy: true });
  console.log(`${formatBytes(summary.total).padStart(8)}  ${String(summary.fileCount).padStart(6)} files  ${root}`);
}

console.log('\n== biggest project children ==');
printRows(await topChildren(cwd), (row) => `${formatBytes(row.size).padStart(8)}  ${String(row.files).padStart(6)} files  ${row.path}`);

if (await exists(uploadsDir)) {
  const uploads = await walk(uploadsDir, { includeHeavy: true });
  console.log('\n== biggest uploads ==');
  printRows(uploads.entries.slice(0, maxFiles), (row) => `${formatBytes(row.size).padStart(8)}  ${row.path}`);
}

console.log('\n== biggest files under project, skipping node_modules/.next/.git ==');
const project = await walk(cwd);
printRows(project.entries.slice(0, maxFiles), (row) => `${formatBytes(row.size).padStart(8)}  ${row.path}`);

if (process.platform !== 'win32') {
  console.log('\n== journal size ==');
  console.log(await run('journalctl', ['--disk-usage']));
}
