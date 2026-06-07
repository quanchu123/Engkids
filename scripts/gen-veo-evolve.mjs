// Generates 4 "final evolution" cinematic clips with Veo 3 (Gemini API) and
// saves them to public/games/pet/evolve/<species>.mp4. The pet game auto-plays
// the matching clip when a creature reaches its final form (falls back to the
// CSS burst if the file is absent).
//
// Needs a Gemini API key with Veo access. Reads GEMINI_API_KEY (or
// GOOGLE_API_KEY) from .env.local or the environment.
// Run: node scripts/gen-veo-evolve.mjs
//
// NOTE: the Veo endpoint/model id evolves over time. If you get a 404/400,
// tell me the exact error and I'll adjust the model id / request shape.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'games', 'pet', 'evolve');

const MODEL = 'veo-3.0-generate-preview'; // change if your account exposes another id
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

const CLIPS = {
  'thuy-long': 'A glowing teal koi fish leaps from a magical pond, light bursts and water swirls around it, transforming mid-air into a majestic Eastern water dragon with a golden mane, cinematic, magical particles, cute kids cartoon 3D style, deep blue background, smooth slow-motion finish',
  'phuong-hoang': 'A small fluffy fire chick bursts into brilliant flames and rises, transforming into a majestic phoenix with huge blazing wings, golden crest, glowing embers, cinematic, cute kids cartoon 3D style, warm orange background, triumphant finish',
  'ky-lan': 'A young white winged pony gallops through sparkles and rainbow light, transforming into a majestic unicorn with a glowing spiral horn and flowing rainbow mane, cinematic, magical glitter, cute kids cartoon 3D style, soft pastel background, graceful finish',
  'bao-chua': 'A small green baby dinosaur roars and grows rapidly, transforming into a mighty Tyrannosaurus Rex with powerful muscles, dust and energy bursting around it, cinematic, cute kids cartoon 3D style, jungle background, epic finish',
};

async function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  try {
    const env = await readFile(join(ROOT, '.env.local'), 'utf8');
    const m = env.match(/^(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch { /* ignore */ }
  return null;
}

async function generateOne(key, prompt) {
  // Kick off the long-running video generation.
  const start = await fetch(`${BASE}/models/${MODEL}:predictLongRunning?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { aspectRatio: '16:9', personGeneration: 'dont_allow' },
    }),
  });
  if (!start.ok) throw new Error(`start ${start.status}: ${await start.text()}`);
  let op = await start.json();

  // Poll until done.
  for (let i = 0; i < 60 && !op.done; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const poll = await fetch(`${BASE}/${op.name}?key=${key}`);
    op = await poll.json();
  }
  if (!op.done) throw new Error('timed out waiting for video');

  // Find the generated file URI in the response (shape varies by version).
  const json = JSON.stringify(op);
  const uri = (json.match(/https?:\/\/[^"']+\.mp4[^"']*/) || [])[0]
    || op.response?.generatedVideos?.[0]?.video?.uri
    || op.response?.predictions?.[0]?.video?.uri;
  if (!uri) throw new Error(`no video uri in response: ${json.slice(0, 600)}`);

  const vid = await fetch(uri.includes('key=') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}key=${key}`);
  if (!vid.ok) throw new Error(`download ${vid.status}`);
  return Buffer.from(await vid.arrayBuffer());
}

async function main() {
  const key = await loadKey();
  if (!key) { console.error('No GEMINI_API_KEY / GOOGLE_API_KEY found.'); process.exit(1); }
  await mkdir(OUT, { recursive: true });
  for (const [id, prompt] of Object.entries(CLIPS)) {
    process.stdout.write(`[veo] ${id} ... `);
    try {
      const buf = await generateOne(key, prompt);
      await writeFile(join(OUT, `${id}.mp4`), buf);
      console.log(`saved (${(buf.length / 1e6).toFixed(1)} MB)`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }
}

main();
