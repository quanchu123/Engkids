// Downloads Icons8 "color" full-figure hero / legend / historical characters
// into public/avatars/ as char-*.png (same convention as the mythical set).
// Run: node scripts/download-hero-avatars.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'avatars');
const SIZE = 240;
const STYLES = ['color'];

// local char id -> candidate Icons8 name slugs (first that resolves wins)
const ASSETS = {
  'char-pharaoh': ['pharaoh'],
  'char-osiris': ['osiris'],
  'char-ninja': ['ninja'],
  'char-astronaut': ['astronaut'],
  'char-superhero': ['super-hero-male', 'superhero'],
  'char-warrior': ['iron-age-warrior', 'warrior'],
  'char-pirate': ['pirate'],
  'char-king': ['old-king', 'king-david', 'king'],
  'char-princess': ['blond-princess', 'princess'],
  'char-knight-hero': ['don-quixote'],
  'char-spartan': ['spartan', 'leonidas'],
  'char-cyclops': ['cyclops'],
  'char-medusa': ['medusa'],
  'char-minotaur': ['minotaur'],
  'char-yeti': ['yeti', 'bigfoot'],
  'char-werewolf': ['werewolf'],
  'char-vampire': ['vampire', 'dracula'],
  'char-grim': ['grim-reaper', 'death'],
};

async function tryFetch(style, name) {
  const url = `https://img.icons8.com/${style}/${SIZE}/${encodeURIComponent(name)}.png`;
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
    outer: for (const style of STYLES) {
      for (const name of names) {
        buf = await tryFetch(style, name);
        if (buf) break outer;
      }
    }
    if (!buf) { failed.push(file); continue; }
    await writeFile(join(OUT_DIR, `${file}.png`), buf);
    ok += 1;
    saved.push(file);
  }
  console.log(`[hero] saved ${ok}/${Object.keys(ASSETS).length} -> public/avatars/`);
  console.log(`[hero] OK: ${saved.join(', ')}`);
  if (failed.length) console.log(`[hero] FAILED: ${failed.join(', ')}`);
}

main();
