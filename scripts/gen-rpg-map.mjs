// Generates a larger RPG World map (64x64) from the existing tileset, keeping
// the same tileset.png. Clean look: solid grass field + tree border + scattered
// tree/rock clusters (all collidable), with monsters & NPCs spread out.
// Backs up the old map to tilemap.backup.json. Run: node scripts/gen-rpg-map.mjs
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP = join(__dirname, '..', 'public', 'games', 'rpg-world', 'tilemaps', 'tilemap.json');
const BACKUP = join(__dirname, '..', 'public', 'games', 'rpg-world', 'tilemaps', 'tilemap.backup.json');

const W = 64, H = 64, TILE = 16;
const GRASS = 626;          // dominant grass tile (gid)
const TREE = 487;           // bushy tree (gid)
const TREE2 = 492;          // alt tree (gid)
const ROCK = 938;           // rock (gid)
const FIRSTGID = 1;

// Deterministic PRNG so regenerating is stable.
let seed = 1337;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

function emptyGrid(fill) { return new Array(W * H).fill(fill); }
const idx = (x, y) => y * W + x;

function main() {
  return (async () => {
    const raw = JSON.parse(await readFile(MAP, 'utf8'));
    // backup once
    try { await access(BACKUP); } catch { await copyFile(MAP, BACKUP); }

    const terrain = emptyGrid(GRASS);
    const deco = emptyGrid(0);

    // Spawn clearing around the player start (200,300) -> tile (12,18); keep clear.
    const spawnTx = 12, spawnTy = 18;
    const clearOf = (x, y, r) => Math.abs(x - spawnTx) <= r && Math.abs(y - spawnTy) <= r;

    // Tree border (2 tiles thick) around the whole map.
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) {
          deco[idx(x, y)] = rnd() < 0.5 ? TREE : TREE2;
        }
      }
    }

    // Scattered clusters of trees/rocks (clean blobs, avoiding spawn + keeping paths).
    const clusters = 26;
    for (let c = 0; c < clusters; c++) {
      const cx = ri(4, W - 5), cy = ri(4, H - 5);
      if (clearOf(cx, cy, 4)) continue;
      const size = ri(3, 7);
      for (let i = 0; i < size; i++) {
        const x = cx + ri(-2, 2), y = cy + ri(-2, 2);
        if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
        if (clearOf(x, y, 3)) continue;
        deco[idx(x, y)] = rnd() < 0.8 ? (rnd() < 0.5 ? TREE : TREE2) : ROCK;
      }
    }

    // Force collision on the tiles we used for obstacles (legacy Tiled format).
    const ts = raw.tilesets[0];
    ts.tileproperties = ts.tileproperties || {};
    ts.tilepropertytypes = ts.tilepropertytypes || {};
    for (const gid of [TREE, TREE2, ROCK]) {
      const local = String(gid - FIRSTGID);
      ts.tileproperties[local] = { ...(ts.tileproperties[local] || {}), collides: true };
      ts.tilepropertytypes[local] = { ...(ts.tilepropertytypes[local] || {}), collides: 'bool' };
    }

    // Monsters spread across the open field (avoid spawn + border).
    const monsters = [];
    const wantTreant = 6, wantMole = 6;
    const placeMonster = (name) => {
      for (let tries = 0; tries < 60; tries++) {
        const x = ri(5, W - 6), y = ri(5, H - 6);
        if (clearOf(x, y, 5)) continue;
        if (deco[idx(x, y)] !== 0) continue;
        monsters.push({ name, x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });
        return;
      }
    };
    for (let i = 0; i < wantTreant; i++) placeMonster('treant');
    for (let i = 0; i < wantMole; i++) placeMonster('mole');

    // NPCs spread out near open areas.
    const npcs = [];
    const npcSpots = [[18, 18], [40, 14], [52, 34], [22, 48], [44, 50]];
    for (const [tx, ty] of npcSpots) {
      if (deco[idx(tx, ty)] !== 0) deco[idx(tx, ty)] = 0;
      npcs.push({ name: 'npc', x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    }

    const makeTileLayer = (name, data) => ({
      name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0,
      width: W, height: H, data,
    });
    const makeObjLayer = (name, objs) => ({
      name, type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0,
      objects: objs.map((o, i) => ({
        id: i + 1, name: o.name, type: '', x: o.x, y: o.y, width: 0, height: 0,
        rotation: 0, visible: true, point: true,
      })),
    });

    raw.width = W; raw.height = H;
    raw.layers = [
      makeTileLayer('terrain', terrain),
      makeTileLayer('bridge', emptyGrid(0)),
      makeTileLayer('deco', deco),
      makeObjLayer('monsters', monsters),
      makeObjLayer('npcs', npcs),
      makeObjLayer('zones', [{ name: 'start', x: spawnTx * TILE, y: spawnTy * TILE }]),
    ];

    await writeFile(MAP, JSON.stringify(raw));
    console.log(`[rpg-map] wrote ${W}x${H} map; monsters=${monsters.length} npcs=${npcs.length}`);
  })();
}

main();
