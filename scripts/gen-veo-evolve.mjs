// Generate final-evolution cinematic clips for the pet game using Gemini API
// Veo image-to-video. The game auto-plays public/games/pet/evolve/<id>.mp4
// when a creature reaches its final form.
//
// Reads keys from environment or .env.local:
// GEMINI_API_KEY, GOOGLE_API_KEY, gemini_key1, gemini_key2, GEMINI_KEY1,
// GEMINI_KEY2. Values are never printed.
//
// Examples:
//   node scripts/gen-veo-evolve.mjs
//   node scripts/gen-veo-evolve.mjs --only thuy-long --skip-existing
//   node scripts/gen-veo-evolve.mjs --model veo-3.1-lite-generate-preview
import { GoogleGenAI } from '@google/genai';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'games', 'pet', 'evolve');
const STAGES = join(ROOT, 'public', 'games', 'pet', 'stages');

const DEFAULT_MODEL = 'veo-3.1-fast-generate-preview';
const FALLBACK_MODEL = 'veo-3.1-lite-generate-preview';

const CLIPS = {
  'thuy-long': {
    image: 'thuy-long-3.png',
    prompt:
      'Animate the supplied final creature image as a premium kids game evolution reveal. A teal water dragon floats above a glowing magical pond, water ribbons spiral around it, golden mane shimmering, gentle camera push in, sparkling particles, joyful fantasy 3D cartoon, polished mobile game reward moment, no text, no watermark.',
  },
  'phuong-hoang': {
    image: 'phuong-hoang-3.png',
    prompt:
      'Animate the supplied final creature image as a premium kids game evolution reveal. A majestic phoenix spreads fiery wings, warm embers and soft golden light swirl around it, gentle camera push in, triumphant magical glow, joyful fantasy 3D cartoon, polished mobile game reward moment, no text, no watermark.',
  },
  'ky-lan': {
    image: 'ky-lan-3.png',
    prompt:
      'Animate the supplied final creature image as a premium kids game evolution reveal. A graceful unicorn with wings and rainbow mane steps through sparkling pastel light, horn glowing, glitter trails, gentle camera push in, joyful fantasy 3D cartoon, polished mobile game reward moment, no text, no watermark.',
  },
  'bao-chua': {
    image: 'bao-chua-3.png',
    prompt:
      'Animate the supplied final creature image as a premium kids game evolution reveal. A friendly green tyrannosaurus roars happily in a lush jungle, dust and leaf particles burst gently, heroic camera push in, joyful fantasy 3D cartoon, polished mobile game reward moment, no text, no watermark.',
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

async function imageToBase64(filename) {
  const file = join(STAGES, filename);
  const bytes = await readFile(file);
  return {
    imageBytes: bytes.toString('base64'),
    mimeType: 'image/png',
  };
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
  const image = await imageToBase64(clip.image);
  let operation = await ai.models.generateVideos({
    model,
    source: {
      prompt: clip.prompt,
      image,
    },
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
    console.error('No Gemini key found. Add GEMINI_API_KEY, GOOGLE_API_KEY, gemini_key1, or gemini_key2.');
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });

  const entries = Object.entries(CLIPS).filter(([id]) => !opts.only || opts.only.includes(id));
  if (!entries.length) {
    console.error(`No matching pet ids. Available: ${Object.keys(CLIPS).join(', ')}`);
    process.exit(1);
  }

  const results = [];
  for (const [id, clip] of entries) {
    results.push(await generateOne(keys, id, clip, opts));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    defaultModel: opts.model,
    results: results.map((result) => {
      const { keyName, ...safeResult } = result;
      return keyName ? { ...safeResult, key: keyName } : safeResult;
    }),
  };
  await writeFile(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const failures = results.filter((result) => result.error);
  if (failures.length) {
    console.error(`[veo] ${failures.length} clip(s) failed. See manifest.json for details.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
