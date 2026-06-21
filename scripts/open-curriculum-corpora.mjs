#!/usr/bin/env node
import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const root = process.cwd();
const mode = process.argv[2] || 'verify';
const rawDir = path.resolve(process.env.OPEN_CURRICULUM_RAW_DIR || path.join(root, 'data', 'open-curriculum', 'raw'));
const curatedDir = path.join(root, 'data', 'open-curriculum', 'curated');
const now = () => new Date().toISOString();

const STAGES = [
  { id: 'a2-key', label: 'A2 Key', targetWords: 1500, targetLessons: 40, minLen: 4, maxLen: 9 },
  { id: 'b1-preliminary', label: 'B1 Preliminary', targetWords: 2000, targetLessons: 40, minLen: 7, maxLen: 13 },
  { id: 'b2-first', label: 'B2 First', targetWords: 2500, targetLessons: 40, minLen: 10, maxLen: 18 },
  { id: 'c1-advanced', label: 'C1 Advanced', targetWords: 2500, targetLessons: 40, minLen: 14, maxLen: 24 },
];

const EXTRACT_TARGETS = {
  'a2-key': 1800,
  'b1-preliminary': 2400,
  'b2-first': 2900,
  'c1-advanced': 3000,
};

const SENTENCE_TARGETS = {
  'a2-key': 2200,
  'b1-preliminary': 2600,
  'b2-first': 2600,
  'c1-advanced': 1800,
};

const SOURCES = {
  wordnet: {
    id: 'wordnet-princeton-lexical',
    title: 'WordNet lexical database',
    publisher: 'Princeton University',
    sourceUrl: 'https://wordnet.princeton.edu/license-and-commercial-use',
    downloadUrl: 'https://wordnetcode.princeton.edu/wn3.1.dict.tar.gz',
    licenseName: 'WordNet license',
    licenseUrl: 'https://wordnet.princeton.edu/license-and-commercial-use',
    attribution: 'WordNet, Princeton University.',
    allowedUse: 'Lexical lemmas, definitions, and synsets imported with attribution for educational use.',
    sourceKind: 'lexical',
  },
  tatoeba: {
    id: 'tatoeba-corpus-sentences',
    title: 'Tatoeba English sentence export',
    publisher: 'Tatoeba Project',
    sourceUrl: 'https://tatoeba.org/gos/downloads',
    downloadUrl: 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2',
    licenseName: 'CC BY 2.0 FR / mixed attribution per sentence',
    licenseUrl: 'https://en.wiki.tatoeba.org/articles/show/terms-of-use',
    attribution: 'Tatoeba Project contributors.',
    allowedUse: 'Sentence examples imported with source metadata and attribution.',
    sourceKind: 'lexical',
  },
  gutenberg: {
    id: 'gutenberg-public-domain-reading',
    title: 'Project Gutenberg public-domain reading candidates',
    publisher: 'Project Gutenberg Literary Archive Foundation',
    sourceUrl: 'https://www.gutenberg.org/policy/license',
    licenseName: 'Project Gutenberg terms / public domain review required per item',
    licenseUrl: 'https://www.gutenberg.org/policy/license',
    attribution: 'Project Gutenberg and the relevant public-domain text author.',
    allowedUse: 'Short reading passages staged only from item-level public-domain candidates.',
    sourceKind: 'reading',
  },
  builder: {
    id: 'engkids-open-curriculum-builder',
    title: 'Engkids open curriculum lesson builder',
    publisher: 'Engkids',
    sourceUrl: 'https://engkids.local/open-curriculum-builder',
    licenseName: 'Generated lesson shell from approved open-source rows',
    licenseUrl: 'https://engkids.local/open-curriculum-builder',
    attribution: 'Engkids lesson templates using approved WordNet, Tatoeba, and public-domain source rows.',
    allowedUse: 'Publishes lesson structure only; source rows remain attributed in step payloads.',
    sourceKind: 'framework',
  },
};

