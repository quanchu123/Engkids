#!/usr/bin/env node
// Extract Vietnamese glosses from the VIETNAMESE Wiktionary dump (viwiktionary,
// CC BY-SA) for our candidate words. This is the SECOND authoritative source:
// English headwords DEFINED in Vietnamese, far richer EN->VI coverage than the
// English Wiktionary `translations[]` field. We NEVER invent a translation.
//
//   node scripts/wb-extract-viwikt.mjs <gz> <candidates.jsonl> <out.jsonl>
//
// Output row: {en_lower, en, pos, cefr, level, vi, vi_alts, example, sense, src}

import fs from 'node:fs';
import readline from 'node:readline';
import zlib from 'node:zlib';

const [, , gzPath, candPath, outPath] = process.argv;
if (!gzPath || !candPath || !outPath) {
  console.error('usage: wb-extract-viwikt.mjs <gz> <candidates.jsonl> <out.jsonl>');
  process.exit(1);
}

function normPos(pos) {
  const p = String(pos || '').toLowerCase();
  return ({ adj: 'adjective', adv: 'adverb', noun: 'noun', name: 'noun', verb: 'verb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', num: 'number', intj: 'interjection', det: 'determiner' })[p] || p;
}

// Load candidates; keep set of acceptable POS per word.
const wanted = new Map();
for (const ln of fs.readFileSync(candPath, 'utf8').split('\n')) {
  if (!ln.trim()) continue;
  const c = JSON.parse(ln);
  if (!wanted.has(c.en_lower)) wanted.set(c.en_lower, { en: c.en, posSet: new Set(), cefr: c.cefr, level: c.level });
  wanted.get(c.en_lower).posSet.add(normPos(c.pos));
}

// Clean a Vietnamese gloss from viwiktionary. These glosses are full
// dictionary-style definitions; we trim a single clean sense out of them:
//  - drop leading domain/register tags in parens: "(thông tục) ..."
//  - cut at the first ; or . that ends the first sense
//  - strip surrounding script noise, collapse spaces
//  - keep it short enough to be a kid-facing gloss
function cleanGloss(raw) {
  let v = String(raw || '').trim();
  if (!v) return '';
  // Drop CJK / Han leaks.
  if (/[　-鿿]/.test(v)) {
    // keep only if it still has Latin/Vietnamese letters after removing CJK
    v = v.replace(/[　-鿿]/g, '').trim();
    if (!v) return '';
  }
  // Remove a leading parenthetical register/domain note: "(bóng) ..." "(thông tục) ..."
  v = v.replace(/^\s*\([^)]*\)\s*/, '');
  // Remove inline parentheticals that are just notes.
  v = v.replace(/\([^)]*\)/g, '');
  // First sense only: cut at first sentence/clause terminator.
  const cut = v.search(/[;.]/);
  if (cut > 0) v = v.slice(0, cut);
  v = v.replace(/\s+/g, ' ').replace(/[,\s]+$/, '').trim();
  if (!v || v.length > 60) return '';
  // Must contain a letter (allow Vietnamese diacritics).
  if (!/[a-zà-ỹ]/i.test(v)) return '';
  return v;
}

// Pull an example sentence if the sense carries one (rare in viwiktionary).
function pickExample(entry) {
  if (!Array.isArray(entry.senses)) return '';
  for (const s of entry.senses) {
    if (!Array.isArray(s.examples)) continue;
    for (const ex of s.examples) {
      const t = String(ex.text || ex.english || '').trim();
      if (t && t.length <= 90 && /[a-z]/i.test(t) && /[a-z].*\s.*[a-z]/i.test(t)) return t;
    }
  }
  return '';
}

const result = new Map();
let scanned = 0;
let english = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(gzPath).pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

rl.on('line', (ln) => {
  scanned++;
  if (!ln.includes('"en"')) return;
  let o;
  try { o = JSON.parse(ln); } catch { return; }
  if (o.lang_code !== 'en' || !o.word || !Array.isArray(o.senses)) return;
  english++;
  const key = String(o.word).toLowerCase();
  const want = wanted.get(key);
  if (!want) return;
  const ep = normPos(o.pos);

  // Collect clean glosses across senses, in order.
  const glosses = [];
  const seen = new Set();
  for (const s of o.senses) {
    for (const g of (s.glosses || [])) {
      const cg = cleanGloss(g);
      if (cg && !seen.has(cg.toLowerCase())) { seen.add(cg.toLowerCase()); glosses.push(cg); }
    }
  }
  if (!glosses.length) return;

  const row = {
    en_lower: key, en: want.en, pos: ep, cefr: want.cefr, level: want.level,
    vi: glosses[0], vi_alts: glosses.slice(1, 4),
    example: pickExample(o),
    sense: (o.senses[0]?.glosses?.[0]) || '',
    src: 'viwiktionary',
    posMatch: want.posSet.size ? want.posSet.has(ep) : true,
  };
  // Prefer: (1) a POS-matching entry, (2) one that carries an example.
  const prev = result.get(key);
  if (!prev) { result.set(key, row); return; }
  const better = (!prev.posMatch && row.posMatch) || (prev.posMatch === row.posMatch && !prev.example && row.example);
  if (better) result.set(key, row);
});

rl.on('close', () => {
  const out = fs.createWriteStream(outPath);
  const byLevel = {};
  for (const row of result.values()) {
    out.write(JSON.stringify(row) + '\n');
    byLevel[row.level] = (byLevel[row.level] || 0) + 1;
  }
  out.end();
  process.stderr.write(`DONE scanned=${scanned} english=${english} extracted=${result.size} byLevel=${JSON.stringify(byLevel)}\n`);
});
