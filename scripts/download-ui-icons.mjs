// Downloads the UI icons used by Progress / Shop / Profile into public/icons/.
// Uses the Icons8 "clouds" (soft 3D) style by NAME, falling back to "color"
// (flat) when an icon doesn't exist in clouds. Keeps stable local filenames so
// no app code needs to change. Run: node scripts/download-ui-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
const SIZE = 192;
const STYLES = ['clouds', 'color']; // preferred first, fallback second

// local filename -> candidate Icons8 icon names (first match wins)
const ICONS = {
  home: ['home'],
  dictionary: ['dictionary', 'spell-check', 'literature'],
  'open-book': ['open-book', 'book', 'books'],
  books: ['books', 'book-shelf', 'literature'],
  notebook: ['notebook', 'spiral-bound-booklet', 'note'],
  medal: ['medal', 'medal2', 'prize'],
  trophy: ['trophy', 'prize'],
  star: ['star', 'christmas-star'],
  fire: ['fire-element', 'fire', 'flame'],
  abc: ['abc', 'alphabet', 'abc-block'],
  'treasure-chest': ['treasure-chest', 'chest', 'treasure'],
  crown: ['crown', 'king'],
  controller: ['controller', 'game-controller', 'gamepad'],
  audio: ['high-volume', 'speaker', 'audio'],
  gift: ['gift', 'gift-box', 'present', 'packaging'],
  family: ['family', 'parents'],
  certificate: ['certificate', 'diploma', 'diploma-1'],
  goal: ['goal', 'target', 'dart'],
  light: ['light-on', 'idea', 'light', 'bulb'],
  sprout: ['sprout', 'plant', 'seedling'],
  'graduation-cap': ['graduation-cap', 'student-male', 'mortarboard'],
  microphone: ['microphone', 'mic'],
  calendar: ['calendar', 'planner'],
  coins: ['coins', 'money', 'cash'],
  snowflake: ['snowflake', 'winter', 'snow'],
};

async function tryFetch(style, name) {
  const url = `https://img.icons8.com/${style}/${SIZE}/${encodeURIComponent(name)}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Valid PNG magic + not a tiny "missing" placeholder.
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf.length > 500) {
      return buf;
    }
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

  for (const [file, names] of Object.entries(ICONS)) {
    let buf = null;
    let usedStyle = null;
    outer: for (const style of STYLES) {
      for (const name of names) {
        buf = await tryFetch(style, name);
        if (buf) { usedStyle = style; break outer; }
      }
    }
    if (!buf) { failed.push(file); continue; }
    await writeFile(join(OUT_DIR, `${file}.png`), buf);
    ok += 1;
    if (usedStyle !== STYLES[0]) fellBack.push(`${file}(${usedStyle})`);
  }

  console.log(`[icons] saved ${ok}/${Object.keys(ICONS).length} -> public/icons/`);
  if (fellBack.length) console.log(`[icons] fell back to color: ${fellBack.join(', ')}`);
  if (failed.length) console.log(`[icons] FAILED (kept old): ${failed.join(', ')}`);
}

main();
