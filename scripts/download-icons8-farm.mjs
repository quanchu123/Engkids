// Download a cohesive cartoon "color" farm asset set from Icons8 (premium,
// full-res 512px PNG, no watermark) into public/games/english-farm/iso/.
// Writes a manifest.json. Safe to re-run. Credit: icons by Icons8 (icons8.com).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'games', 'english-farm', 'iso');
const SIZE = process.env.ICON_SIZE || '512';

// name -> Icons8 icon id (all "color" platform for a cohesive cartoon look).
const ICONS = {
  // crops
  carrot: '12865',
  tomato: '18102',
  corn: '13285',
  pumpkin: '17358',
  strawberry: '18041',
  potato: '20756',
  // growth stages
  sprout: '19656',
  leaf: '18066',
  // character + animals
  farmer: '23295',
  cow: '16016',
  chicken: '16019',
  // buildings / nature
  barn: '12826',
  tree: '18047',
  fence: '34437',
  // tools / ui / fx
  'watering-can': '16539',
  shovel: 'lIRYcwvHP1GN',
  coins: '13009',
  star: '19295',
  water: '13101',
};

const pngUrl = (id) => `https://img.icons8.com/?id=${id}&format=png&size=${SIZE}`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const results = [];
  for (const [name, id] of Object.entries(ICONS)) {
    try {
      const res = await fetch(pngUrl(id));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      let dim = '?';
      if (buf.slice(12, 16).toString('ascii') === 'IHDR') {
        dim = `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
      }
      await writeFile(path.join(OUT, `${name}.png`), buf);
      results.push({ name, id, file: `/games/english-farm/iso/${name}.png`, dim });
      process.stdout.write(`  ✓ ${name} (${dim}, ${(buf.length / 1024) | 0}KB)\n`);
    } catch (e) {
      results.push({ name, id, error: e instanceof Error ? e.message : String(e) });
      process.stdout.write(`  ! ${name}: ${e instanceof Error ? e.message : e}\n`);
    }
  }
  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify(
      { source: 'icons8.com', style: 'color', size: SIZE, credit: 'Icons by Icons8 (https://icons8.com)', generatedAt: new Date().toISOString(), results },
      null,
      2,
    ) + '\n',
  );
  const ok = results.filter((r) => r.file).length;
  process.stdout.write(`[icons8-farm] ${ok}/${results.length} downloaded -> ${OUT}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
