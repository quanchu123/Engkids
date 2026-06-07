// Round 3: remaining legal Icons8 "color" mythical creatures (no trademarked
// franchise characters). Named gods (Zeus, Wukong, Odin...) do NOT exist on
// Icons8, so this is the ceiling of legal character art there.
// Run: node scripts/download-hero-avatars-3.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'avatars');
const SIZE = 240;
const STYLE = 'color';

const ASSETS = {
  'char-dragon-cn': ['dragon'],
  'char-hydra': ['hydra'],
  'char-orc': ['orc'],
  'char-goblin': ['clr-goblin', 'goblin'],
  'char-leprechaun': ['leprechaun'],
  'char-elf': ['elf'],
  'char-zombie': ['zombie'],
};

async function tryFetch(name) {
  const url = `https://img.icons8.com/${STYLE}/${SIZE}/${encodeURIComponent(name)}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf.length > 800) return buf;
    return null;
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0;
  const saved = [];
  const failed = [];
  for (const [file, names] of Object.entries(ASSETS)) {
    let buf = null;
    for (const name of names) {
      buf = await tryFetch(name);
      if (buf) break;
    }
    if (!buf) { failed.push(file); continue; }
    await writeFile(join(OUT_DIR, `${file}.png`), buf);
    ok += 1;
    saved.push(file);
  }
  console.log(`[hero3] saved ${ok}/${Object.keys(ASSETS).length} -> public/avatars/`);
  console.log(`[hero3] OK: ${saved.join(', ')}`);
  if (failed.length) console.log(`[hero3] FAILED: ${failed.join(', ')}`);
}

main();
