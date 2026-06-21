// Round 2: download more legend / mythology / heroic characters from Icons8
// "color" into public/avatars/. All chosen art is public-domain figures or
// generic occupations — no trademarked franchise characters.
// Run: node scripts/download-hero-avatars-2.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'avatars');
const SIZE = 240;
const STYLES = ['color'];

const ASSETS = {
  // Legendary / divine figures (public domain)
  'char-buddha': ['buddha'],
  'char-god': ['god'],
  'char-angel': ['angel-with-sword', 'angel'],
  'char-devil': ['lucifer'],
  'char-sage': ['wise-old-man'],
  // Classic / mythological warriors
  'char-greek-warrior': ['greek-guard'],
  'char-archer': ['archery-skin-type-1', 'archery-skin-type-2'],
  'char-hercules': ['hercules'],
  // Adventurers / heroes (generic)
  'char-cowboy': ['red-haired-cowboy'],
  'char-detective': ['sherlock-holmes', 'detective'],
  'char-witch-girl': ['witch_girl'],
  'char-santa': ['santa'],
  'char-chef': ['chef-cooking', 'cook-male'],
  // Halloween / monster characters
  'char-mummy': ['mummy'],
  'char-frankenstein': ['frankensteins-monster'],
  'char-pumpkin': ['jack-o-lantern'],
  'char-gremlin': ['gremlin'],
  'char-monster': ['monster-face'],
  // Sci-fi / future
  'char-scientist': ['scientist-man'],
  'char-scientist-w': ['scientist-woman'],
  'char-policeman': ['policeman-male'],
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
  console.log(`[hero2] saved ${ok}/${Object.keys(ASSETS).length} -> public/avatars/`);
  console.log(`[hero2] OK: ${saved.join(', ')}`);
  if (failed.length) console.log(`[hero2] FAILED: ${failed.join(', ')}`);
}

main();
