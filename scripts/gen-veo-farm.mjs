// Generate short milestone cutscene clips for the English Farm game using the
// Gemini API (Veo text-to-video). The game auto-plays
// public/games/english-farm/cutscenes/<id>.mp4 when a milestone is reached
// (big harvest, level up, season change).
//
// This script runs OFFLINE / manually only. It is NOT used by the game at
// runtime (Req 7.2, 7.5). Reads keys from environment or .env.local:
// GEMINI_API_KEY, GOOGLE_API_KEY, gemini_key1, gemini_key2, GEMINI_KEY1,
// GEMINI_KEY2. Key values are never printed.
//
// Examples:
//   node scripts/gen-veo-farm.mjs                 # generate all 3 cutscenes
//   node scripts/gen-veo-farm.mjs big-harvest     # regenerate just one
//   node scripts/gen-veo-farm.mjs --only level-up,season-change
//   node scripts/gen-veo-farm.mjs --skip-existing
//   node scripts/gen-veo-farm.mjs --model veo-3.1-lite-generate-preview
import { GoogleGenAI } from '@google/genai';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'games', 'english-farm', 'cutscenes');

const DEFAULT_MODEL = 'veo-3.1-fast-generate-preview';
const FALLBACK_MODEL = 'veo-3.1-lite-generate-preview';

// Milestone cutscene id -> Veo 3 text-to-video prompt (English, no text/watermark).
// Prompts mirror the Asset_Pipeline templates in design.md.
const CLIPS = {
  'big-harvest': {
    prompt:
      'Animate a joyful kids farming game reward: a cute cartoon farmer lifts a giant ' +
      'basket overflowing with colorful vegetables, golden sparkles burst, confetti, ' +
      'gentle camera push in, bright sunny 2D cartoon, no text, no watermark.',
  },
  'level-up': {
    prompt:
      'Animate a cheerful level-up celebration on a cartoon farm: glowing stars and ' +
      'a big golden badge rise, light rays, happy sparkles, gentle zoom, no text, no watermark.',
  },
  'season-change': {
    // PREV_THEME / NEXT_THEME default to a spring -> summer transition for the
    // offline clip; tweak the prompt here to render other seasonal pairs.
    prompt:
      'Animate a smooth season transition over a cartoon vegetable field: from spring ' +
      'to summer, soft cross-fade of colors and weather, gentle camera pan, no text, no watermark.',
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    model: process.env.VEO_MODEL || DEFAULT_MODEL,
    only: null,
    skipExisting: false,
    timeoutMinutes: Number(process.env.VEO_TIMEOUT_MINUTES || 18),
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--model') opts.model = args[++i] || opts.model;
    else if (arg.startsWith('--model=')) opts.model = arg.slice('--model='.length);
    else if (arg === '--only') opts.only = (args[++i] || '').split(',').filter(Boolean);
    else if (arg.startsWith('--only=')) opts.only = arg.slice('--only='.length).split(',').filter(Boolean);
    else if (arg === '--skip-existing') opts.skipExisting = true;
    else if (arg === '--timeout-minutes') opts.timeoutMinutes = Number(args[++i] || opts.timeoutMinutes);
    else if (arg.startsWith('--timeout-minutes=')) opts.timeoutMinutes = Number(arg.slice('--timeout-minutes='.length));
    else if (!arg.startsWith('-')) {
      // Positional argument: a specific cutscene id to regenerate.
      (opts.only ??= []).push(arg);
    }
  }

  if (!Number.isFinite(opts.timeoutMinutes) || opts.timeoutMinutes <= 0) opts.timeoutMinutes = 18;
  return opts;
}

