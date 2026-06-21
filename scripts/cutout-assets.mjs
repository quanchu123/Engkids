// Removes the flat white background from the Dreamina-generated PNGs (which
// have NO alpha) and drops them into the game asset folders with correct names.
// Uses border flood-fill so WHITE SUBJECTS (unicorn, pony, pearly egg) keep
// their interior white — only background-connected white becomes transparent.
// Run: node scripts/cutout-assets.mjs
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, '..', 'dreamina-2026-06-07-8976-a cute garden shovel');
const PET_STAGES = join(ROOT, 'public', 'games', 'pet', 'stages');
const PET_DIR = join(ROOT, 'public', 'games', 'pet');
const FARM_DIR = join(ROOT, 'public', 'games', 'english-farm', 'assets');

// id prefix (the dreamina-...-XXXX-) -> { dest dir, name }
const MAP = {
  // Pet evolution stages
  '1198': [PET_STAGES, 'thuy-long-egg'], '8828': [PET_STAGES, 'thuy-long-1'], '5839': [PET_STAGES, 'thuy-long-2'], '7281': [PET_STAGES, 'thuy-long-3'],
  '5118': [PET_STAGES, 'phuong-hoang-egg'], '5967': [PET_STAGES, 'phuong-hoang-1'], '5326': [PET_STAGES, 'phuong-hoang-2'], '4566': [PET_STAGES, 'phuong-hoang-3'],
  '3701': [PET_STAGES, 'ky-lan-egg'], '4591': [PET_STAGES, 'ky-lan-1'], '4468': [PET_STAGES, 'ky-lan-2'], '2264': [PET_STAGES, 'ky-lan-3'],
  '9781': [PET_STAGES, 'bao-chua-egg'], '4751': [PET_STAGES, 'bao-chua-1'], '8534': [PET_STAGES, 'bao-chua-2'], '2671': [PET_STAGES, 'bao-chua-3'],
  // Pet care icons (overwrite existing)
  '9240': [PET_DIR, 'food'], '8766': [PET_DIR, 'ball'], '8354': [PET_DIR, 'bath'], '8103': [PET_DIR, 'bed'],
  // Farm crops (sprout / growing / ripe)
  '2371': [FARM_DIR, 'carrot-1'], '7357': [FARM_DIR, 'carrot-2'], '8582': [FARM_DIR, 'carrot-3'],
  '1416': [FARM_DIR, 'tomato-1'], '3678': [FARM_DIR, 'tomato-2'], '1507': [FARM_DIR, 'tomato-3'],
  '5106': [FARM_DIR, 'corn-1'], '7785': [FARM_DIR, 'corn-2'], '5069': [FARM_DIR, 'corn-3'],
  '5460': [FARM_DIR, 'pumpkin-1'], '6655': [FARM_DIR, 'pumpkin-2'], '6997': [FARM_DIR, 'pumpkin-3'],
  '2747': [FARM_DIR, 'strawberry-1'], '4879': [FARM_DIR, 'strawberry-2'], '2451': [FARM_DIR, 'strawberry-3'],
  '7382': [FARM_DIR, 'potato-1'], '9391': [FARM_DIR, 'potato-2'], '8108': [FARM_DIR, 'potato-3'],
  '1162': [FARM_DIR, 'sprout'], '8805': [FARM_DIR, 'leaf'],
  // Farm tiles (no white bg; flood-fill is a no-op, kept opaque)
  '4049': [FARM_DIR, 'tile-grass', true], '7766': [FARM_DIR, 'tile-soil', true], '3134': [FARM_DIR, 'tile-wet', true],
  // Farm characters / buildings / UI
  '3870': [FARM_DIR, 'farmer'], '3387': [FARM_DIR, 'cow'], '4551': [FARM_DIR, 'chicken'],
  '6045': [FARM_DIR, 'barn'], '6635': [FARM_DIR, 'tree'], '8294': [FARM_DIR, 'fence'], '7182': [FARM_DIR, 'well'],
  '7488': [FARM_DIR, 'coins'], '6301': [FARM_DIR, 'star'], '5357': [FARM_DIR, 'watering-can'], '1139': [FARM_DIR, 'water'],
};

const isWhite = (r, g, b) => Math.min(r, g, b) > 232 && (Math.max(r, g, b) - Math.min(r, g, b)) < 22;

function cutout(png) {
  const { width: W, height: H, data } = png;
  const A = (x, y) => (y * W + x) * 4;
  const removed = new Uint8Array(W * H);
  const q = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (removed[i]) return;
    const o = i * 4;
    if (isWhite(data[o], data[o + 1], data[o + 2])) { removed[i] = 1; q.push(i); }
  };
  for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1); }
  for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y); }
  while (q.length) {
    const i = q.pop();
    const x = i % W, y = (i / W) | 0;
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
  }
  // Apply: removed -> alpha 0. Feather: opaque white pixels touching removed get partial alpha.
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    if (removed[i]) { data[o + 3] = 0; continue; }
    if (isWhite(data[o], data[o + 1], data[o + 2])) {
      const x = i % W, y = (i / W) | 0;
      const near = (removed[i - 1] || removed[i + 1] || removed[i - W] || removed[i + W]);
      if (near && x > 0 && x < W - 1 && y > 0 && y < H - 1) data[o + 3] = 90;
    }
  }
  return png;
}

async function main() {
  await mkdir(PET_STAGES, { recursive: true });
  await mkdir(FARM_DIR, { recursive: true });
  const files = (await readdir(SRC_DIR)).filter((f) => f.endsWith('.png'));
  const byId = {};
  for (const f of files) {
    const m = f.match(/dreamina-[\d-]+-(\d{4})-/);
    if (m) byId[m[1]] = f;
  }
  let ok = 0; const miss = [];
  for (const [id, [dir, name, keepBg]] of Object.entries(MAP)) {
    const src = byId[id];
    if (!src) { miss.push(`${name}(${id})`); continue; }
    const png = PNG.sync.read(await readFile(join(SRC_DIR, src)));
    if (!keepBg) cutout(png);
    await writeFile(join(dir, `${name}.png`), PNG.sync.write(png));
    ok += 1;
  }
  console.log(`[cutout] wrote ${ok}/${Object.keys(MAP).length}`);
  if (miss.length) console.log(`[cutout] MISSING ids: ${miss.join(', ')}`);
}

main();
