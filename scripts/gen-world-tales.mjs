// Generate kid-friendly English fairy tales / legends with Vietnamese
// translation, vocabulary, mini-games and (optionally) cute illustrations,
// then insert them into Supabase as UNPUBLISHED drafts for admin review.
//
// Pipeline per tale (target audience: learners ~12 years old, CEFR A2-B1):
//   1. Claude (opus) writes an engaging English retelling split into panels.
//   2. Claude (sonnet) translates each panel + vocabulary into Vietnamese.
//   3. (optional) Gemini generates a cute illustration per panel + a cover.
//   4. Assemble a Story object (tokens, games) and insert with published=false.
//
// Runs OFFLINE / manually only. Reads keys from .env.local:
//   CLAUDE_AUTH_TOKEN/CLAUDE_BASE_URL, gemini_keyN,
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Key values are never printed.
//
// Usage:
//   node scripts/gen-world-tales.mjs --limit=5            # first 5 tales, text only if no image keys
//   node scripts/gen-world-tales.mjs --limit=10 --images  # also generate illustrations
//   node scripts/gen-world-tales.mjs --only=cinderella,snow-white
//   node scripts/gen-world-tales.mjs --no-images          # force text-only (emoji placeholders)
//   node scripts/gen-world-tales.mjs --dry-run            # build but DON'T insert to DB
//   node scripts/gen-world-tales.mjs --start=10 --limit=5 # skip first 10, do next 5

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
dotenv.config({ path: join(ROOT, '.env.local') });
dotenv.config({ path: join(ROOT, '.env') });

const TALES_FILE = join(__dirname, 'data', 'world-tales.json');
const REPORT_DIR = join(__dirname, 'data', 'tales-output');

// Claude qua proxy (xapi.labpinky.com). Viết truyện bằng opus, dịch bằng sonnet.
const CLAUDE_AUTH_TOKEN = process.env.CLAUDE_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN;
const CLAUDE_BASE_URL = (process.env.CLAUDE_BASE_URL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
const CLAUDE_WRITE_MODEL = process.env.CLAUDE_WRITE_MODEL || 'kr/claude-opus-4.8';
const CLAUDE_TRANSLATE_MODEL = process.env.CLAUDE_TRANSLATE_MODEL || 'kr/claude-sonnet-4.6';
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const GEMINI_URL = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

// ----------------------------------------------------------------------------
// args
// ----------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: 5, start: 0, only: null, images: null, dryRun: false };
  for (const arg of args) {
    if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8)) || opts.limit;
    else if (arg.startsWith('--start=')) opts.start = Number(arg.slice(8)) || 0;
    else if (arg.startsWith('--only=')) opts.only = arg.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--images') opts.images = true;
    else if (arg === '--no-images') opts.images = false;
    else if (arg === '--dry-run') opts.dryRun = true;
  }
  return opts;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ----------------------------------------------------------------------------
// key loading (Gemini, rotated). Never prints values.
// ----------------------------------------------------------------------------
function loadGeminiKeys() {
  const keys = [];
  const seen = new Set();
  const push = (name, value) => {
    if (value && !seen.has(value)) {
      seen.add(value);
      keys.push({ name, value });
    }
  };
  push('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
  push('GOOGLE_API_KEY', process.env.GOOGLE_API_KEY);
  Object.keys(process.env)
    .filter((n) => /^gemini_key\d+$/i.test(n))
    .sort((a, b) => Number(a.match(/\d+$/)[0]) - Number(b.match(/\d+$/)[0]))
    .forEach((n) => push(n, process.env[n]));
  return keys;
}

// ----------------------------------------------------------------------------
// Groq helpers
// ----------------------------------------------------------------------------
function extractJson(content) {
  let s = content.trim();
  if (s.includes('```')) {
    const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) s = m[1].trim();
  }
  if (!s.startsWith('{') && !s.startsWith('[')) {
    const arr = s.indexOf('[');
    const obj = s.indexOf('{');
    const start = arr === -1 ? obj : obj === -1 ? arr : Math.min(arr, obj);
    if (start > 0) s = s.slice(start);
  }
  // Trim trailing junk after the last closing brace/bracket.
  const lastBrace = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (lastBrace > 0) s = s.slice(0, lastBrace + 1);
  return JSON.parse(s);
}