function parseEnvFile(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

async function loadKeys() {
  const names = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'gemini_key1', 'gemini_key2', 'GEMINI_KEY1', 'GEMINI_KEY2'];
  const found = [];
  for (const name of names) {
    if (process.env[name]) found.push({ name, value: process.env[name] });
  }

  try {
    const env = parseEnvFile(await readFile(join(ROOT, '.env.local'), 'utf8'));
    for (const name of names) {
      if (env[name]) found.push({ name, value: env[name] });
    }
  } catch {
    // .env.local is optional when the key is provided by the environment.
  }

  const seen = new Set();
  return found.filter(({ value }) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

async function downloadVideo(ai, generatedVideo) {
  const video = generatedVideo?.video;
  if (!video) throw new Error('Veo response did not contain a video object.');

  if (video.videoBytes) return Buffer.from(video.videoBytes, 'base64');

  if (video.uri) {
    const response = await fetch(video.uri);
    if (!response.ok) throw new Error(`video download failed: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  if (video.file?.uri) {
    const response = await ai.files.download({ file: video.file });
    if (response instanceof Uint8Array || Buffer.isBuffer(response)) return Buffer.from(response);
    if (response?.data) return Buffer.from(response.data);
  }

  throw new Error('Veo response did not expose downloadable video bytes or URI.');
}

async function waitForOperation(ai, operation, timeoutMinutes) {
  const deadline = Date.now() + timeoutMinutes * 60_000;
  let current = operation;
  while (!current.done) {
    if (Date.now() > deadline) {
      throw new Error(`timed out after ${timeoutMinutes} minutes waiting for Veo operation ${current.name || ''}`.trim());
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    current = await ai.operations.getVideosOperation({ operation: current });
    const progress = current.metadata?.progressPercent;
    if (typeof progress === 'number') process.stdout.write(` ${progress}%`);
    else process.stdout.write('.');
  }
  if (current.error) throw new Error(JSON.stringify(current.error));
  return current;
}

async function generateWithKey({ key, model, clip, timeoutMinutes }) {
  const ai = new GoogleGenAI({ apiKey: key });
  // Text-to-video: no source image (unlike the pet evolve clips).
  let operation = await ai.models.generateVideos({
    model,
    prompt: clip.prompt,
    config: {
      numberOfVideos: 1,
      durationSeconds: 8,
      aspectRatio: '16:9',
      resolution: '720p',
    },
  });

  operation = await waitForOperation(ai, operation, timeoutMinutes);
  const generatedVideo = operation.response?.generatedVideos?.[0];
  return downloadVideo(ai, generatedVideo);
}

async function generateOne(keys, id, clip, opts) {
  const outFile = join(OUT, `${id}.mp4`);
  if (opts.skipExisting && existsSync(outFile)) {
    console.log(`[veo] ${id}: skipped existing`);
    return { id, skipped: true, file: outFile };
  }

  const models = opts.model === FALLBACK_MODEL ? [opts.model] : [opts.model, FALLBACK_MODEL];
  let lastError = null;

  for (const model of models) {
    for (const { name, value } of keys) {
      process.stdout.write(`[veo] ${id}: ${model} via ${name}`);
      try {
        const buffer = await generateWithKey({ key: value, model, clip, timeoutMinutes: opts.timeoutMinutes });
        await writeFile(outFile, buffer);
        const info = await stat(outFile);
        console.log(` saved ${(info.size / 1_000_000).toFixed(1)} MB`);
        return { id, model, keyName: name, size: info.size, file: outFile };
      } catch (error) {
        lastError = error;
        console.log(` failed: ${error.message}`);
      }
    }
  }

  return { id, error: lastError?.message || 'unknown error' };
}

async function main() {
  const opts = parseArgs();
  const keys = await loadKeys();
  if (!keys.length) {
    console.error(
      'No Gemini key found. Add GEMINI_API_KEY (or GOOGLE_API_KEY, gemini_key1, gemini_key2) ' +
        'to your environment or .env.local, then re-run:',
    );
    console.error('  node scripts/gen-veo-farm.mjs');
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });

  const entries = Object.entries(CLIPS).filter(([id]) => !opts.only || opts.only.includes(id));
  if (!entries.length) {
    console.error(`No matching cutscene ids. Available: ${Object.keys(CLIPS).join(', ')}`);
    process.exit(1);
  }

  const results = [];
  for (const [id, clip] of entries) {
    // Each id is isolated: one failure does not stop the rest.
    try {
      results.push(await generateOne(keys, id, clip, opts));
    } catch (error) {
      console.log(`[veo] ${id}: unexpected error: ${error.message}`);
      results.push({ id, error: error.message });
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    defaultModel: opts.model,
    cutscenes: results.map((result) => {
      const { keyName, ...safeResult } = result;
      return keyName ? { ...safeResult, key: keyName } : safeResult;
    }),
  };
  await writeFile(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const failures = results.filter((result) => result.error);
  if (failures.length) {
    console.error(`[veo] ${failures.length} cutscene(s) failed. See manifest.json for details.`);
    process.exit(1);
  }
}

// Only run when executed directly via `node scripts/gen-veo-farm.mjs`.
// Importing this module must not trigger any network calls (Req 7.2).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
