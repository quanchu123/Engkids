#!/usr/bin/env node
// Rebuild curriculum_units + lessons + lesson_steps from the CLEAN word_bank_items
// (CEFR-J / Octanove / seed) instead of the old WordNet staging table.
//
//   node scripts/rebuild-lessons-from-wordbank.mjs --dry     # plan only, no writes
//   node scripts/rebuild-lessons-from-wordbank.mjs --apply   # write units/lessons/steps
//
// Examples come from approved Tatoeba sentences already staged in
// source_sentence_items. Reading passages from source_reading_passages.
// Old builder lessons not regenerated are deactivated (active=false), never deleted.

import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const DRY = process.argv.includes('--dry');
const APPLY = process.argv.includes('--apply');

const STAGES = [
  { id: 'a2-key', label: 'A2 Key', minutes: 18, mode: 'kid' },
  { id: 'b1-preliminary', label: 'B1 Preliminary', minutes: 24, mode: 'kid' },
  { id: 'b2-first', label: 'B2 First', minutes: 30, mode: 'teen' },
  { id: 'c1-advanced', label: 'C1 Advanced', minutes: 35, mode: 'teen' },
];

const WORDS_PER_LESSON = 9;
const MAX_LESSONS_PER_TOPIC = 8;
const TARGET_LESSONS_PER_STAGE = 40; // match the original curriculum size
const MIN_WORDS_PER_TOPIC = WORDS_PER_LESSON; // need at least one full lesson
const GENERAL_LESSONS_PER_UNIT = 8; // split the big "general" bucket into units of this many lessons

const TOPIC_KEYWORDS = [
  ['school', ['school', 'student', 'teacher', 'class', 'lesson', 'learn', 'study', 'book', 'exam', 'write', 'read', 'pencil', 'homework']],
  ['daily life', ['home', 'family', 'friend', 'food', 'room', 'house', 'day', 'morning', 'evening', 'shop', 'money', 'clothes', 'kitchen']],
  ['travel', ['travel', 'train', 'bus', 'car', 'road', 'city', 'hotel', 'ticket', 'journey', 'airport', 'map', 'trip']],
  ['health', ['health', 'body', 'doctor', 'pain', 'sleep', 'sport', 'exercise', 'medicine', 'safe', 'hospital', 'nurse']],
  ['technology', ['computer', 'data', 'digital', 'machine', 'device', 'internet', 'software', 'system', 'technology', 'phone', 'screen']],
  ['science', ['science', 'energy', 'plant', 'animal', 'water', 'earth', 'space', 'measure', 'research', 'nature', 'weather']],
  ['society', ['people', 'community', 'culture', 'public', 'law', 'government', 'history', 'social', 'country', 'world']],
  ['communication', ['say', 'tell', 'speak', 'talk', 'voice', 'message', 'letter', 'language', 'explain', 'word', 'answer', 'question']],
  ['arts', ['music', 'art', 'story', 'picture', 'film', 'design', 'paint', 'creative', 'dance', 'song', 'draw']],
];

const BLOCKLIST = new Set([
  'abuse', 'adult', 'alcohol', 'assault', 'blood', 'bomb', 'cocaine', 'crime', 'drug', 'drunk', 'erotic', 'gamble', 'gun', 'kill', 'murder', 'nude', 'opium', 'porn', 'rape', 'sex', 'suicide', 'tobacco', 'weapon',
]);