async function claudeJson({ system, user, model = CLAUDE_WRITE_MODEL, maxTokens = 4000, temperature = 0.7 }) {
  if (!CLAUDE_AUTH_TOKEN) throw new Error('CLAUDE_AUTH_TOKEN / ANTHROPIC_AUTH_TOKEN missing');

  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${CLAUDE_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': CLAUDE_AUTH_TOKEN,
          authorization: `Bearer ${CLAUDE_AUTH_TOKEN}`,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: `${system}\n\nReturn ONLY the JSON object, with no prose, no explanation, and no markdown fences.`,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (res.status === 429 || res.status === 529) {
        const wait = 4000 * attempt;
        process.stdout.write(` [claude ${res.status}, wait ${wait / 1000}s]`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`Claude HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        await sleep(1500 * attempt);
        continue;
      }
      const data = await res.json();
      const content = Array.isArray(data.content)
        ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
        : '';
      return extractJson(content);
    } catch (err) {
      lastErr = err;
      await sleep(1500 * attempt);
    }
  }
  throw lastErr || new Error('Claude failed');
}

// ----------------------------------------------------------------------------
// Step 1: write the English story (panels) + English vocab list
// ----------------------------------------------------------------------------
async function writeStory(tale) {
  const system = `You are a skilled children's storyteller and English teacher. You retell classic fairy tales and legends in English for learners around 12 years old (CEFR A2-B1).
Write an engaging, vivid retelling that keeps the heart of the original story. Each panel is ONE complete sentence of 12-20 words. Use natural, varied vocabulary and sentence structures (past tense narration, some compound/complex sentences, descriptive adjectives), but keep it clear and readable for a 12-year-old learner. Make it lively and emotionally engaging, not a dry summary. Keep content age-appropriate: convey danger or sadness gently, no graphic violence or gore.
Return ONLY valid JSON, no markdown, in this exact shape:
{
  "title_en": "string (an appealing English title)",
  "panels": ["sentence 1", "sentence 2", ... 8 to 10 single-sentence panels that tell the whole story from beginning to a satisfying end"],
  "vocabulary": ["word1", "word2", ... 8 to 10 useful, interesting single words drawn from the story, lowercase, no punctuation; prefer slightly challenging words a 12-year-old should learn over trivial ones like 'the' or 'is'"]
}
Rules: 8-10 panels, each exactly ONE sentence. Tell a complete narrative arc (setup, problem, climax, resolution). Vocabulary must be single words that actually appear in the panels.`;

  const user = `Retell the classic tale "${tale.title_en}" (origin: ${tale.origin}) as 8-10 engaging English sentences for ~12-year-old English learners. Topics: ${tale.topics.join(', ')}. Keep the story's well-known key moments.`;

  const data = await claudeJson({ system, user, model: CLAUDE_WRITE_MODEL, maxTokens: 2000, temperature: 0.8 });

  const panels = Array.isArray(data.panels)
    ? data.panels.map((p) => String(p).trim()).filter(Boolean).slice(0, 10)
    : [];
  const titleEn = String(data.title_en || tale.title_en).trim();
  const vocabRaw = Array.isArray(data.vocabulary) ? data.vocabulary : [];

  if (panels.length < 5) throw new Error(`story too short (${panels.length} panels)`);

  // Keep only vocab words that actually occur in the panels.
  const joined = panels.join(' ').toLowerCase();
  const vocab = [];
  const seen = new Set();
  for (const raw of vocabRaw) {
    const w = String(raw).toLowerCase().replace(/[^a-z'-]/g, '').trim();
    if (w && w.length > 2 && !seen.has(w) && joined.includes(w)) {
      seen.add(w);
      vocab.push(w);
    }
    if (vocab.length >= 10) break;
  }
  return { titleEn, panels, vocab };
}

// ----------------------------------------------------------------------------
// Step 1b: proofread the English so no typo/grammar error reaches learners.
// This is teaching material, so the English MUST be correct. Returns the same
// number of panels, only fixing spelling/grammar (no rewriting of meaning).
// ----------------------------------------------------------------------------
async function proofreadStory({ titleEn, panels, vocab }) {
  const system = `You are a meticulous English copy editor for children's learning material. Fix ALL spelling, grammar, punctuation, and word-choice errors so the English is flawless and natural. Do NOT change the meaning, do NOT add or remove sentences, do NOT make sentences longer or shorter than needed for correctness. Keep each panel as ONE sentence.
Return ONLY valid JSON in this exact shape:
{
  "title_en": "corrected title",
  "panels": ["corrected sentence 1", ... same count and order as input],
  "vocabulary": ["corrected word1", ... same count and order as input; each a single lowercase word]
}
The "panels" array MUST have exactly the same number of items as the input, in the same order.`;

  const user = `Proofread and correct this children's story. Keep the same number of panels and the same order.
Title: ${JSON.stringify(titleEn)}
Panels (${panels.length}): ${JSON.stringify(panels)}
Vocabulary (${vocab.length}): ${JSON.stringify(vocab)}`;

  let data;
  try {
    data = await claudeJson({ system, user, model: CLAUDE_WRITE_MODEL, maxTokens: 2000, temperature: 0.1 });
  } catch {
    return { titleEn, panels, vocab }; // proofreading is best-effort; never block the pipeline
  }

  const fixedPanels = Array.isArray(data.panels) && data.panels.length === panels.length
    ? data.panels.map((p, i) => {
        const s = String(p ?? '').trim();
        return s || panels[i];
      })
    : panels;

  const fixedTitle = String(data.title_en || titleEn).trim() || titleEn;

  // Re-validate vocab against the corrected panels so tokens still match.
  const joined = fixedPanels.join(' ').toLowerCase();
  const rawVocab = Array.isArray(data.vocabulary) && data.vocabulary.length ? data.vocabulary : vocab;
  const fixedVocab = [];
  const seen = new Set();
  for (const raw of rawVocab) {
    const w = String(raw).toLowerCase().replace(/[^a-z'-]/g, '').trim();
    if (w && w.length > 2 && !seen.has(w) && joined.includes(w)) {
      seen.add(w);
      fixedVocab.push(w);
    }
    if (fixedVocab.length >= 10) break;
  }

  return { titleEn: fixedTitle, panels: fixedPanels, vocab: fixedVocab.length ? fixedVocab : vocab };
}

// ----------------------------------------------------------------------------
// Step 2: translate title + panels + vocab to Vietnamese (one call)
// ----------------------------------------------------------------------------
async function translateStory({ titleEn, titleViFallback, panels, vocab }) {
  const system = `Bạn là dịch giả Anh-Việt cho nội dung học tiếng Anh của học sinh khoảng 12 tuổi (trình độ CEFR B1). Dịch tự nhiên, mạch lạc, đúng nghĩa, văn phong trong sáng và phù hợp lứa tuổi thiếu niên. Giữ đúng sắc thái câu chuyện, không thêm bớt ý.
Trả về DUY NHẤT một JSON hợp lệ, không kèm văn bản khác, dạng:
{ "title_vi": "string", "panels_vi": ["...", ...], "vocab_vi": ["...", ...] }
"panels_vi" phải có đúng số phần tử bằng số câu tiếng Anh. "vocab_vi" phải có đúng số phần tử bằng số từ vựng. Mỗi "vocab_vi" là nghĩa tiếng Việt ngắn gọn của từ tương ứng. Giữ nguyên thứ tự.`;

  const user = `Dịch sang tiếng Việt.
Tiêu đề: ${JSON.stringify(titleEn)}
Các câu (${panels.length}): ${JSON.stringify(panels)}
Từ vựng (${vocab.length}): ${JSON.stringify(vocab)}`;

  const data = await claudeJson({ system, user, model: CLAUDE_TRANSLATE_MODEL, maxTokens: 3000, temperature: 0.3 });

  const titleVi = String(data.title_vi || titleViFallback || '').trim() || titleViFallback;
  const panelsVi = panels.map((_, i) => {
    const v = Array.isArray(data.panels_vi) ? data.panels_vi[i] : '';
    return typeof v === 'string' ? v.trim() : '';
  });
  const vocabVi = vocab.map((_, i) => {
    const v = Array.isArray(data.vocab_vi) ? data.vocab_vi[i] : '';
    return typeof v === 'string' ? v.trim() : '';
  });
  return { titleVi, panelsVi, vocabVi };
}

// ----------------------------------------------------------------------------
// Step 3: tokenize an English sentence (mirror useStoryForm.parseTokens)
// ----------------------------------------------------------------------------
function lemmatize(word) {
  const w = word.toLowerCase();
  if (w.endsWith('ing')) return w.slice(0, -3);
  if (w.endsWith('ed')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function parseTokens(sentence, vocabMap) {
  const parts = sentence.split(/(\s+|(?=[.,!?])|(?<=[.,!?]))/).filter((w) => w.trim());
  return parts.map((word) => {
    const norm = word.replace(/[.,!?]/g, '').toLowerCase();
    const lemma = lemmatize(norm);
    const vi = vocabMap.get(norm) || vocabMap.get(lemma);
    return { display: word, norm, lemma, vi };
  });
}

// ----------------------------------------------------------------------------
// Step 4 (optional): generate a cute illustration via Gemini (rotated keys)
// ----------------------------------------------------------------------------
const EMOJI_POOL = ['🦊', '🐻', '🐰', '🌳', '🏰', '🌟', '🌈', '🦋', '🐸', '👑', '🌸', '🐭', '🐺', '🦢', '🍎'];

async function generateImage({ prompt, keys, keyState }) {
  if (!keys.length) return null;
  // Try each key starting from the current rotation cursor.
  for (let i = 0; i < keys.length; i++) {
    const idx = (keyState.cursor + i) % keys.length;
    const { value } = keys[idx];
    if (keyState.dead.has(idx)) continue;
    try {
      const res = await fetch(GEMINI_URL(GEMINI_IMAGE_MODEL, value), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      });
      if (res.status === 429 || res.status === 401 || res.status === 403) {
        keyState.dead.add(idx);
        continue;
      }
      if (!res.ok) continue;
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p) => p.inlineData?.data);
      if (imgPart) {
        const mime = imgPart.inlineData.mimeType || 'image/png';
        keyState.cursor = (idx + 1) % keys.length; // round-robin to spread load
        return `data:${mime};base64,${imgPart.inlineData.data}`;
      }
    } catch {
      // try next key
    }
  }
  return null;
}

const IMAGE_STYLE =
  'Soft, cute 2D storybook illustration for young children, warm pastel colors, rounded friendly shapes, gentle lighting, picture-book style, no text, no words, no letters, no watermark.';

// ----------------------------------------------------------------------------
// assemble Story object matching src/types Story
// ----------------------------------------------------------------------------
function buildStory({ id, titleEn, titleVi, topics, panels, panelsVi, panelImages, vocab, vocabVi }) {
  const vocabMap = new Map();
  vocab.forEach((w, i) => {
    if (vocabVi[i]) vocabMap.set(w.toLowerCase(), vocabVi[i]);
  });

  const storyPanels = panels.map((sentence, i) => ({
    panel_id: i + 1,
    image: panelImages[i] || EMOJI_POOL[i % EMOJI_POOL.length],
    image_alt: titleEn + ' - panel ' + (i + 1),
    sentence_en: sentence,
    sentence_vi: panelsVi[i] || '',
    tokens: parseTokens(sentence, vocabMap),
  }));

  const vocabulary = vocab
    .map((w, i) => ({ word: w, vi: vocabVi[i] || '', ipa: '' }))
    .filter((v) => v.vi);

  const fillBlank = panels.slice(0, 3).map((sentence) => {
    const words = sentence.split(' ').filter((w) => w.replace(/[.,!?]/g, '').length > 3);
    const answerWord = words[Math.floor(words.length / 2)] || words[0] || 'word';
    const cleanAnswer = answerWord.replace(/[.,!?]/g, '');
    return {
      sentence_en: sentence.replace(answerWord, '___'),
      answer: cleanAnswer,
      choices: [cleanAnswer, 'good', 'happy'].sort(() => Math.random() - 0.5),
    };
  });

  return {
    id,
    title_en: titleEn,
    title_vi: titleVi,
    level: 'Elementary',
    topics,
    cover_image: panelImages.cover || panelImages[0] || '🏰',
    estimated_minutes: Math.max(1, Math.ceil(storyPanels.length * 0.5)),
    published: false, // draft -> admin review
    panels: storyPanels,
    vocabulary,
    games: {
      match: vocabulary.slice(0, 6).map((v) => ({ word: v.word, vi: v.vi })),
      fill_blank: fillBlank,
    },
  };
}

// ----------------------------------------------------------------------------
// Supabase: store base64 images to storage, then insert story (published=false)
// ----------------------------------------------------------------------------
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service credentials missing');
  return createClient(url, serviceKey, {
    global: { fetch: (u, o) => fetch(u, { ...o, cache: 'no-store' }) },
  });
}

const STORY_IMAGE_BUCKET = process.env.STORY_IMAGE_BUCKET || 'story-images';

async function uploadImage(supabase, dataUrl, storyId, role) {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return dataUrl;
  const mime = m[1].toLowerCase();
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime] || 'png';
  const bytes = Buffer.from(m[2], 'base64');
  const objectKey = `${storyId}/${role}-${Date.now()}.${ext}`;
  await supabase.storage.createBucket(STORY_IMAGE_BUCKET, { public: true }).catch(() => {});
  const { error } = await supabase.storage
    .from(STORY_IMAGE_BUCKET)
    .upload(objectKey, bytes, { contentType: mime, cacheControl: '31536000', upsert: true });
  if (error) {
    console.warn(`   image upload failed (${role}): ${error.message}`);
    return dataUrl;
  }
  return supabase.storage.from(STORY_IMAGE_BUCKET).getPublicUrl(objectKey).data.publicUrl;
}

async function persistStory(supabase, story) {
  const storedPanels = await Promise.all(
    story.panels.map(async (panel, i) => ({
      ...panel,
      image: panel.image.startsWith('data:image/')
        ? await uploadImage(supabase, panel.image, story.id, `panel-${i + 1}`)
        : panel.image,
    })),
  );
  const cover = story.cover_image.startsWith('data:image/')
    ? await uploadImage(supabase, story.cover_image, story.id, 'cover')
    : story.cover_image;

  const finalStory = { ...story, cover_image: cover, panels: storedPanels, curriculum_stage_id: 'a2-key' };

  const { error } = await supabase.from('stories').upsert(finalStory, { onConflict: 'id' });
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  return finalStory;
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------
async function main() {
  const opts = parseArgs();
  const tales = JSON.parse(await readFile(TALES_FILE, 'utf8'));
  const geminiKeys = loadGeminiKeys();

  // Decide whether to attempt images: explicit flag wins, else auto if keys exist.
  const wantImages = opts.images === null ? geminiKeys.length > 0 : opts.images;
  const keyState = { cursor: 0, dead: new Set() };

  let selected = tales;
  if (opts.only) {
    selected = tales.filter((t) => opts.only.includes(slugify(t.title_en)));
  } else {
    selected = tales.slice(opts.start, opts.start + opts.limit);
  }

  console.log(`World tales pipeline`);
  console.log(`  tales selected : ${selected.length}`);
  console.log(`  images         : ${wantImages ? `yes (${geminiKeys.length} key candidates)` : 'no (emoji placeholders)'}`);
  console.log(`  mode           : ${opts.dryRun ? 'DRY RUN (no DB write)' : 'insert as drafts (published=false)'}`);
  console.log('');

  const supabase = opts.dryRun ? null : getSupabase();
  await mkdir(REPORT_DIR, { recursive: true });

  const results = [];
  for (let n = 0; n < selected.length; n++) {
    const tale = selected[n];
    const id = `tale-${slugify(tale.title_en)}`;
    process.stdout.write(`[${n + 1}/${selected.length}] ${tale.title_en} (${id})`);

    try {
      const draft = await writeStory(tale);
      process.stdout.write(` · ${draft.panels.length} panels`);

      const { titleEn, panels, vocab } = await proofreadStory(draft);
      process.stdout.write(` · proofread`);

      const { titleVi, panelsVi, vocabVi } = await translateStory({
        titleEn,
        titleViFallback: tale.title_vi,
        panels,
        vocab,
      });
      process.stdout.write(` · translated`);

      const panelImages = {};
      if (wantImages && keyState.dead.size < geminiKeys.length) {
        process.stdout.write(` · images`);
        const coverPrompt = `${IMAGE_STYLE} Cover illustration for the children's story "${titleEn}". A single charming scene that captures the tale.`;
        const cover = await generateImage({ prompt: coverPrompt, keys: geminiKeys, keyState });
        if (cover) panelImages.cover = cover;
        for (let i = 0; i < panels.length; i++) {
          if (keyState.dead.size >= geminiKeys.length) break;
          const prompt = `${IMAGE_STYLE} Illustrate this scene from a children's story: "${panels[i]}".`;
          const img = await generateImage({ prompt, keys: geminiKeys, keyState });
          if (img) panelImages[i] = img;
          process.stdout.write(img ? '+' : '.');
        }
      }

      const story = buildStory({
        id,
        titleEn,
        titleVi,
        topics: tale.topics,
        panels,
        panelsVi,
        panelImages,
        vocab,
        vocabVi,
      });

      if (!opts.dryRun) {
        await persistStory(supabase, story);
        process.stdout.write(` · saved draft`);
      }

      // Write a local copy for inspection regardless of mode.
      await writeFile(join(REPORT_DIR, `${id}.json`), JSON.stringify(story, null, 2));
      console.log(' ✓');
      results.push({ id, ok: true, panels: panels.length, hadImages: Object.keys(panelImages).length });
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      results.push({ id, ok: false, error: err.message });
    }

    // gentle pacing between tales for Groq rate limits
    await sleep(1200);
  }

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  console.log('');
  console.log(`Done. ${ok.length} ok, ${failed.length} failed.`);
  if (failed.length) failed.forEach((f) => console.log(`  ✗ ${f.id}: ${f.error}`));
  console.log(`Local copies: scripts/data/tales-output/`);
  if (!opts.dryRun) console.log(`Review drafts in /admin (they are unpublished).`);

  await writeFile(
    join(REPORT_DIR, '_run-report.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), opts, results }, null, 2),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
