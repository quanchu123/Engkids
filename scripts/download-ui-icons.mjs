// Downloads the Icons8 "color" UI icons used by the Progress & Shop pages into
// public/icons/. Icons8 PNG endpoint is stable: https://img.icons8.com/?id=ID&format=png&size=SIZE
// Run: node scripts/download-ui-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
const SIZE = 192;

// name -> Icons8 icon id (platform "color")
const ICONS = {
  home: '12229',
  dictionary: '114439',
  'open-book': '114325',
  books: '16368',
  notebook: '114330',
  medal: '17912',
  trophy: '16951',
  star: '19295',
  fire: '18515',
  abc: '23427',
  'treasure-chest': '22467',
  crown: '13728',
  controller: '11907',
  audio: '15207',
  gift: '13140',
  family: '12131',
  certificate: '12016',
  goal: '63765',
  light: '20523',
  sprout: '19656',
  'graduation-cap': '12197',
  microphone: '12379',
  calendar: '12776',
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0;
  for (const [name, id] of Object.entries(ICONS)) {
    const url = `https://img.icons8.com/?id=${id}&format=png&size=${SIZE}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[icons] FAIL ${name} (${id}): HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(join(OUT_DIR, `${name}.png`), buf);
      ok += 1;
      console.log(`[icons] saved ${name}.png (${buf.length} bytes)`);
    } catch (err) {
      console.error(`[icons] ERROR ${name} (${id}):`, err.message);
    }
  }
  console.log(`[icons] done: ${ok}/${Object.keys(ICONS).length} downloaded -> public/icons/`);
}

main();
