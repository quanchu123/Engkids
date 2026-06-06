// Downloads colorful Icons8 character/pet/hat art for the avatar shop into
// public/avatars/. Run: node scripts/download-avatar-art.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'avatars');
const SIZE = 240;

// avatar item id -> Icons8 icon id (platform "color")
const ART = {
  'char-fox': '40811',
  'char-panda': '16093',
  'char-unicorn': '16114',
  'char-owl': '36262',
  'char-rabbit': '16082',
  'pet-cat': '16017',
  'pet-dog': '16018',
  'pet-dragon': 'NkphTkua9tjT',
  'hat-party': '26198',
  'hat-crown': '13728',
  'hat-wizard': '17388',
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0;
  for (const [name, id] of Object.entries(ART)) {
    const url = `https://img.icons8.com/?id=${id}&format=png&size=${SIZE}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[avatar] FAIL ${name} (${id}): HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      // Sanity check: PNG magic bytes.
      if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
        console.error(`[avatar] WARN ${name}: not a PNG (${buf.length} bytes)`);
      }
      await writeFile(join(OUT_DIR, `${name}.png`), buf);
      ok += 1;
      console.log(`[avatar] saved ${name}.png (${buf.length} bytes)`);
    } catch (err) {
      console.error(`[avatar] ERROR ${name} (${id}):`, err.message);
    }
  }
  console.log(`[avatar] done: ${ok}/${Object.keys(ART).length} -> public/avatars/`);
}

main();
