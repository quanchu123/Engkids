#!/usr/bin/env node
// Build a clean CEFR candidate pool from the AUTHORITATIVE sources:
//   - CEFR-J 1.5 (A1/A2/B1/B2)   data/open-curriculum/raw/wordbank-rebuild/cefrj-1.5.csv
//   - Octanove C1/C2             data/open-curriculum/raw/wordbank-rebuild/octanove-c1c2.csv
// Output: one JSONL row per kept candidate {en, en_lower, pos, cefr, level}
// NO translations / examples here — those come from real dictionary + Tatoeba
// in later steps. This step only decides WHICH English words + their CEFR level.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const RAW = path.join(root, 'data', 'open-curriculum', 'raw', 'wordbank-rebuild');
const OUT = path.join(RAW, 'candidates.jsonl');

// CEFR -> app stage. A1+A2 collapse into a2-key (app's lowest stage).
const STAGE = {
  A1: 'a2-key',
  A2: 'a2-key',
  B1: 'b1-preliminary',
  B2: 'b2-first',
  C1: 'c1-advanced',
  C2: 'c1-advanced',
};

// Normalise CEFR-J POS labels to the simple set the app shows.
function normPos(pos) {
  const p = String(pos || '').trim().toLowerCase();
  if (p.startsWith('noun')) return 'noun';
  if (p.startsWith('verb') || p.endsWith('-verb') || p === 'infinitive-to') return 'verb';
  if (p.startsWith('adjective')) return 'adjective';
  if (p.startsWith('adverb')) return 'adverb';
  if (p.startsWith('prep')) return 'preposition';
  if (p.startsWith('pron')) return 'pronoun';
  if (p.startsWith('conj')) return 'conjunction';
  if (p.startsWith('determiner')) return 'determiner';
  if (p.startsWith('interj')) return 'interjection';
  if (p.startsWith('number')) return 'number';
  if (p.includes('modal')) return 'verb';
  return p || 'noun';
}

// A headword is usable for a child learner when it's a single clean lowercase
// word of 3+ letters. Drops slashed variants (a.m./AM), multiword, abbreviations.
function cleanHeadword(raw) {
  const h = String(raw || '').trim();
  if (h.includes('/') || h.includes('.')) return null; // a.m./A.M., e.g.
  const lower = h.toLowerCase();
  if (!/^[a-z][a-z'-]{2,}$/.test(lower)) return null; // single word, 3+ chars
  return lower;
}

function parseCsvLine(line) {
  // Simple CSV: fields don't contain commas in these files except we only need
  // the first 3 columns (headword,pos,CEFR). Split on comma is safe here.
  return line.split(',');
}

function readCsv(file, hasNotes) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  lines.shift(); // header
  const rows = [];
  for (const line of lines) {
    const cols = parseCsvLine(line);
    const headword = cols[0];
    const pos = cols[1];
    const cefr = (cols[2] || '').trim();
    rows.push({ headword, pos, cefr });
  }
  return rows;
}

const cefrj = readCsv(path.join(RAW, 'cefrj-1.5.csv'));
const octanove = readCsv(path.join(RAW, 'octanove-c1c2.csv'));

// Keep the EASIEST CEFR level per lemma (a lemma can appear at multiple levels
// with different POS). Lower stage wins so words surface as early as sensible.
const STAGE_RANK = { 'a2-key': 0, 'b1-preliminary': 1, 'b2-first': 2, 'c1-advanced': 3 };
const best = new Map(); // en_lower -> {en, pos, cefr, level}

for (const r of [...cefrj, ...octanove]) {
  const en = cleanHeadword(r.headword);
  if (!en) continue;
  const stage = STAGE[r.cefr];
  if (!stage) continue;
  const pos = normPos(r.pos);
  const existing = best.get(en);
  if (!existing || STAGE_RANK[stage] < STAGE_RANK[existing.level]) {
    best.set(en, { en, en_lower: en, pos, cefr: r.cefr, level: stage });
  }
}

const out = [...best.values()];
const byStage = {};
for (const w of out) byStage[w.level] = (byStage[w.level] || 0) + 1;

fs.writeFileSync(OUT, out.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log('candidates written:', out.length, OUT);
console.log('by stage:', JSON.stringify(byStage, null, 2));
