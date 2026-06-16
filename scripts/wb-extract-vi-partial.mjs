#!/usr/bin/env node
// Same as wb-extract-vi.mjs but tolerant of a TRUNCATED .gz (partial download):
// the gunzip stream errors at the cut point; we catch it and still flush every
// word matched before the truncation. We NEVER invent a translation.
//
//   node scripts/wb-extract-vi-partial.mjs <gz> <candidates.jsonl> <out.jsonl>

import fs from 'node:fs';
import readline from 'node:readline';
import zlib from 'node:zlib';

const [, , gzPath, candPath, outPath] = process.argv;

function normPos(pos) {
  const p = String(pos || '').toLowerCase();
  return ({ adj: 'adjective', adv: 'adverb', noun: 'noun', name: 'noun', verb: 'verb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', num: 'number', intj: 'interjection', det: 'determiner' })[p] || p;
}

const wanted = new Map();
for (const ln of fs.readFileSync(candPath, 'utf8').split('\n')) {
  if (!ln.trim()) continue;
  const c = JSON.parse(ln);
  if (!wanted.has(c.en_lower)) wanted.set(c.en_lower, { en: c.en, posSet: new Set(), cefr: c.cefr, level: c.level });
  wanted.get(c.en_lower).posSet.add(normPos(c.pos));
}

function cleanVi(word) {
  let v = String(word || '').trim();
  if (/[　-鿿]/.test(v)) return '';
  v = v.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (!v || v.length > 40) return '';
  return v;
}

function pickExample(entry) {
  if (!Array.isArray(entry.senses)) return '';
  for (const s of entry.senses) {
    if (!Array.isArray(s.examples)) continue;
    for (const ex of s.examples) {
      const t = String(ex.text || '').trim();
      if (ex.type === 'example' && t && t.length <= 90 && /[a-z]/i.test(t)) return t;
    }
  }
  for (const s of entry.senses) {
    if (!Array.isArray(s.examples)) continue;
    for (const ex of s.examples) {
      const t = String(ex.text || '').trim();
      if (t && t.length <= 90 && /[a-z]/i.test(t)) return t;
    }
  }
  return '';
}

const result = new Map();
let scanned = 0;
let finalized = false;

function finalize(reason) {
  if (finalized) return;
  finalized = true;
  const byLevel = {};
  const lines = [];
  for (const row of result.values()) {
    lines.push(JSON.stringify(row));
    byLevel[row.level] = (byLevel[row.level] || 0) + 1;
  }
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  process.stderr.write(`DONE (${reason}) scanned=${scanned} extracted=${result.size} byLevel=${JSON.stringify(byLevel)}\n`);
  process.exit(0);
}

const gunzip = zlib.createGunzip();
gunzip.on('error', () => finalize('gunzip-truncated'));
const fileStream = fs.createReadStream(gzPath);
fileStream.on('error', () => finalize('file-error'));

// The truncated gzip throws Z_BUF_ERROR which can surface as an uncaught
// exception before the stream 'error' handler flushes. Catch it and finalize.
process.on('uncaughtException', () => finalize('uncaught'));

const rl = readline.createInterface({ input: fileStream.pipe(gunzip), crlfDelay: Infinity });
rl.on('error', () => finalize('rl-error'));

rl.on('line', (ln) => {
  scanned++;
  if (!ln.includes('"vi"')) return;
  if (!ln.includes('translations')) return;
  let o;
  try { o = JSON.parse(ln); } catch { return; }
  if (o.lang_code !== 'en' || !o.word || !Array.isArray(o.translations)) return;
  const key = String(o.word).toLowerCase();
  const want = wanted.get(key);
  if (!want) return;
  const ep = normPos(o.pos);
  if (want.posSet.size && !want.posSet.has(ep)) return;
  const seen = new Set();
  const cleaned = [];
  for (const t of o.translations) {
    if (t.lang_code !== 'vi' && t.code !== 'vi') continue;
    const v = cleanVi(t.word);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    cleaned.push(v);
  }
  if (!cleaned.length) return;
  const row = {
    en_lower: key, en: want.en, pos: ep, cefr: want.cefr, level: want.level,
    vi: cleaned[0], vi_alts: cleaned.slice(1, 4),
    example: pickExample(o),
    sense: (Array.isArray(o.senses) && o.senses[0]?.glosses?.[0]) || '',
  };
  const prev = result.get(key);
  if (!prev || (!prev.example && row.example)) result.set(key, row);
});

rl.on('close', () => finalize('eof'));