// Synthetic adjective+noun phrases (e.g. "big car", "closed apple") with broken
// machine VI. Same prefixes the game refuses via SYNTHETIC_PHRASE_PREFIX_RE.
const SYNTHETIC_PHRASE = /^(red|blue|green|yellow|black|white|pink|brown|big|small|hot|cold|open|closed|clean|dirty|quiet|fast|slow|brave|careful|creative|crowded|helpful|healthy|important|possible|responsible|successful|useful)\s+/i;

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
function topicFor(en) {
  const lower = ` ${normalizeText(en).toLowerCase()} `;
  for (const [topic, keys] of TOPIC_KEYWORDS) {
    if (keys.some((key) => lower.includes(` ${key} `))) return topic;
  }
  return 'general';
}
function titleCase(value) {
  return String(value).split(' ').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
// Kid-friendly Vietnamese label for each WordNet-derived topic key. The DB keeps
// the stable English topic key; this only controls how unit/lesson titles READ
// to a Vietnamese child. Anything unmapped falls back to the title-cased key.
const TOPIC_VI = {
  'food and drinks': 'Đồ ăn & thức uống',
  'animals': 'Động vật',
  'plants and trees': 'Cây cối & thiên nhiên',
  'body and health': 'Cơ thể & sức khỏe',
  'people and family': 'Con người & gia đình',
  'society and groups': 'Cộng đồng & xã hội',
  'language and communication': 'Ngôn ngữ & giao tiếp',
  'places': 'Địa điểm & nơi chốn',
  'time and calendar': 'Thời gian & lịch',
  'feelings and emotions': 'Cảm xúc',
  'things and objects': 'Đồ vật quanh em',
  'nature and the world': 'Thế giới tự nhiên',
  'thinking and ideas': 'Suy nghĩ & ý tưởng',
  'movement and travel': 'Di chuyển & du lịch',
  'money and shopping': 'Tiền & mua sắm',
  'weather and nature': 'Thời tiết',
  'art and making': 'Nghệ thuật & sáng tạo',
  'sports and games': 'Thể thao & trò chơi',
  'activities and events': 'Hoạt động & sự kiện',
  'actions': 'Hành động',
  'social actions': 'Hành động xã hội',
  'states and being': 'Trạng thái',
  'senses and perception': 'Giác quan',
  'qualities and descriptions': 'Tính chất & miêu tả',
  'descriptions': 'Từ miêu tả',
  'manner words': 'Từ chỉ cách thức',
  'numbers and measure': 'Số & đo lường',
  'shapes': 'Hình dạng',
  'materials': 'Chất liệu',
  'daily life': 'Cuộc sống hằng ngày',
  'school': 'Trường học',
  'technology': 'Công nghệ',
  'general': 'Tổng hợp',
};
function topicVi(topic) {
  const base = String(topic || '').replace(/\s+\d+$/, ''); // strip "general 2" suffix
  const num = String(topic || '').match(/\s+(\d+)$/);
  const vi = TOPIC_VI[base] || titleCase(base);
  return num ? `${vi} ${num[1]}` : vi;
}
function lessonObjective(stageId, topic) {
  if (stageId === 'a2-key') return `Học từ vựng ${topic}, đọc câu ngắn và tạo câu trả lời rõ ràng.`;
  if (stageId === 'b1-preliminary') return `Dùng từ vựng ${topic} để hiểu ý chính và viết đoạn ngắn có lý do.`;
  if (stageId === 'b2-first') return `Phân tích nội dung ${topic}, so sánh ý tưởng và diễn đạt quan điểm có ví dụ.`;
  return `Tóm tắt, đánh giá và trình bày ý kiến chính xác về chủ đề ${topic}.`;
}
function difficultyForStage(stageId) {
  return stageId === 'a2-key' ? 2.5 : stageId === 'b1-preliminary' ? 4.5 : stageId === 'b2-first' ? 6.5 : 8;
}
function ageBandForStage(stageId) {
  return stageId === 'a2-key' ? '9-13' : stageId === 'b1-preliminary' ? '11-15' : stageId === 'b2-first' ? '13-16' : '14+';
}
function outputForStage(stageId) {
  if (stageId === 'a2-key') return 'Short sentence or message using target vocabulary.';
  if (stageId === 'b1-preliminary') return 'Short paragraph, email, or spoken opinion with reasons.';
  if (stageId === 'b2-first') return 'Structured comparison or opinion with examples.';
  return 'Summary, evaluation, or presentation-style response.';
}
function skillForStep(stepType) {
  if (stepType === 'reading') return 'reading';
  if (stepType === 'speaking') return 'speaking';
  if (stepType === 'writing') return 'writing';
  if (stepType === 'grammar') return 'use-of-english';
  return 'vocabulary';
}

// Pure helpers that MUST stay in lock-step with the client-side contract in
// src/lib/sentence-blank.ts (deriveBlank) and src/components/lessons/
// WordBankBuild.tsx (pickSentence). Scripts can't import the TS modules, so the
// logic is duplicated here and guarded by the shared test contract. The
// renderers tolerate BOTH precomputed payloads (preferred) and deriving these
// client-side from the raw sentences, so a generator run is decoupled from
// deploy and never required.
function normalizeBlankWord(word) {
  return String(word)
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, '')
    .trim();
}

