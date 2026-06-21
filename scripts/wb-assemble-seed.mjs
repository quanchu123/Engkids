#!/usr/bin/env node
// Assemble the final clean word bank seed from AUTHORITATIVE sources only:
//   - vi-map.jsonl     : English word + CEFR level + real Vietnamese gloss
//                        (Wiktionary EN->VI translations, CC BY-SA) + maybe an
//                        example sentence from Wiktionary.
//   - tatoeba index    : real example sentences (CC BY) to fill words whose
//                        Wiktionary entry had no usage example.
// We NEVER invent a translation or an example. A word with no real VI is already
// absent from vi-map; a word with no example from EITHER source is dropped here.
//
//   node scripts/wb-assemble-seed.mjs
//
// Output: data/curriculum-word-bank.clean.json  (importer format)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const RAW = path.join(root, 'data', 'open-curriculum', 'raw', 'wordbank-rebuild');
const VI_MAP = fs.existsSync(path.join(RAW, 'vi-map-full.jsonl'))
  ? path.join(RAW, 'vi-map-full.jsonl')
  : path.join(RAW, 'vi-map.jsonl');
const CURATED = path.join(root, 'data', 'open-curriculum', 'curated', 'source_sentence_items.jsonl');
const OUT = path.join(root, 'data', 'curriculum-word-bank.clean.json');

// No per-stage cap: take EVERY word that has a real Vietnamese gloss AND a real
// usable example. Wiktionary only yields VI for ~4126 of 8272 candidates, so the
// source itself is the ceiling — we use all of it instead of throwing words away.
const STAGES = ['a2-key', 'b1-preliminary', 'b2-first', 'c1-advanced'];

// Theme keywords -> topic. Same buckets the lesson generator understands, so
// words group into coherent themed units instead of an A->Z slice.
const TOPIC_KEYWORDS = [
  ['school', ['school', 'student', 'teacher', 'class', 'lesson', 'learn', 'study', 'book', 'exam', 'write', 'read', 'pencil', 'homework', 'college', 'university', 'degree', 'subject', 'science', 'maths', 'history']],
  ['daily life', ['home', 'family', 'friend', 'food', 'room', 'house', 'day', 'morning', 'evening', 'shop', 'money', 'clothes', 'kitchen', 'meal', 'breakfast', 'dinner', 'sleep', 'wake', 'wear', 'cook', 'clean']],
  ['travel', ['travel', 'train', 'bus', 'car', 'road', 'city', 'hotel', 'ticket', 'journey', 'airport', 'map', 'trip', 'flight', 'station', 'drive', 'visit', 'tour', 'beach', 'holiday']],
  ['health', ['health', 'body', 'doctor', 'pain', 'sleep', 'sport', 'exercise', 'medicine', 'safe', 'hospital', 'nurse', 'ill', 'sick', 'heart', 'tooth', 'teeth', 'arm', 'leg', 'head', 'fit']],
  ['technology', ['computer', 'data', 'digital', 'machine', 'device', 'internet', 'software', 'system', 'technology', 'phone', 'screen', 'app', 'online', 'website', 'email', 'click', 'network']],
  ['nature', ['energy', 'plant', 'animal', 'water', 'earth', 'space', 'nature', 'weather', 'tree', 'flower', 'river', 'mountain', 'sea', 'rain', 'sun', 'wind', 'forest', 'bird', 'fish', 'climate']],
  ['society', ['people', 'community', 'culture', 'public', 'law', 'government', 'history', 'social', 'country', 'world', 'city', 'group', 'leader', 'right', 'vote', 'nation']],
  ['communication', ['say', 'tell', 'speak', 'talk', 'voice', 'message', 'letter', 'language', 'explain', 'word', 'answer', 'question', 'ask', 'reply', 'call', 'discuss', 'describe']],
  ['arts', ['music', 'art', 'story', 'picture', 'film', 'design', 'paint', 'creative', 'dance', 'song', 'draw', 'movie', 'theatre', 'colour', 'color', 'photo', 'play']],
  ['feelings', ['happy', 'sad', 'angry', 'afraid', 'love', 'fear', 'hope', 'feel', 'emotion', 'proud', 'worry', 'excited', 'surprise', 'enjoy', 'laugh', 'cry', 'smile']],
  ['work', ['work', 'job', 'office', 'business', 'company', 'manager', 'meeting', 'plan', 'project', 'team', 'money', 'pay', 'customer', 'market', 'sell', 'buy']],
];