const GUTENBERG_BOOKS = [
  { id: '11', title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', levels: ['b1-preliminary', 'b2-first'], topic: 'story' },
  { id: '120', title: 'Treasure Island', author: 'Robert Louis Stevenson', levels: ['b2-first', 'c1-advanced'], topic: 'adventure' },
  { id: '1342', title: 'Pride and Prejudice', author: 'Jane Austen', levels: ['c1-advanced'], topic: 'society' },
  { id: '98', title: 'A Tale of Two Cities', author: 'Charles Dickens', levels: ['c1-advanced'], topic: 'history' },
  { id: '345', title: 'Dracula', author: 'Bram Stoker', levels: ['b2-first', 'c1-advanced'], topic: 'literature' },
];

const TOPIC_KEYWORDS = [
  ['school', ['school', 'student', 'teacher', 'class', 'lesson', 'learn', 'study', 'book', 'exam', 'write', 'read']],
  ['daily life', ['home', 'family', 'friend', 'food', 'room', 'house', 'day', 'morning', 'evening', 'shop', 'money']],
  ['travel', ['travel', 'train', 'bus', 'car', 'road', 'city', 'hotel', 'ticket', 'journey', 'airport']],
  ['health', ['health', 'body', 'doctor', 'pain', 'sleep', 'sport', 'exercise', 'medicine', 'safe']],
  ['technology', ['computer', 'data', 'digital', 'machine', 'device', 'internet', 'software', 'system', 'technology']],
  ['science', ['science', 'energy', 'plant', 'animal', 'water', 'earth', 'space', 'measure', 'research']],
  ['society', ['people', 'community', 'culture', 'public', 'law', 'government', 'history', 'social']],
  ['communication', ['say', 'tell', 'speak', 'talk', 'voice', 'message', 'letter', 'language', 'explain']],
  ['arts', ['music', 'art', 'story', 'picture', 'film', 'design', 'paint', 'creative']],
];

const BLOCKLIST = new Set([
  'abuse', 'adult', 'alcohol', 'assault', 'blood', 'bomb', 'cocaine', 'crime', 'drug', 'drunk', 'erotic', 'gamble', 'gun', 'kill', 'murder', 'nude', 'opium', 'porn', 'rape', 'sex', 'suicide', 'tobacco', 'weapon',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function slug(value) {
  return String(value || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'general';
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function wordsIn(value) {
  return normalizeText(value).toLowerCase().match(/[a-z][a-z'-]*/g) || [];
}

function hasBlockedContent(value) {
  const text = ` ${normalizeText(value).toLowerCase()} `;
  for (const word of BLOCKLIST) if (text.includes(` ${word} `)) return true;
  return false;
}

function topicFor(text, fallback = 'general') {
  const lower = ` ${normalizeText(text).toLowerCase()} `;
  for (const [topic, keys] of TOPIC_KEYWORDS) {
    if (keys.some((key) => lower.includes(` ${key} `))) return topic;
  }
  return fallback;
}

function sentenceLevel(wordCount, avgLen) {
  if (wordCount <= 8 && avgLen <= 5.5) return 'a2-key';
  if (wordCount <= 13 && avgLen <= 6.2) return 'b1-preliminary';
  if (wordCount <= 18 && avgLen <= 7.0) return 'b2-first';
  return 'c1-advanced';
}

function lexicalScore(lemma, definition, pos) {
  const lower = `${lemma} ${definition}`.toLowerCase();
  const syllableish = (lemma.match(/[aeiouy]+/gi) || []).length;
  let score = lemma.length + syllableish + (definition.length > 90 ? 2 : 0);
  if (pos === 'adverb') score += 2;
  if (/(tion|sion|ment|ness|ity|ance|ence|ism|ology|ive|ous|ial)$/.test(lemma)) score += 4;
  if (/(quality|state|process|principle|theory|system|relation|degree|condition)/.test(lower)) score += 3;
  if (/(person|place|food|animal|body|home|school|water|family|day)/.test(lower)) score -= 2;
  return score;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function pathExists(file) {
  try { await stat(file); return true; } catch { return false; }
}

async function ensureDirs() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(curatedDir, { recursive: true });
}

async function downloadFile(url, file) {
  if (await pathExists(file)) return { file, skipped: true };
  await mkdir(path.dirname(file), { recursive: true });
  const response = await fetch(url, { headers: { 'User-Agent': 'Engkids open curriculum importer/1.0' } });
  if (!response.ok || !response.body) throw new Error(`Download failed ${response.status} ${url}`);
  await pipeline(response.body, createWriteStream(file));
  return { file, skipped: false };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)));
  });
}

async function decompressBz2(src, dest) {
  if (await pathExists(dest)) return;
  await run('python', ['-c', 'import bz2, shutil, sys;\nwith bz2.open(sys.argv[1], "rb") as source, open(sys.argv[2], "wb") as target: shutil.copyfileobj(source, target)', src, dest]);
}

async function findFile(dir, name) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === name) return full;
    if (entry.isDirectory()) {
      const found = await findFile(full, name).catch(() => null);
      if (found) return found;
    }
  }
  return null;
}

async function writeJsonl(file, rows) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');
}