function deriveBlankForGen(sentence, targetWords) {
  const text = String(sentence).trim();
  if (!text) return null;
  const targets = new Set(
    targetWords.map((w) => normalizeBlankWord(w)).filter((w) => w.length >= 3),
  );
  if (targets.size === 0) return null;
  const tokens = text.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^\s+$/.test(token) || token === '') continue;
    const key = normalizeBlankWord(token);
    if (key && targets.has(key)) {
      return {
        before: tokens.slice(0, i).join('').trimEnd(),
        after: tokens.slice(i + 1).join('').trimStart(),
        answer: key,
      };
    }
  }
  return null;
}

function pickBuildSentence(sentences) {
  for (const s of sentences) {
    const tokens = String(s).trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    if (tokens.length >= 3 && tokens.length <= 8) return tokens;
  }
  return null;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchAll(sb, table, select, configure = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(select).range(from, from + 999);
    q = configure(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function chunked(rows, size, fn) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

function buildExampleMap(sentences) {
  const map = new Map();
  for (const s of sentences) {
    for (const word of new Set(wordsIn(s.text))) {
      if (!map.has(word)) map.set(word, s);
    }
  }
  return map;
}

async function main() {
  const sb = getSupabaseAdmin();

  // 1. Clean vocabulary (CEFR + seed), active only, exclude any leftover wordnet.
  const words = await fetchAll(sb, 'word_bank_items', 'en,en_lower,vi,level,topic,part_of_speech,example,source', (q) =>
    q.eq('active', true).neq('source', 'wordnet-princeton-lexical'));

  // 2. Tatoeba example sentences + Gutenberg passages (already approved + safe).
  const sentences = await fetchAll(sb, 'source_sentence_items', 'text,level,source_url,attribution', (q) =>
    q.eq('safety_status', 'safe').in('review_status', ['approved', 'imported']));
  const passages = await fetchAll(sb, 'source_reading_passages', 'title,author,text,source_url,level', (q) =>
    q.eq('safety_status', 'safe').in('review_status', ['approved', 'imported']));

  const stamp = new Date().toISOString();
  const sourceMeta = {
    source_id: 'engkids-open-curriculum-builder',
    source_url: 'https://engkids.local/open-curriculum-builder',
    attribution: 'Engkids lesson templates over CEFR-J / Octanove vocabulary with Tatoeba examples.',
    license_name: 'Generated lesson shell from approved CEFR-rated rows',
    license_url: 'https://engkids.local/open-curriculum-builder',
  };

  const units = [];
  const lessons = [];
  const steps = [];
  const keptLessonIds = new Set();
  const planSummary = {};

  for (const stage of STAGES) {
    const stageWords = words
      .filter((w) => w.level === stage.id)
      .filter((w) => /^[a-z][a-z'-]{2,}( [a-z][a-z'-]+)?$/.test(String(w.en || '').toLowerCase()))
      .filter((w) => !hasBlockedContent(w.en))
      .filter((w) => !(SYNTHETIC_PHRASE.test(w.en) && w.en.includes(' ')))
      .filter((w) => String(w.vi || '').trim());
    const stageSentences = sentences.filter((s) => s.level === stage.id && !hasBlockedContent(s.text));
    const stagePassages = passages.filter((p) => p.level === stage.id && !hasBlockedContent(p.text));
    const exampleMap = buildExampleMap(stageSentences);

    // Group by the word's OWN curated topic (the clean bank assigns a coherent
    // theme per word). Only fall back to keyword inference when a row has no
    // topic. Previously this always re-derived via topicFor(w.en), which —
    // combined with the A->Z sort below — produced lessons of same-letter words
    // (ability, about, abroad...) instead of themed sets.
    const buckets = new Map();
    for (const w of stageWords) {
      const t = (String(w.topic || '').trim().toLowerCase()) || topicFor(w.en);
      if (!buckets.has(t)) buckets.set(t, []);
      buckets.get(t).push(w);
    }
    // Keyword topics with enough words (biggest first), then split the large
    // 'general' bucket into numbered sub-units so we reach ~targetLessons/stage
    // instead of wasting thousands of words under a single 7-lesson cap.
    const general = buckets.get('general') || [];
    // Order topics so a child opening the roadmap meets CONCRETE, appealing
    // themes first (food, animals, body, family, weather, sports...) and the
    // abstract grammar buckets (adjectives->"descriptions", adverbs->"manner
    // words", "states and being", ...) come LAST. WordNet can't tell us a given
    // adjective belongs to "food", so those words legitimately have no concrete
    // theme; we don't fabricate one, we just sink them to the end. Within the
    // same priority tier, bigger buckets first.
    const TOPIC_PRIORITY = [
      'food and drinks', 'animals', 'plants and trees', 'body and health',
      'people and family', 'weather and nature', 'sports and games',
      'movement and travel', 'places', 'food', 'art and making',
      'money and shopping', 'time and calendar', 'feelings and emotions',
      'school', 'technology', 'daily life', 'nature and the world',
      'society and groups', 'language and communication', 'senses and perception',
      'numbers and measure', 'shapes', 'materials', 'activities and events',
      'social actions', 'actions', 'thinking and ideas', 'things and objects',
      'states and being', 'qualities and descriptions', 'manner words', 'descriptions',
    ];
    const rankOf = (t) => {
      const i = TOPIC_PRIORITY.indexOf(t);
      return i === -1 ? TOPIC_PRIORITY.length : i;
    };
    const namedTopics = [...buckets.entries()]
      .filter(([t]) => t !== 'general')
      .filter(([, arr]) => arr.length >= MIN_WORDS_PER_TOPIC)
      .sort((a, b) => {
        const ra = rankOf(a[0]);
        const rb = rankOf(b[0]);
        if (ra !== rb) return ra - rb;
        return b[1].length - a[1].length;
      });

    let chosen = [...namedTopics];
    // Split 'general' into chunks of (MAX_LESSONS_PER_TOPIC * WORDS_PER_LESSON)
    // so each chunk becomes its own unit ("general 1", "general 2", ...).
    const chunkWords = MAX_LESSONS_PER_TOPIC * WORDS_PER_LESSON;
    if (general.length >= MIN_WORDS_PER_TOPIC) {
      const sortedGeneral = [...general].sort((a, b) => a.en.localeCompare(b.en));
      let part = 0;
      for (let off = 0; off < sortedGeneral.length; off += chunkWords) {
        const slice = sortedGeneral.slice(off, off + chunkWords);
        if (slice.length < MIN_WORDS_PER_TOPIC) break;
        part += 1;
        chosen.push([`general ${part}`, slice]);
      }
    }
    if (chosen.length === 0) chosen = [['general 1', stageWords]];

    planSummary[stage.id] = { words: stageWords.length, sentences: stageSentences.length, topics: {} };

    let lessonNum = 0;
    let sentCursor = 0;
    for (const [topicIndex, [topic, topicWords]] of chosen.entries()) {
      if (lessonNum >= TARGET_LESSONS_PER_STAGE) break; // cap stage at ~40 lessons
      const unitId = `${stage.id}-open-${slug(topic)}`;
      const sorted = [...topicWords].sort((a, b) => a.en.localeCompare(b.en));
      const remaining = TARGET_LESSONS_PER_STAGE - lessonNum;
      const lessonCount = Math.min(MAX_LESSONS_PER_TOPIC, remaining, Math.floor(sorted.length / WORDS_PER_LESSON));
      if (lessonCount === 0) continue;

      planSummary[stage.id].topics[topic] = lessonCount;

      units.push({
        id: unitId,
        stage_id: stage.id,
        title_vi: `${stage.label}: ${topicVi(topic)}`,
        theme: topic,
        target_skills: ['vocabulary', 'reading', 'writing'],
        sort_order: 100 + topicIndex,
        source_id: sourceMeta.source_id,
        license_status: 'open-license',
        source_hash: sha256(`cefr-unit:${stage.id}:${topic}`),
        imported_at: stamp,
        review_status: 'approved',
        cefr_level: stage.id,
        can_do_statement: `Complete a ${stage.label} sequence about ${topic}.`,
        difficulty_score: difficultyForStage(stage.id),
        age_band: ageBandForStage(stage.id),
        quality_status: 'approved',
        safety_status: 'safe',
        cefr_reason: 'Unit grouped by CEFR-rated vocabulary theme.',
        active: true,
        ...sourceMeta,
      });

      for (let li = 0; li < lessonCount; li += 1) {
        lessonNum += 1;
        const pack = sorted.slice(li * WORDS_PER_LESSON, li * WORDS_PER_LESSON + WORDS_PER_LESSON);
        if (pack.length < WORDS_PER_LESSON) break;
        const lessonId = `${stage.id}-open-lesson-${String(lessonNum).padStart(2, '0')}`;
        keptLessonIds.add(lessonId);

        // Sentence pack for THIS lesson: use each pack word's OWN example
        // sentence (it provably contains that word), so reading + grammar align
        // with the words being taught. Fall back to a stage Tatoeba sentence
        // that contains the word, then to any stage sentence, so we always have
        // material. This is the fix for reading/grammar being unrelated to the
        // lesson vocabulary (0% word-overlap, 100% empty grammar blanks before).
        const sentPack = [];
        const sentSeen = new Set();
        for (const w of pack) {
          const wl = String(w.en || '').toLowerCase();
          let picked = null;
          const own = String(w.example || '').trim();
          if (own && wordsIn(own).includes(wl)) {
            picked = { text: own, source_url: w.source || 'https://en.wiktionary.org/', attribution: 'CEFR-J / Octanove vocabulary profiles.' };
          }
          if (!picked) {
            const t = exampleMap.get(wl);
            if (t) picked = t;
          }
          if (picked && !sentSeen.has(picked.text)) {
            sentSeen.add(picked.text);
            sentPack.push(picked);
          }
          if (sentPack.length >= 3) break;
        }
        // Top up to 3 from stage sentences if some words had no usable example.
        for (let k = 0; sentPack.length < 3 && k < stageSentences.length; k += 1) {
          const cand = stageSentences[(sentCursor + k) % stageSentences.length];
          if (cand && !sentSeen.has(cand.text)) { sentSeen.add(cand.text); sentPack.push(cand); }
        }
        sentCursor += 3;
        const passage = stagePassages.length ? stagePassages[(lessonNum - 1) % stagePassages.length] : null;
        const contentHash = sha256(`${lessonId}:${pack.map((w) => w.en).join(',')}`);

        lessons.push({
          id: lessonId,
          unit_id: unitId,
          stage_id: stage.id,
          title_vi: `${stage.label} · Bài ${String(lessonNum).padStart(2, '0')}: ${topicVi(topic)}`,
          title_en: `${stage.label} Lesson ${String(lessonNum).padStart(2, '0')}: ${titleCase(topic)}`,
          objective_vi: lessonObjective(stage.id, topic),
          cefr: stage.label,
          estimated_minutes: stage.minutes,
          skill_focus: ['vocabulary', 'reading', lessonNum % 2 === 0 ? 'writing' : 'speaking'],
          sort_order: 1000 + lessonNum,
          source_id: sourceMeta.source_id,
          license_status: 'open-license',
          source_hash: contentHash,
          imported_at: stamp,
          review_status: 'approved',
          cefr_level: stage.id,
          can_do_statement: lessonObjective(stage.id, topic),
          expected_output: outputForStage(stage.id),
          rubric: ['clear meaning', 'level-appropriate vocabulary', 'complete response'],
          learning_mode: stage.mode,
          difficulty_score: difficultyForStage(stage.id),
          age_band: ageBandForStage(stage.id),
          quality_status: 'approved',
          safety_status: 'safe',
          cefr_reason: 'Lesson built from CEFR-rated vocabulary, skill focus, and Tatoeba examples.',
          active: true,
          ...sourceMeta,
        });

        const attribution = [...new Set(['CEFR-J / Octanove vocabulary profiles.', ...sentPack.map((s) => s.attribution), passage ? 'Project Gutenberg.' : null].filter(Boolean))];
        const base = { stageId: stage.id, topic, attribution, license: 'CEFR-rated rows approved in Engkids source review.' };
        // Precompute the active-exercise data so the client doesn't have to
        // derive it (renderers still fall back to deriving from `sentences` when
        // these are absent). grammar -> fill-in-the-blank; reading -> word-build.
        // Grammar blanks target the lesson's OWN words. Because each sentPack
        // sentence is a pack word's example, every sentence yields a blank.
        const grammarFocus = pack.map((w) => w.en);
        const grammarSentences = sentPack.map((s) => s.text);
        const blanks = grammarSentences
          .map((text) => {
            const b = deriveBlankForGen(text, grammarFocus);
            return b ? { sentence: text, before: b.before, after: b.after, answer: b.answer } : null;
          })
          .filter(Boolean)
          .slice(0, 5);
        const buildTokens = pickBuildSentence(sentPack.map((s) => s.text));
        const stepRows = [
          ['warmup', 'Khởi động từ khóa', 'Đọc nhanh các từ và chọn từ đã biết.', { ...base, words: pack.slice(0, 5).map((w) => w.en) }],
          ['vocab', 'Từ vựng CEFR', 'Ghép từ với nghĩa tiếng Việt và chú ý loại từ.', { ...base, items: pack.map((w) => ({ en: w.en, vi: w.vi, pos: w.part_of_speech, example: exampleMap.get(w.en.toLowerCase())?.text || w.example || '' })) }],
          ['reading', passage ? 'Đọc đoạn văn miễn phí bản quyền' : 'Đọc câu ví dụ Tatoeba', 'Tìm ý chính và từ khóa trong ngữ liệu.', { ...base, passage: passage ? { title: passage.title, author: passage.author, text: passage.text, sourceUrl: passage.source_url } : null, sentences: sentPack.map((s) => ({ text: s.text, sourceUrl: s.source_url })), build: buildTokens ? { tokens: buildTokens } : null }],
          ['grammar', 'Mau cau va cach noi', 'Quan sat cach tu duoc dung trong cau va tao mot cau moi.', { ...base, focusWords: grammarFocus, sentences: grammarSentences, blanks }],
          [lessonNum % 2 === 0 ? 'writing' : 'speaking', lessonNum % 2 === 0 ? 'Viet output ngan' : 'Noi output ngan', 'Dung tu da hoc de tao output phu hop level.', { ...base, prompt: `Use at least three words from this ${stage.label} pack to talk about ${topic}.`, requiredWords: pack.slice(0, 6).map((w) => w.en) }],
          ['quiz', 'Mini checkpoint', 'Trả lời nhanh để kiểm tra từ và nghĩa.', { ...base, questions: pack.slice(0, 5).map((w) => ({ type: 'meaning-check', word: w.en, answer: w.vi })) }],
        ];
        stepRows.forEach(([stepType, titleVi, instructionVi, payload], stepIndex) => {
          steps.push({
            lesson_id: lessonId,
            step_type: stepType,
            title_vi: titleVi,
            instruction_vi: instructionVi,
            payload,
            sort_order: stepIndex + 1,
            source_id: sourceMeta.source_id,
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
  }

  console.log('Plan:', JSON.stringify(planSummary, null, 2));
  console.log(`Totals: units=${units.length}, lessons=${lessons.length}, steps=${steps.length}`);

  if (DRY || !APPLY) {
    console.log(DRY ? 'DRY run — no writes.' : 'Pass --apply to write (or --dry to plan).');
    return;
  }

  // Upsert units + lessons.
  await chunked(units, 100, async (chunk) => {
    const { error } = await sb.from('curriculum_units').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`curriculum_units: ${error.message}`);
  });
  await chunked(lessons, 100, async (chunk) => {
    const { error } = await sb.from('lessons').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`lessons: ${error.message}`);
  });
  // Replace steps for regenerated lessons.
  const keptIds = [...keptLessonIds];
  await chunked(keptIds, 100, async (chunk) => {
    const { error } = await sb.from('lesson_steps').delete().in('lesson_id', chunk);
    if (error) throw new Error(`lesson_steps delete: ${error.message}`);
  });
  await chunked(steps, 300, async (chunk) => {
    const { error } = await sb.from('lesson_steps').insert(chunk);
    if (error) throw new Error(`lesson_steps insert: ${error.message}`);
  });

  // Deactivate old builder lessons NOT regenerated (stale WordNet-based).
  const oldLessons = await fetchAll(sb, 'lessons', 'id', (q) =>
    q.eq('source_id', 'engkids-open-curriculum-builder').eq('active', true));
  const stale = oldLessons.map((l) => l.id).filter((id) => !keptLessonIds.has(id));
  if (stale.length) {
    await chunked(stale, 100, async (chunk) => {
      const { error } = await sb.from('lessons').update({ active: false }).in('id', chunk);
      if (error) throw new Error(`deactivate stale lessons: ${error.message}`);
    });
  }
  console.log(`Done. units=${units.length}, lessons=${lessons.length}, steps=${steps.length}, deactivated stale=${stale.length}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