function topicFor(en, sense) {
  // Word-boundary match against the headword + its English gloss. Greedy
  // substring matching wrongly bucketed e.g. "fit"/"arm"/"ill" inside unrelated
  // words and collapsed whole stages into one topic.
  const words = new Set(
    `${String(en).toLowerCase()} ${String(sense || '').toLowerCase()}`
      .match(/[a-z][a-z'-]*/g) || [],
  );
  for (const [topic, keys] of TOPIC_KEYWORDS) {
    if (keys.some((k) => words.has(k))) return topic;
  }
  return 'general';
}

// Content unfit for a young child. Examples mentioning any of these are
// rejected (we then try Tatoeba, else drop the word). Keeps the bank safe.
const KID_UNSAFE = /\b(excrement|aphrodisiac|erotic|heroin|cocaine|opium|sex|sexual|drunk|kill|killed|killing|murder|blood|bloody|corpse|rotted|maggots|death|dead|weapon|gun|bomb|war|drug|naked|nude|alcohol|cigarette|tobacco|smoke|suicide|rape|abuse|sperm|stoned|toxic|discrimination)\b/i;

// Reject Wiktionary examples that are archaic quotations or otherwise unfit for
// a child: long-s/ligature glyphs, em-dash citation refs, an example that
// doesn't actually contain the headword, or kid-unsafe content. Such words fall
// back to Tatoeba (and are dropped if Tatoeba is no better).
function exampleUsable(example, enLower) {
  const ex = String(example || '').trim();
  if (!ex) return false;
  if (ex.length < 8 || ex.length > 90) return false;
  if (/[ſæœ…]/.test(ex)) return false; // archaic glyphs / citation ellipsis
  if (KID_UNSAFE.test(ex)) return false; // not appropriate for children
  if (/[^\x00-\xFF]/.test(ex.normalize('NFC'))) {
    // contains non-Latin script (CJK etc.) — not kid English
    if (!/^[\x00-\x7FÀ-ɏ]*$/.test(ex)) return false;
  }
  // The example should show the word in use; require its stem to appear.
  const stem = enLower.slice(0, Math.max(3, enLower.length - 2));
  if (!ex.toLowerCase().includes(stem)) return false;
  return true;
}

// The old junk placeholder had the literal shape "từ <english headword>"
// (e.g. en="abandon" -> vi="từ abandon"). The verifier now blocks only that
// exact shape, so here we mirror it: drop a gloss ONLY when, stripped of marks,
// it equals "<prefix> <english word>". Genuine glosses like "Từ điển", "Tự do",
// "Tủ sách" are kept (they were wrongly dropped before).
function viTripsVerifier(vi, enLower) {
  const ascii = String(vi || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const en = String(enLower || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (!en) return false;
  return ['tu', 'tinh tu', 'dong tu'].some((p) => ascii === `${p} ${en}`);
}

// Some viwiktionary glosses are grammatical annotations, not real meanings:
//   "Quá khứ và phân từ quá khứ của amuse", "Số nhiều của box",
//   "Dạng ... của ...". These are useless for a learner — prefer the other
//   source's gloss instead, and drop the word if neither has a real meaning.
function viIsGrammarNote(vi) {
  const ascii = String(vi || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /\bcua\b/.test(ascii) && /\b(qua khu|phan tu|so nhieu|so it|dang|ngoi thu|hien tai|thi|bien the|cach viet|loi noi)\b/.test(ascii);
}

function readJsonl(file) {
  const rows = [];
  for (const ln of fs.readFileSync(file, 'utf8').split('\n')) {
    if (ln.trim()) { try { rows.push(JSON.parse(ln)); } catch { /* skip */ } }
  }
  return rows;
}

// Build a word -> example sentence index from the curated Tatoeba sentences.
function buildTatoebaIndex() {
  const idx = new Map();
  for (const s of readJsonl(CURATED)) {
    const text = String(s.text || '').trim();
    if (!text || text.length > 90) continue;
    const words = (text.toLowerCase().match(/[a-z][a-z'-]*/g) || []);
    for (const w of new Set(words)) if (!idx.has(w)) idx.set(w, text);
  }
  return idx;
}

// WordNet lexicographer-file topics (Princeton-assigned per sense). Keyed by
// lemma -> { noun?, verb?, adjective?, adverb? } -> topic label. This is an
// AUTHORITATIVE per-word classification: we only rename Princeton's domains to
// kid-friendly labels; we never assign a word to a topic ourselves.
const WN_TOPICS = path.join(RAW, 'wordnet-topics.json');
const wnTopics = fs.existsSync(WN_TOPICS) ? JSON.parse(fs.readFileSync(WN_TOPICS, 'utf8')) : {};

// WordNet domains that are too abstract/generic to make a clear kid topic on
// their own (all adjectives look like "descriptions", all adverbs like "manner
// words", plus the abstract verb/noun buckets the user complained about:
// "states and being", "actions", "thinking and ideas", ...). For these we try
// the kid-keyword matcher FIRST to rescue a concrete theme (e.g. a word whose
// gloss mentions "school" -> school). If no keyword matches we KEEP the WordNet
// label (renamed) rather than dumping the word into the giant "general" pile.
const WN_WEAK = new Set([
  'descriptions', 'manner words', 'qualities and descriptions', 'things and objects',
  'states and being', 'actions', 'social actions', 'thinking and ideas',
  'activities and events', 'nature and the world', 'general',
]);

// The keyword matcher and WordNet use different label strings for the same
// theme (e.g. "travel" vs "movement and travel"). Collapse them to one canonical
// label so we don't ship two near-duplicate units. Only renames, never reassigns.
const TOPIC_CANON = {
  travel: 'movement and travel',
  feelings: 'feelings and emotions',
  communication: 'language and communication',
  society: 'society and groups',
  nature: 'nature and the world',
  health: 'body and health',
  work: 'activities and events',
  arts: 'art and making',
};
function canonTopic(t) {
  return TOPIC_CANON[t] || t;
}

function topicForWord(en, pos, sense) {
  const entry = wnTopics[String(en).toLowerCase()];
  const wn = entry && (entry[pos] || entry.noun || entry.verb || entry.adjective || entry.adverb);
  // Strong WordNet theme: use it directly.
  if (wn && !WN_WEAK.has(wn)) return canonTopic(wn);
  // Weak/abstract WordNet domain: try the kid-keyword matcher to rescue a
  // concrete theme from the headword + gloss.
  const kw = topicFor(en, sense);
  if (kw !== 'general') return canonTopic(kw);
  // No keyword match either: keep the renamed WordNet label (still better than
  // dumping into the giant "general" pile), else 'general' as last resort.
  return wn ? canonTopic(wn) : 'general';
}

// TWO authoritative VI sources, merged. English Wiktionary translations[] is
// thin for EN->VI (only ~4126/8272 words). Vietnamese Wiktionary (viwiktionary,
// English headwords defined in Vietnamese) covers ~8000/8272 and is often richer
// (bag -> "Bao, túi, bị, xắc, cặp" vs English's "bao"). We prefer the viwikt
// gloss as primary, keep the English gloss as an alternate, and union the words.
const VIWIKT_MAP = path.join(RAW, 'viwikt-map.jsonl');
const engRows = readJsonl(VI_MAP);                                  // English Wiktionary
const viwiktRows = fs.existsSync(VIWIKT_MAP) ? readJsonl(VIWIKT_MAP) : []; // Vietnamese Wiktionary
const tatoeba = buildTatoebaIndex();

// Build per-word merged record. Key by en_lower. viwikt is primary for the gloss
// (richer), English fills gaps and supplies alternates + its own example.
const merged = new Map();
function ingest(rows, srcTag) {
  for (const r of rows) {
    const key = r.en_lower || String(r.en || '').toLowerCase();
    if (!key) continue;
    if (!merged.has(key)) {
      merged.set(key, { en: r.en, en_lower: key, level: r.level, cefr: r.cefr, pos: r.pos, sense: r.sense, vi: '', vi_alts: [], example: '', _src: {} });
    }
    const m = merged.get(key);
    m._src[srcTag] = r;
    if (!m.level && r.level) m.level = r.level;
    if (!m.cefr && r.cefr) m.cefr = r.cefr;
    if (!m.pos && r.pos) m.pos = r.pos;
  }
}
ingest(viwiktRows, 'viw');   // primary
ingest(engRows, 'eng');      // secondary

// Resolve each word's VI gloss + example from the two sources. We NEVER invent:
// a word with no real VI in either source is simply absent. A word with VI but
// no usable example is KEPT (usable in vocab/quiz) — the lesson generator only
// needs an example for the reading/grammar steps and skips words that lack one.
const enriched = [];
for (const m of merged.values()) {
  const viw = m._src.viw;
  const eng = m._src.eng;
  // Primary gloss: prefer viwiktionary (richer), fall back to English.
  let vi = (viw && String(viw.vi || '').trim()) || (eng && String(eng.vi || '').trim()) || '';
  if (!vi) continue;
  if (viTripsVerifier(vi, m.en_lower)) {
    // primary collides with the junk-placeholder shape; try the other source
    const alt = (eng && String(eng.vi || '').trim()) || '';
    if (alt && !viTripsVerifier(alt, m.en_lower)) vi = alt;
    else continue;
  }
  // Primary gloss is a grammatical annotation ("Quá khứ của ...", "Số nhiều
  // của ..."), not a real meaning. Try the other source; drop if both are notes.
  if (viIsGrammarNote(vi)) {
    const alt = (eng && String(eng.vi || '').trim()) || (viw && String(viw.vi || '').trim()) || '';
    if (alt && alt.toLowerCase() !== vi.toLowerCase() && !viIsGrammarNote(alt) && !viTripsVerifier(alt, m.en_lower)) vi = alt;
    else continue;
  }
  // Alternates: other source's gloss + both sources' vi_alts, de-duped.
  const altSet = [];
  const pushAlt = (v) => { const t = String(v || '').trim(); if (t && t.toLowerCase() !== vi.toLowerCase() && !altSet.some((a) => a.toLowerCase() === t.toLowerCase())) altSet.push(t); };
  if (viw) { pushAlt(viw.vi === vi ? '' : viw.vi); (viw.vi_alts || []).forEach(pushAlt); }
  if (eng) { pushAlt(eng.vi); (eng.vi_alts || []).forEach(pushAlt); }

  // Example: prefer a clean, kid-safe, headword-containing example from either
  // Wiktionary source, else a Tatoeba sentence. May be '' (kept anyway).
  let example = '';
  for (const cand of [viw && viw.example, eng && eng.example]) {
    if (cand && exampleUsable(cand, m.en_lower)) { example = String(cand).trim(); break; }
  }
  if (!example) {
    const t = tatoeba.get(m.en_lower) || '';
    if (exampleUsable(t, m.en_lower)) example = t;
  }
  const sense = (viw && viw.sense) || (eng && eng.sense) || '';
  enriched.push({
    en: m.en, en_lower: m.en_lower, level: m.level, cefr: m.cefr, pos: m.pos,
    vi, vi_alts: altSet.slice(0, 4), example, sense,
    topic: topicForWord(m.en, m.pos, sense),
  });
}

// Select per stage: group by topic so words ship in coherent themed sets, but
// keep EVERY word (no PER_STAGE cap). Themed topics first (biggest first),
// 'general' last, so the lesson generator forms real topic units.
function selectStage(level) {
  const pool = enriched.filter((r) => r.level === level);
  const byTopic = new Map();
  for (const r of pool) {
    if (!byTopic.has(r.topic)) byTopic.set(r.topic, []);
    byTopic.get(r.topic).push(r);
  }
  const topics = [...byTopic.entries()]
    .sort((a, b) => {
      if (a[0] === 'general') return 1;
      if (b[0] === 'general') return -1;
      return b[1].length - a[1].length;
    });
  const chosen = [];
  for (const [, words] of topics) {
    words.sort((a, b) => a.en.localeCompare(b.en));
    for (const w of words) chosen.push(w);
  }
  return chosen;
}

const seed = [];
const summary = {};
for (const level of STAGES) {
  const chosen = selectStage(level);
  const topicCounts = {};
  for (const w of chosen) {
    topicCounts[w.topic] = (topicCounts[w.topic] || 0) + 1;
    seed.push({
      en: w.en,
      vi: w.vi,
      level,
      topic: w.topic,
      example: w.example,
      part_of_speech: w.pos || 'noun',
      source: 'cefrj-octanove-wiktionary',
      source_id: 'engkids-cefr-clean-2026',
      license_status: 'open-license',
      review_status: 'approved',
      tags: [w.cefr, w.topic, ...(w.vi_alts && w.vi_alts.length ? ['has-alts'] : [])],
      active: true,
    });
  }
  summary[level] = { total: chosen.length, topics: topicCounts };
}

fs.writeFileSync(OUT, JSON.stringify(seed, null, 0));
console.log('seed written:', seed.length, OUT);
console.log(JSON.stringify(summary, null, 2));