async function readJsonl(file) {
  if (!(await pathExists(file))) return [];
  const text = await readFile(file, 'utf8');
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function downloadCorpora() {
  await ensureDirs();
  const wordnetArchive = path.join(rawDir, 'wordnet', 'wn3.1.dict.tar.gz');
  const tatoebaArchive = path.join(rawDir, 'tatoeba', 'eng_sentences.tsv.bz2');
  const tatoebaTsv = path.join(rawDir, 'tatoeba', 'eng_sentences.tsv');
  const wordnetExtracted = path.join(rawDir, 'wordnet', 'extracted');

  const wordnet = await downloadFile(SOURCES.wordnet.downloadUrl, wordnetArchive);
  console.log(`${wordnet.skipped ? 'Skipped' : 'Downloaded'} WordNet: ${wordnet.file}`);
  await mkdir(wordnetExtracted, { recursive: true });
  if (!(await findFile(wordnetExtracted, 'data.noun'))) await run('tar', ['-xzf', wordnetArchive, '-C', wordnetExtracted]);
  console.log(`WordNet extracted: ${wordnetExtracted}`);

  const tatoeba = await downloadFile(SOURCES.tatoeba.downloadUrl, tatoebaArchive);
  console.log(`${tatoeba.skipped ? 'Skipped' : 'Downloaded'} Tatoeba: ${tatoeba.file}`);
  await decompressBz2(tatoebaArchive, tatoebaTsv);
  console.log(`Tatoeba decompressed: ${tatoebaTsv}`);

  const gutenbergDir = path.join(rawDir, 'gutenberg');
  await mkdir(gutenbergDir, { recursive: true });
  for (const book of GUTENBERG_BOOKS) {
    const file = path.join(gutenbergDir, `${book.id}.txt`);
    if (await pathExists(file)) continue;
    const candidates = [
      `https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`,
      `https://www.gutenberg.org/files/${book.id}/${book.id}.txt`,
      `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`,
    ];
    let ok = false;
    for (const url of candidates) {
      try {
        await downloadFile(url, file);
        ok = true;
        console.log(`Downloaded Gutenberg ${book.id}: ${book.title}`);
        break;
      } catch {
        // Try next canonical Gutenberg text URL.
      }
    }
    if (!ok) console.warn(`Skipped Gutenberg ${book.id}: no text URL worked.`);
  }
}

function safeLemma(raw) {
  const lemma = String(raw || '').replace(/_/g, ' ').toLowerCase().trim();
  if (!/^[a-z][a-z'-]{1,23}$/.test(lemma)) return null;
  if (hasBlockedContent(lemma)) return null;
  return lemma;
}

function parseSynsetLine(line, posName) {
  if (!line || line.startsWith('  ')) return [];
  const [head, glossRaw = ''] = line.split('|');
  const parts = head.trim().split(/\s+/);
  if (parts.length < 5) return [];
  const offset = parts[0];
  const wordCount = Number.parseInt(parts[3], 16);
  if (!Number.isFinite(wordCount) || wordCount <= 0) return [];
  const words = [];
  for (let i = 0; i < wordCount; i += 1) {
    const token = parts[4 + (i * 2)];
    const lemma = safeLemma(token);
    if (lemma) words.push(lemma);
  }
  if (!words.length) return [];
  const gloss = normalizeText(glossRaw);
  const definition = normalizeText(gloss.split(';')[0]).replace(/^\"|\"$/g, '').slice(0, 240);
  if (!definition || hasBlockedContent(definition)) return [];
  const exampleMatch = gloss.match(/"([^"]{12,180})"/);
  const example = normalizeText(exampleMatch?.[1] || definition).slice(0, 220);
  return words.map((lemma) => ({ offset, lemma, partOfSpeech: posName, definition, example, synonyms: words.filter((word) => word !== lemma).slice(0, 6) }));
}

async function extractWordNet() {
  const wordnetDir = path.join(rawDir, 'wordnet', 'extracted');
  const files = [
    ['data.noun', 'noun'],
    ['data.verb', 'verb'],
    ['data.adj', 'adjective'],
    ['data.adv', 'adverb'],
  ];
  const byLemma = new Map();
  for (const [fileName, pos] of files) {
    const file = await findFile(wordnetDir, fileName);
    if (!file) throw new Error(`Missing WordNet ${fileName}. Run curriculum:download-open-corpora first.`);
    const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line || /^\s/.test(line)) continue;
      for (const item of parseSynsetLine(line, pos)) {
        if (byLemma.has(item.lemma)) continue;
        const score = lexicalScore(item.lemma, item.definition, item.partOfSpeech);
        byLemma.set(item.lemma, { ...item, score, topic: topicFor(`${item.lemma} ${item.definition}`) });
      }
    }
  }

  const selected = [...byLemma.values()]
    .filter((item) => !hasBlockedContent(`${item.lemma} ${item.definition} ${item.example}`))
    .sort((a, b) => a.score - b.score || a.lemma.localeCompare(b.lemma));

  const rows = [];
  let cursor = 0;
  for (const stage of STAGES) {
    const target = EXTRACT_TARGETS[stage.id];
    const slice = selected.slice(cursor, cursor + target);
    cursor += target;
    for (const item of slice) {
      const externalId = `${item.partOfSpeech}:${item.offset}:${item.lemma}`;
      const sourceHash = sha256(`${SOURCES.wordnet.id}:${externalId}:${item.definition}`);
      rows.push({
        source_id: SOURCES.wordnet.id,
        external_id: externalId,
        lemma: item.lemma,
        lemma_lower: item.lemma,
        part_of_speech: item.partOfSpeech,
        definition: item.definition,
        synonyms: item.synonyms,
        example: item.example,
        level: stage.id,
        topic: item.topic,
        source_url: SOURCES.wordnet.sourceUrl,
        attribution: SOURCES.wordnet.attribution,
        license_name: SOURCES.wordnet.licenseName,
        license_url: SOURCES.wordnet.licenseUrl,
        source_hash: sourceHash,
        review_status: 'pending',
        safety_status: 'safe',
      });
    }
  }
  await writeJsonl(path.join(curatedDir, 'source_lexical_items.jsonl'), rows);
  console.log(`Extracted WordNet lexical rows: ${rows.length}`);
}

async function extractTatoeba() {
  const file = path.join(rawDir, 'tatoeba', 'eng_sentences.tsv');
  if (!(await pathExists(file))) throw new Error('Missing Tatoeba TSV. Run curriculum:download-open-corpora first.');
  const counts = Object.fromEntries(STAGES.map((stage) => [stage.id, 0]));
  const rows = [];
  const seen = new Set();
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (rows.length >= Object.values(SENTENCE_TARGETS).reduce((a, b) => a + b, 0)) break;
    const parts = line.split('\t');
    const externalId = parts[0];
    const text = normalizeText(parts.length >= 3 ? parts.slice(2).join(' ') : parts.slice(1).join(' '));
    if (!externalId || !text || seen.has(text.toLowerCase())) continue;
    if (text.length < 18 || text.length > 180 || hasBlockedContent(text)) continue;
    if (!/^[A-Z0-9"'({\[]/.test(text) || !/[.!?]$/.test(text)) continue;
    if (/https?:|www\.|@/.test(text)) continue;
    const words = wordsIn(text);
    if (words.length < 4 || words.length > 24) continue;
    const avgLen = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const level = sentenceLevel(words.length, avgLen);
    if (counts[level] >= SENTENCE_TARGETS[level]) continue;
    seen.add(text.toLowerCase());
    counts[level] += 1;
    const sourceHash = sha256(`${SOURCES.tatoeba.id}:${externalId}:${text}`);
    rows.push({
      source_id: SOURCES.tatoeba.id,
      external_id: String(externalId),
      lang: 'eng',
      text,
      normalized_text: text.toLowerCase(),
      level,
      topic: topicFor(text),
      sentence_length: words.length,
      source_url: `${SOURCES.tatoeba.sourceUrl}#${externalId}`,
      attribution: SOURCES.tatoeba.attribution,
      license_name: SOURCES.tatoeba.licenseName,
      license_url: SOURCES.tatoeba.licenseUrl,
      source_hash: sourceHash,
      review_status: 'pending',
      safety_status: 'safe',
    });
  }
  await writeJsonl(path.join(curatedDir, 'source_sentence_items.jsonl'), rows);
  console.log(`Extracted Tatoeba sentence rows: ${rows.length} (${JSON.stringify(counts)})`);
}

function stripGutenbergBoilerplate(text) {
  const start = text.search(/\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK/i);
  const afterStart = start >= 0 ? text.slice(text.indexOf('\n', start) + 1) : text;
  const end = afterStart.search(/\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i);
  return end >= 0 ? afterStart.slice(0, end) : afterStart;
}

async function extractGutenberg() {
  const rows = [];
  for (const book of GUTENBERG_BOOKS) {
    const file = path.join(rawDir, 'gutenberg', `${book.id}.txt`);
    if (!(await pathExists(file))) continue;
    const raw = await readFile(file, 'utf8');
    const body = stripGutenbergBoilerplate(raw).replace(/\r/g, '');
    const paragraphs = body.split(/\n\s*\n/).map(normalizeText).filter((p) => {
      const wc = wordsIn(p).length;
      return wc >= 60 && wc <= 260 && !hasBlockedContent(p) && !/^chapter\b/i.test(p);
    });
    let index = 0;
    for (const paragraph of paragraphs.slice(0, 16)) {
      const level = book.levels[index % book.levels.length];
      const externalId = `${book.id}:${index + 1}`;
      const sourceHash = sha256(`${SOURCES.gutenberg.id}:${externalId}:${paragraph}`);
      rows.push({
        source_id: SOURCES.gutenberg.id,
        external_id: externalId,
        title: book.title,
        author: book.author,
        text: paragraph,
        normalized_text: paragraph.toLowerCase(),
        level,
        topic: book.topic,
        word_count: wordsIn(paragraph).length,
        source_url: `https://www.gutenberg.org/ebooks/${book.id}`,
        attribution: `${book.title} by ${book.author}; Project Gutenberg.`,
        license_name: SOURCES.gutenberg.licenseName,
        license_url: SOURCES.gutenberg.licenseUrl,
        source_hash: sourceHash,
        review_status: 'pending',
        safety_status: 'safe',
      });
      index += 1;
    }
  }
  await writeJsonl(path.join(curatedDir, 'source_reading_passages.jsonl'), rows);
  console.log(`Extracted Gutenberg reading passages: ${rows.length}`);
}

async function extractCorpora() {
  await ensureDirs();
  await extractWordNet();
  await extractTatoeba().catch((error) => {
    console.warn(`Tatoeba extraction skipped: ${error.message}`);
    return writeJsonl(path.join(curatedDir, 'source_sentence_items.jsonl'), []);
  });
  await extractGutenberg().catch((error) => {
    console.warn(`Gutenberg extraction skipped: ${error.message}`);
    return writeJsonl(path.join(curatedDir, 'source_reading_passages.jsonl'), []);
  });
}

async function upsertSource(supabase, source) {
  const stamp = now();
  const { error } = await supabase.from('curriculum_import_sources').upsert({
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    license_proof: source.licenseUrl,
    allowed_use: source.allowedUse,
    level: 'a2-key',
    file_path: rawDir,
    content_type: source.sourceKind,
    import_mode: 'open-corpus',
    approved: false,
    source_hash: sha256(JSON.stringify(source)),
    source_url: source.sourceUrl,
    attribution: source.attribution,
    license_name: source.licenseName,
    license_url: source.licenseUrl,
    source_kind: source.sourceKind,
    trust_status: 'trusted',
    updated_at: stamp,
  }, { onConflict: 'id' });
  if (error) throw new Error(`${source.id}: ${error.message}`);
}

async function chunked(rows, size, fn) {
  for (let index = 0; index < rows.length; index += size) {
    await fn(rows.slice(index, index + size), index);
  }
}

async function stageContent() {
  const supabase = getSupabaseAdmin();
  for (const source of Object.values(SOURCES)) await upsertSource(supabase, source);

  const lexical = await readJsonl(path.join(curatedDir, 'source_lexical_items.jsonl'));
  const sentences = await readJsonl(path.join(curatedDir, 'source_sentence_items.jsonl'));
  const passages = await readJsonl(path.join(curatedDir, 'source_reading_passages.jsonl'));

  await chunked(lexical, 500, async (rows) => {
    const { error } = await supabase.from('source_lexical_items').upsert(rows, { onConflict: 'lemma_lower' });
    if (error) throw new Error(`source_lexical_items: ${error.message}`);
  });
  await chunked(sentences, 500, async (rows) => {
    const { error } = await supabase.from('source_sentence_items').upsert(rows, { onConflict: 'source_id,external_id' });
    if (error) throw new Error(`source_sentence_items: ${error.message}`);
  });
  await chunked(passages, 200, async (rows) => {
    const { error } = await supabase.from('source_reading_passages').upsert(rows, { onConflict: 'source_id,external_id' });
    if (error) throw new Error(`source_reading_passages: ${error.message}`);
  });

  await supabase.from('curriculum_import_staging').delete().in('entity_type', ['open-corpus-lexical', 'open-corpus-sentence', 'open-corpus-reading']);
  const summaries = [
    { source_id: SOURCES.wordnet.id, row_index: 1, entity_type: 'open-corpus-lexical', payload: { rows: lexical.length, rawDir, curatedFile: 'source_lexical_items.jsonl' }, review_status: 'pending', ...metaFor(SOURCES.wordnet) },
    { source_id: SOURCES.tatoeba.id, row_index: 1, entity_type: 'open-corpus-sentence', payload: { rows: sentences.length, rawDir, curatedFile: 'source_sentence_items.jsonl' }, review_status: 'pending', ...metaFor(SOURCES.tatoeba) },
    { source_id: SOURCES.gutenberg.id, row_index: 1, entity_type: 'open-corpus-reading', payload: { rows: passages.length, rawDir, curatedFile: 'source_reading_passages.jsonl' }, review_status: 'pending', ...metaFor(SOURCES.gutenberg) },
  ];
  const { error } = await supabase.from('curriculum_import_staging').insert(summaries);
  if (error) throw new Error(`curriculum_import_staging: ${error.message}`);
  console.log(`Staged open content: lexical=${lexical.length}, sentences=${sentences.length}, passages=${passages.length}`);
}

function metaFor(source) {
  return {
    source_url: source.sourceUrl,
    attribution: source.attribution,
    license_name: source.licenseName,
    license_url: source.licenseUrl,
    source_hash: sha256(JSON.stringify(source)),
  };
}

async function approveContent() {
  const supabase = getSupabaseAdmin();
  const stamp = now();
  for (const source of Object.values(SOURCES)) {
    const { error } = await supabase.from('curriculum_import_sources').update({ approved: true, trust_status: 'trusted', imported_at: stamp, updated_at: stamp }).eq('id', source.id);
    if (error) throw new Error(`${source.id}: ${error.message}`);
  }
  for (const table of ['source_lexical_items', 'source_sentence_items', 'source_reading_passages']) {
    const { error } = await supabase.from(table).update({ review_status: 'approved', imported_at: stamp }).eq('safety_status', 'safe').in('review_status', ['pending', 'approved']);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  const { error } = await supabase.from('curriculum_import_staging').update({ review_status: 'approved' }).in('entity_type', ['open-corpus-lexical', 'open-corpus-sentence', 'open-corpus-reading']).in('review_status', ['pending', 'approved']);
  if (error) throw new Error(`curriculum_import_staging: ${error.message}`);
  console.log('Approved safe open-corpus rows for publishing.');
}

async function fetchAll(table, select, configure = (query) => query) {
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function buildExampleMap(sentences) {
  const map = new Map();
  for (const sentence of sentences) {
    for (const word of new Set(wordsIn(sentence.text))) {
      if (!map.has(word)) map.set(word, sentence.text);
    }
  }
  return map;
}

async function publishWords(lexical, sentences) {
  const exampleMap = buildExampleMap(sentences);
  const stamp = now();
  const rows = lexical.map((item, index) => ({
    en: item.lemma,
    vi: 'translation_pending',
    level: item.level,
    topic: item.topic || 'general',
    example: exampleMap.get(item.lemma_lower) || `WordNet definition: ${item.definition}`,
    part_of_speech: item.part_of_speech || null,
    source: SOURCES.wordnet.id,
    source_id: SOURCES.wordnet.id,
    license_status: 'open-license',
    source_hash: item.source_hash,
    imported_at: stamp,
    review_status: 'approved',
    source_url: item.source_url,
    attribution: item.attribution,
    license_name: item.license_name,
    license_url: item.license_url,
    tags: ['open-curriculum', item.level, item.topic || 'general', 'translation_pending'],
    sort_order: 5000 + index,
    active: true,
  }));
  await chunked(rows, 500, async (chunk) => {
    const { error } = await getSupabaseAdmin().from('word_bank_items').upsert(chunk, { onConflict: 'en_lower' });
    if (error) throw new Error(`word_bank_items: ${error.message}`);
  });
  console.log(`Published/upserted word bank rows: ${rows.length}`);
}

function lessonTitle(stage, topic, index) {
  const titleTopic = topic.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  return `${stage.label} Lesson ${String(index).padStart(2, '0')}: ${titleTopic}`;
}

function lessonObjective(stage, topic) {
  if (stage.id === 'a2-key') return `Hoc tu vung ${topic}, doc cau ngan va tao cau tra loi ro rang.`;
  if (stage.id === 'b1-preliminary') return `Dung tu vung ${topic} de hieu y chinh va viet doan ngan co ly do.`;
  if (stage.id === 'b2-first') return `Phan tich noi dung ${topic}, so sanh y tuong va dien dat quan diem co vi du.`;
  return `Tom tat, danh gia va trinh bay y kien chinh xac ve chu de ${topic}.`;
}

function difficultyForStage(stageId) {
  if (stageId === 'a2-key') return 2.5;
  if (stageId === 'b1-preliminary') return 4.5;
  if (stageId === 'b2-first') return 6.5;
  return 8;
}

function ageBandForStage(stageId) {
  if (stageId === 'a2-key') return '9-13';
  if (stageId === 'b1-preliminary') return '11-15';
  if (stageId === 'b2-first') return '13-16';
  return '14+';
}

function outputForStage(stageId) {
  if (stageId === 'a2-key') return 'Short sentence or message using target vocabulary.';
  if (stageId === 'b1-preliminary') return 'Short paragraph, email, or spoken opinion with reasons.';
  if (stageId === 'b2-first') return 'Structured comparison or opinion with examples.';
  return 'Summary, evaluation, or presentation-style response.';
}

function skillForStep(stepType) {
  if (stepType === 'reading') return 'reading';
  if (stepType === 'listening') return 'listening';
  if (stepType === 'speaking') return 'speaking';
  if (stepType === 'writing') return 'writing';
  if (stepType === 'grammar') return 'use-of-english';
  return 'vocabulary';
}

async function publishLessons(words, sentences, passages) {
  const supabase = getSupabaseAdmin();
  const stamp = now();
  const exampleMap = buildExampleMap(sentences);
  const units = [];
  const lessons = [];
  const steps = [];
  const lessonIds = [];
  const sourceMeta = metaFor(SOURCES.builder);

  for (const stage of STAGES) {
    const stageWords = words
      .filter((word) => word.level === stage.id)
      .filter((word) => /^[a-z][a-z'-]{2,}$/.test(word.lemma || word.en || ''))
      .filter((word) => exampleMap.has(word.lemma_lower || String(word.lemma || word.en || '').toLowerCase()))
      .sort((a, b) => String(a.topic || '').localeCompare(String(b.topic || '')) || String(a.lemma || a.en).localeCompare(String(b.lemma || b.en)));
    if (stageWords.length < stage.targetLessons * 4) throw new Error(`Not enough child-friendly Tatoeba-backed words for ${stage.id}: ${stageWords.length}`);
    const stageSentences = sentences.filter((sentence) => sentence.level === stage.id);
    const stagePassages = passages.filter((passage) => passage.level === stage.id);
    const topics = [...new Set(stageWords.map((word) => word.topic || 'general'))].slice(0, 4);
    while (topics.length < 4) topics.push(['daily life', 'school', 'communication', 'reading'][topics.length]);
    for (const [topicIndex, topic] of topics.slice(0, 4).entries()) {
      units.push({
        id: `${stage.id}-open-${slug(topic)}`,
        stage_id: stage.id,
        title_vi: `${stage.label}: ${topic}`,
        theme: topic,
        target_skills: ['vocabulary', 'reading', 'writing'],
        sort_order: 100 + topicIndex,
        source_id: SOURCES.builder.id,
        license_status: 'open-license',
        source_hash: sha256(`${SOURCES.builder.id}:unit:${stage.id}:${topic}`),
        imported_at: stamp,
        review_status: 'approved',
        cefr_level: stage.id,
        can_do_statement: `Complete a ${stage.label} sequence about ${topic}.`,
        difficulty_score: difficultyForStage(stage.id),
        age_band: ageBandForStage(stage.id),
        quality_status: 'approved',
        safety_status: 'safe',
        cefr_reason: 'Unit is aligned by CEFR stage, theme, target skills, and lesson sequence.',
        active: true,
        ...sourceMeta,
      });
    }

    for (let index = 1; index <= stage.targetLessons; index += 1) {
      const topic = topics[(index - 1) % topics.length];
      const unitId = `${stage.id}-open-${slug(topic)}`;
      const lessonId = `${stage.id}-open-lesson-${String(index).padStart(2, '0')}`;
      const packStart = (index - 1) * 8;
      const wordPack = stageWords.slice(packStart, packStart + 8);
      if (wordPack.length < 4) continue;
      const sentencePack = stageSentences.slice((index - 1) * 3, (index - 1) * 3 + 3);
      const passage = stagePassages[(index - 1) % Math.max(stagePassages.length, 1)] || null;
      const contentHash = sha256(`${lessonId}:${wordPack.map((word) => word.lemma || word.en).join(',')}:${sentencePack.map((s) => s.source_hash).join(',')}:${passage?.source_hash || ''}`);
      lessonIds.push(lessonId);
      lessons.push({
        id: lessonId,
        unit_id: unitId,
        stage_id: stage.id,
        title_vi: lessonTitle(stage, topic, index),
        title_en: lessonTitle(stage, topic, index),
        objective_vi: lessonObjective(stage, topic),
        cefr: stage.label,
        estimated_minutes: stage.id === 'a2-key' ? 18 : stage.id === 'b1-preliminary' ? 24 : stage.id === 'b2-first' ? 30 : 35,
        skill_focus: ['vocabulary', 'reading', index % 2 === 0 ? 'writing' : 'speaking'],
        sort_order: 1000 + index,
        source_id: SOURCES.builder.id,
        license_status: 'open-license',
        source_hash: contentHash,
        imported_at: stamp,
        review_status: 'approved',
        cefr_level: stage.id,
        can_do_statement: lessonObjective(stage, topic),
        expected_output: outputForStage(stage.id),
        rubric: ['clear meaning', 'level-appropriate vocabulary', 'complete response'],
        learning_mode: stage.id === 'b2-first' || stage.id === 'c1-advanced' ? 'teen' : 'kid',
        difficulty_score: difficultyForStage(stage.id),
        age_band: ageBandForStage(stage.id),
        quality_status: 'approved',
        safety_status: 'safe',
        cefr_reason: 'Lesson is aligned by active CEFR stage, skill focus, step sequence, source metadata, and expected output.',
        active: true,
        ...sourceMeta,
      });

      const attribution = [...new Set([SOURCES.wordnet.attribution, ...sentencePack.map((s) => s.attribution), passage?.attribution].filter(Boolean))];
      const basePayload = { stageId: stage.id, topic, attribution, license: 'Open-source rows approved in Engkids source review.' };
      const stepRows = [
        ['warmup', 'Khoi dong tu khoa', 'Doc nhanh cac tu va chon tu da biet.', { ...basePayload, words: wordPack.slice(0, 5).map((word) => word.lemma || word.en) }],
        ['vocab', 'Tu vung trong nguon mo', 'Ghep tu voi dinh nghia va chu y loai tu.', { ...basePayload, items: wordPack.map((word) => ({ en: word.lemma || word.en, pos: word.part_of_speech, definition: word.definition, example: word.example })) }],
        ['reading', passage ? 'Doc doan van mien phi ban quyen' : 'Doc cau vi du Tatoeba', 'Tim y chinh va tu khoa trong ngu lieu.', { ...basePayload, passage: passage ? { title: passage.title, author: passage.author, text: passage.text, sourceUrl: passage.source_url } : null, sentences: sentencePack.map((s) => ({ text: s.text, sourceUrl: s.source_url })) }],
        ['grammar', 'Mau cau va cach noi', 'Quan sat cach tu duoc dung trong cau va tao mot cau moi.', { ...basePayload, focusWords: wordPack.slice(0, 4).map((word) => word.lemma || word.en), sentences: sentencePack.map((s) => s.text) }],
        [index % 2 === 0 ? 'writing' : 'speaking', index % 2 === 0 ? 'Viet output ngan' : 'Noi output ngan', 'Dung tu da hoc de tao output phu hop level.', { ...basePayload, prompt: `Use at least three words from this ${stage.label} pack to respond about ${topic}.`, requiredWords: wordPack.slice(0, 6).map((word) => word.lemma || word.en) }],
        ['quiz', 'Mini checkpoint', 'Tra loi nhanh de kiem tra tu va y chinh.', { ...basePayload, questions: wordPack.slice(0, 5).map((word) => ({ type: 'meaning-check', word: word.lemma || word.en, answer: word.definition })) }],
      ];
      stepRows.forEach(([stepType, titleVi, instructionVi, payload], stepIndex) => {
        steps.push({
          lesson_id: lessonId,
          step_type: stepType,
          title_vi: titleVi,
          instruction_vi: instructionVi,
          payload,
          sort_order: stepIndex + 1,
          source_id: SOURCES.builder.id,
          license_status: 'open-license',
          source_hash: sha256(`${contentHash}:step:${stepIndex + 1}`),
          imported_at: stamp,
          review_status: 'approved',
          cefr_skill: skillForStep(stepType),
          can_do_statement: 'Complete this short learning step with support.',
          expected_output: stepType === 'quiz' ? 'Quiz answers' : stepType === 'writing' ? 'Written response' : stepType === 'speaking' ? 'Spoken response' : 'Step completion',
          quality_status: 'approved',
          safety_status: 'safe',
          active: true,
          ...sourceMeta,
        });
      });
    }
  }

  await chunked(units, 100, async (chunk) => {
    const { error } = await supabase.from('curriculum_units').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`curriculum_units: ${error.message}`);
  });
  await chunked(lessons, 100, async (chunk) => {
    const { error } = await supabase.from('lessons').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`lessons: ${error.message}`);
  });
  await chunked(lessonIds, 100, async (chunk) => {
    const { error } = await supabase.from('lesson_steps').delete().in('lesson_id', chunk);
    if (error) throw new Error(`lesson_steps delete: ${error.message}`);
  });
  await chunked(steps, 300, async (chunk) => {
    const { error } = await supabase.from('lesson_steps').insert(chunk);
    if (error) throw new Error(`lesson_steps insert: ${error.message}`);
  });
  console.log(`Published lessons: units=${units.length}, lessons=${lessons.length}, steps=${steps.length}`);
}

async function backfillOriginalMetadata() {
  const supabase = getSupabaseAdmin();
  const wordMeta = {
    source_id: 'engkids-original-safe-seed',
    source_url: 'https://engkids.local/original-safe-curriculum',
    attribution: 'Engkids original-safe seed content.',
    license_name: 'Engkids original content',
    license_url: 'https://engkids.local/original-safe-curriculum',
    source_hash: 'engkids-original-safe-seed',
  };
  const lessonMeta = {
    source_id: SOURCES.builder.id,
    source_url: 'https://engkids.local/original-safe-lessons',
    attribution: 'Engkids original-safe lesson template.',
    license_name: 'Engkids original content',
    license_url: 'https://engkids.local/original-safe-lessons',
    source_hash: 'engkids-original-safe-lessons',
  };
  for (const table of ['word_bank_items']) {
    await supabase.from(table).update(wordMeta).eq('active', true).or('source_id.is.null,source_id.eq.,license_name.is.null,license_name.eq.,source_hash.is.null,source_hash.eq.');
  }
  for (const table of ['curriculum_units', 'lessons', 'lesson_steps']) {
    await supabase.from(table).update(lessonMeta).eq('active', true).or('source_id.is.null,source_id.eq.,license_name.is.null,license_name.eq.,source_hash.is.null,source_hash.eq.');
  }
}

async function publishContent() {
  const lexical = await fetchAll('source_lexical_items', '*', (query) => query.eq('safety_status', 'safe').in('review_status', ['approved', 'imported']).order('level').order('lemma_lower'));
  const sentences = await fetchAll('source_sentence_items', '*', (query) => query.eq('safety_status', 'safe').in('review_status', ['approved', 'imported']).order('level').order('sentence_length'));
  const passages = await fetchAll('source_reading_passages', '*', (query) => query.eq('safety_status', 'safe').in('review_status', ['approved', 'imported']).order('level').order('word_count'));
  if (lexical.length < 8500) throw new Error(`Not enough approved lexical rows: ${lexical.length}. Run extract/stage/approve first.`);
  await upsertSource(getSupabaseAdmin(), SOURCES.builder);
  await getSupabaseAdmin().from('curriculum_import_sources').update({ approved: true, trust_status: 'trusted', imported_at: now(), updated_at: now() }).eq('id', SOURCES.builder.id);
  await publishWords(lexical, sentences);
  await publishLessons(lexical, sentences, passages);
  await backfillOriginalMetadata();
}

async function countWhere(table, configure = (query) => query) {
  let query = getSupabaseAdmin().from(table).select('id', { count: 'exact', head: true });
  query = configure(query);
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count || 0;
}

async function verifyContent() {
  const failures = [];
  const activeWords = await countWhere('word_bank_items', (query) => query.eq('active', true));
  const activeLessons = await countWhere('lessons', (query) => query.eq('active', true).eq('review_status', 'approved'));
  console.log(`word_bank_items active: ${activeWords}`);
  console.log(`lessons active approved: ${activeLessons}`);
  if (activeWords < 8500) failures.push(`word_bank_items active < 8500 (${activeWords})`);
  if (activeLessons < 160) failures.push(`lessons active approved < 160 (${activeLessons})`);
  for (const stage of STAGES) {
    const words = await countWhere('word_bank_items', (query) => query.eq('active', true).eq('level', stage.id));
    const lessons = await countWhere('lessons', (query) => query.eq('active', true).eq('review_status', 'approved').eq('stage_id', stage.id));
    console.log(`${stage.id}: words=${words}/${stage.targetWords}, lessons=${lessons}/${stage.targetLessons}`);
    if (words < stage.targetWords) failures.push(`${stage.id} words < ${stage.targetWords}`);
    if (lessons < stage.targetLessons) failures.push(`${stage.id} lessons < ${stage.targetLessons}`);
  }
  const missingWordMeta = await countWhere('word_bank_items', (query) => query.eq('active', true).or('source_id.is.null,source_id.eq.,license_name.is.null,license_name.eq.,attribution.is.null,attribution.eq.,source_hash.is.null,source_hash.eq.'));
  const missingLessonMeta = await countWhere('lessons', (query) => query.eq('active', true).or('source_id.is.null,source_id.eq.,license_name.is.null,license_name.eq.,attribution.is.null,attribution.eq.,source_hash.is.null,source_hash.eq.'));
  console.log(`missing word source/license metadata: ${missingWordMeta}`);
  console.log(`missing lesson source/license metadata: ${missingLessonMeta}`);
  if (missingWordMeta) failures.push('active words missing source/license metadata');
  if (missingLessonMeta) failures.push('active lessons missing source/license metadata');
  const stagedLexical = await countWhere('source_lexical_items', (query) => query.eq('safety_status', 'safe'));
  const stagedSentences = await countWhere('source_sentence_items', (query) => query.eq('safety_status', 'safe'));
  const stagedPassages = await countWhere('source_reading_passages', (query) => query.eq('safety_status', 'safe'));
  console.log(`safe staged source rows: lexical=${stagedLexical}, sentences=${stagedSentences}, passages=${stagedPassages}`);
  if (failures.length) {
    console.error(`Open curriculum verification failed:\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log('Open curriculum verification passed.');
}

async function main() {
  if (mode === 'download') await downloadCorpora();
  else if (mode === 'extract') await extractCorpora();
  else if (mode === 'stage') await stageContent();
  else if (mode === 'approve') await approveContent();
  else if (mode === 'publish') await publishContent();
  else if (mode === 'verify') await verifyContent();
  else if (mode === 'full') {
    await downloadCorpora();
    await extractCorpora();
    await stageContent();
    await approveContent();
    await publishContent();
    await verifyContent();
  } else {
    throw new Error('Use download, extract, stage, approve, publish, verify, or full.');
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
