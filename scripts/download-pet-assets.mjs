// Downloads Icons8 "clouds" (soft 3D) art for the pet game into
// public/games/pet/. Falls back to "color" if clouds lacks an icon.
// Run: node scripts/download-pet-assets.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'games', 'pet');
const SIZE = 192;
const STYLES = ['clouds', 'color'];

// local filename -> candidate Icons8 names
const ASSETS = {
  food: ['dog-food', 'pet-food', 'animal-food', 'apple'],
  treat: ['bone', 'dog-bone'],
  apple: ['apple'],
  fish: ['fish-food', 'fish'],
  ball: ['children-ball', 'soccer-ball', 'ball'],
  bath: ['soap', 'shower', 'bathtub', 'bubbles'],
  bed: ['bed', 'sleeping', 'crib'],
  heart: ['like', 'heart', 'hearts'],
  sparkle: ['sparkling', 'sparkle', 'magic'],
  bowl: ['dog-bowl', 'bowl', 'soup-plate'],
  brush: ['brush', 'hairbrush', 'comb'],
  medicine: ['pill', 'medicine', 'syringe'],
};

async function tryFetch(style, name) {
  const url = `https://img.icons8.com/${style}/${SIZE}/${encodeURIComponent(name)}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf.length > 500) return buf;
    return null;
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0;
  const fellBack = [];
  const failed = [];
  for (const [file, names] of Object.entries(ASSETS)) {
    let buf = null;
    let used = null;
    outer: for (const style of STYLES) {
      for (const name of names) {
        buf = await tryFetch(style, name);
        if (buf) { used = style; break outer; }
      }
    }
    if (!buf) { failed.push(file); continue; }
    await writeFile(join(OUT_DIR, `${file}.png`), buf);
    ok += 1;
    if (used !== STYLES[0]) fellBack.push(`${file}(${used})`);
  }
  console.log(`[pet] saved ${ok}/${Object.keys(ASSETS).length} -> public/games/pet/`);
  if (fellBack.length) console.log(`[pet] fell back to color: ${fellBack.join(', ')}`);
  if (failed.length) console.log(`[pet] FAILED: ${failed.join(', ')}`);
}

main();
