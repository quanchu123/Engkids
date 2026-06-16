#!/usr/bin/env node
// Stream the English Wiktionary wiktextract dump (CC BY-SA) and pull Vietnamese
// translations + a usage example for every candidate word. We NEVER invent a
// translation: a word with no Vietnamese gloss in Wiktionary is dropped, not
// machine-translated. Output: vi-map.jsonl, one row per word that has a real VI.
//
//   node scripts/wb-extract-vi.mjs <gz-path> <candidates.jsonl> <out.jsonl>
//
// Each candidate row: {en, en_lower, pos, cefr, level}.
// Each output row: {en_lower, en, pos, vi, vi_alts, example, sense}.

import fs from 'node:fs';
import readline from 'node:readline';
import zlib from 'node:zlib';

const [, , gzPath, candPath, outPath] = process.argv;
if (!gzPath || !candPath || !outPath) {
  console.error('usage: wb-extract-vi.mjs <gz> <candidates.jsonl> <out.jsonl>');
  process.exit(1);
}

// Map wiktextract pos -> our coarse part_of_speech. Anything else -> as-is.
function normPos(pos) {
  const p = String(pos || '').toLowerCase();
  if (p === 'adj') return 'adjective';
  if (p === 'adv') return 'adverb';
  if (p === 'noun' || p === 'name') return 'noun';
  if (p === 'verb') return 'verb';
  if (p === 'prep') return 'preposition';
  if (p === 'conj') return 'conjunction';
  if (p === 'pron') return 'pronoun';
  if (p === 'num') return 'number';
  if (p === 'intj') return 'interjection';
  if (p === 'det') return 'determiner';
  return p;
}

// Load candidate words, keyed by en_lower. We may have the same word at two POS;
// keep a set of acceptable POS per word so we can prefer a sense-matching entry.
const wanted = new Map(); // en_lower -> {en, posSet:Set, cefr, level}
for (const ln of fs.readFileSync(candPath, 'utf8').split('\n')) {
  if (!ln.trim()) continue;
  const c = JSON.parse(ln);
  const key = c.en_lower;
  if (!wanted.has(key)) wanted.set(key, { en: c.en, posSet: new Set(), cefr: c.cefr, level: c.level });
  wanted.get(key).posSet.add(normPos(c.pos));
}

// Clean a Vietnamese gloss: strip parenthetical notes, scripts (e.g. 漢字 alt),
// collapse spaces. Reject if it contains no Vietnamese/Latin letters or looks
// like a script-only entry.
function cleanVi(word) {
  let v = String(word || '').trim();
  // Drop CJK / Han characters that sometimes leak in via `alt`.
  if (/[　-鿿]/.test(v)) return '';
  v = v.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (!v) return '';
  if (v.length > 40) return '';
  return v;
}

// A usage example from the first sense that has one. Prefer "example" type over
// long "quotation" refs; cap length so it stays kid-friendly.
function pickExample(entry) {
  if (!Array.isArray(entry.senses)) return '';
  for (const s of entry.senses) {
    if (!Array.isArray(s.examples)) continue;
    for (const ex of s.examples) {
      const t = String(ex.text || '').trim();
      if (ex.type === 'example' && t && t.length <= 90 && /[a-z]/i.test(t)) return t;
    }
  }
  // fall back to any short example text
  for (const s of entry.senses) {
    if (!Array.isArray(s.examples)) continue;
    for (const ex of s.examples) {
      const t = String(ex.text || '').trim();
      if (t && t.length <= 90 && /[a-z]/i.test(t)) return t;
    }
  }
  return '';
}

const result = new Map(); // en_lower -> best row
let scanned = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(gzPath).pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

rl.on('line', (ln) => {
  scanned++;
  if (scanned % 500000 === 0) process.stderr.write(`scanned ${scanned}, matched ${result.size}\n`);
  // Cheap pre-filters before JSON.parse (the dump is huge).
  if (!ln.includes('"lang_code": "en"') && !ln.includes('"lang_code":"en"')) return;
  if (!ln.includes('"translations"')) return;
  if (!ln.includes('"vi"')) return;
  let o;
  try { o = JSON.parse(ln); } catch { return; }
  if (o.lang_code !== 'en' || !o.word || !Array.isArray(o.translations)) return;
  const key = String(o.word).toLowerCase();
  const want = wanted.get(key);
  if (!want) return;
  const entryPos = normPos(o.pos);
  // Only take the entry if its POS is one we asked for (keeps "book" noun, not
  // every homograph). If no POS matches, skip — another entry may match.
  if (want.posSet.size && !want.posSet.has(entryPos)) return;

  const viTrans = o.translations.filter((t) => (t.lang_code === 'vi' || t.code === 'vi'));
  const cleaned = [];
  const seen = new Set();
  for (const t of viTrans) {
    const v = cleanVi(t.word);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    cleaned.push(v);
  }
  if (cleaned.length === 0) return;

  const row = {
    en_lower: key,
    en: want.en,
    pos: entryPos,
    cefr: want.cefr,
    level: want.level,
    vi: cleaned[0],
    vi_alts: cleaned.slice(1, 4),
    example: pickExample(o),
    sense: (Array.isArray(o.senses) && o.senses[0]?.glosses?.[0]) || '',
  };
  // Prefer an entry that also yields an example over one that doesn't.
  const prev = result.get(key);
  if (!prev || (!prev.example && row.example)) result.set(key, row);
});

rl.on('close', () => {
  const out = fs.createWriteStream(outPath);
  for (const row of result.values()) out.write(JSON.stringify(row) + '\n');
  out.end();
  process.stderr.write(`DONE scanned=${scanned} extracted=${result.size}\n`);
});
