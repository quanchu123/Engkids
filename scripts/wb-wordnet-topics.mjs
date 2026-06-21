#!/usr/bin/env node
// Build an AUTHORITATIVE word -> topic map from WordNet 3.1 (Princeton).
// Every WordNet synset carries a "lexicographer file" code (2-digit field in
// data.{noun,verb,adj,adv}) assigned BY LINGUISTS — e.g. noun.food, noun.animal,
// noun.body, verb.communication. We do NOT assign words to topics ourselves:
// Princeton already did. We only RENAME the 45 fixed lexfile domains into
// kid-friendly textbook topics (Food & Drinks, Animals, Body & Health, ...).
//
// For each lemma we take its FIRST (most-frequent) sense offset from the index
// file, read that synset's lexfile code from the data file, and map it.
//
//   node scripts/wb-wordnet-topics.mjs
//
// Output: data/open-curriculum/raw/wordbank-rebuild/wordnet-topics.json
//         { "<en_lower>": { "<pos>": "<topic>" }, ... }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const DICT = path.join(root, 'data', 'open-curriculum', 'raw', 'wordnet', 'extracted', 'dict');
const OUT = path.join(root, 'data', 'open-curriculum', 'raw', 'wordbank-rebuild', 'wordnet-topics.json');

// The 45 standard WordNet lexicographer files (fixed numbering, never changes).
const LEXNAMES = [
  'adj.all', 'adj.pert', 'adv.all', 'noun.Tops', 'noun.act', 'noun.animal',
  'noun.artifact', 'noun.attribute', 'noun.body', 'noun.cognition',
  'noun.communication', 'noun.event', 'noun.feeling', 'noun.food', 'noun.group',
  'noun.location', 'noun.motive', 'noun.object', 'noun.person',
  'noun.phenomenon', 'noun.plant', 'noun.possession', 'noun.process',
  'noun.quantity', 'noun.relation', 'noun.shape', 'noun.state',
  'noun.substance', 'noun.time', 'verb.body', 'verb.change', 'verb.cognition',
  'verb.communication', 'verb.competition', 'verb.consumption', 'verb.contact',
  'verb.creation', 'verb.emotion', 'verb.motion', 'verb.perception',
  'verb.possession', 'verb.social', 'verb.stative', 'verb.weather', 'adj.ppl',
];

// Rename each WordNet domain into a kid textbook topic. This is a
// category->category map (45 fixed domains), NOT a per-word assignment.
const DOMAIN_TO_TOPIC = {
  'noun.food': 'food and drinks',
  'verb.consumption': 'food and drinks',
  'noun.animal': 'animals',
  'noun.plant': 'plants and trees',
  'noun.body': 'body and health',
  'verb.body': 'body and health',
  'noun.person': 'people and family',
  'noun.group': 'society and groups',
  'noun.communication': 'language and communication',
  'verb.communication': 'language and communication',
  'noun.location': 'places',
  'noun.time': 'time and calendar',
  'noun.feeling': 'feelings and emotions',
  'verb.emotion': 'feelings and emotions',
  'noun.artifact': 'things and objects',
  'noun.object': 'nature and the world',
  'noun.cognition': 'thinking and ideas',
  'verb.cognition': 'thinking and ideas',
  'noun.motion': 'movement and travel',
  'verb.motion': 'movement and travel',
  'noun.possession': 'money and shopping',
  'verb.possession': 'money and shopping',
  'noun.phenomenon': 'weather and nature',
  'verb.weather': 'weather and nature',
  'noun.creation': 'art and making',
  'verb.creation': 'art and making',
  'noun.competition': 'sports and games',
  'verb.competition': 'sports and games',
  'noun.act': 'activities and events',
  'noun.event': 'activities and events',
  'noun.process': 'activities and events',
  'verb.contact': 'actions',
  'verb.change': 'actions',
  'verb.social': 'social actions',
  'verb.stative': 'states and being',
  'noun.state': 'states and being',
  'verb.perception': 'senses and perception',
  'noun.attribute': 'qualities and descriptions',
  'noun.quantity': 'numbers and measure',
  'noun.relation': 'qualities and descriptions',
  'noun.shape': 'shapes',
  'noun.substance': 'materials',
  'adj.all': 'descriptions',
  'adj.pert': 'descriptions',
  'adj.ppl': 'descriptions',
  'adv.all': 'manner words',
  'noun.Tops': 'general',
  'noun.motive': 'general',
};

const POS_FILE = { noun: 'noun', verb: 'verb', adjective: 'adj', adverb: 'adv' };

// Read a data.<pos> file into a Map: offset(string) -> lexfile number (int).
function loadDataLexfiles(posFile) {
  const file = path.join(DICT, `data.${posFile}`);
  const map = new Map();
  const text = fs.readFileSync(file, 'utf8');
  for (const ln of text.split('\n')) {
    // Data lines start with an 8-digit offset; license header lines start with
    // two spaces. The second whitespace-delimited field is the lexfile number.
    if (!/^\d{8}\s/.test(ln)) continue;
    const sp = ln.indexOf(' ');
    const offset = ln.slice(0, sp);
    const rest = ln.slice(sp + 1);
    const lex = parseInt(rest.slice(0, rest.indexOf(' ')), 10);
    map.set(offset, lex);
  }
  return map;
}

// Read index.<pos>: lemma -> first (most-frequent) synset offset.
function loadIndexFirstOffset(posFile) {
  const file = path.join(DICT, `index.${posFile}`);
  const map = new Map();
  const text = fs.readFileSync(file, 'utf8');
  for (const ln of text.split('\n')) {
    if (!ln || ln.startsWith('  ')) continue; // skip header
    const parts = ln.trim().split(/\s+/);
    // lemma pos synset_cnt p_cnt [ptr_symbols x p_cnt] sense_cnt tagsense_cnt offsets...
    const lemma = parts[0];
    const pCnt = parseInt(parts[3], 10);
    if (Number.isNaN(pCnt)) continue;
    const offsetsStart = 4 + pCnt + 2; // skip ptr symbols, sense_cnt, tagsense_cnt
    const firstOffset = parts[offsetsStart];
    if (firstOffset && /^\d{8}$/.test(firstOffset)) map.set(lemma, firstOffset);
  }
  return map;
}

const result = {}; // en_lower -> { pos -> topic }
const domainCounts = {};

for (const [pos, posFile] of Object.entries(POS_FILE)) {
  const data = loadDataLexfiles(posFile);
  const index = loadIndexFirstOffset(posFile);
  for (const [lemma, offset] of index) {
    const lex = data.get(offset);
    if (lex == null) continue;
    const domain = LEXNAMES[lex];
    const topic = DOMAIN_TO_TOPIC[domain] || 'general';
    const key = lemma.toLowerCase();
    if (!result[key]) result[key] = {};
    result[key][pos] = topic;
    domainCounts[topic] = (domainCounts[topic] || 0) + 1;
  }
}

fs.writeFileSync(OUT, JSON.stringify(result));
process.stderr.write(`wrote ${Object.keys(result).length} lemmas -> ${OUT}\n`);
process.stderr.write(`topic distribution:\n${JSON.stringify(domainCounts, null, 2)}\n`);
