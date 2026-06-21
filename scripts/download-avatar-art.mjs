// Downloads colorful Icons8 art for the avatar shop into public/avatars/.
// All icons are original Icons8 art (animals, dinosaurs, sea life, mythical
// creatures) — NO copyrighted/branded characters. Run: node scripts/download-avatar-art.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'avatars');
const SIZE = 240;

// avatar item id -> Icons8 icon id (platform "color")
const ART = {
  // characters — pets
  'char-fox': '40811', 'char-panda': '16093', 'char-unicorn': '16114', 'char-owl': '36262',
  'char-rabbit': '16082', 'char-lion': '33035', 'char-tiger': '18549', 'char-elephant': '24495',
  'char-giraffe': '16056', 'char-zebra': '37106', 'char-monkey': 'BZO3S6QnAZkQ', 'char-bear': '16035',
  'char-kangaroo': '20993', 'char-hippo': 'JDHmCTYC4VXm', 'char-rhino': '31018', 'char-crocodile': 'YsMnAIqltevM',
  'char-turtle': '16106', 'char-frog': '18912', 'char-deer': '16029', 'char-mouse': '95005',
  'char-redpanda': 'vjcEOhHbbzpq', 'char-wolf': '20920', 'char-squirrel': '95006', 'char-hedgehog': 'EqlaXlCmEM5J',
  'char-sloth': '36773', 'char-coati': 'TzTi6W8mgIOw', 'char-chameleon': 'iy7s412RVvVR', 'char-gorilla': '16047',
  'char-leopard': '16090', 'char-camel': 'Cx_h689vflUD',
  // birds
  'char-penguin': 'GLNXrevIGCZO', 'char-parrot': '36840', 'char-eagle': '33774', 'char-peacock': '32558',
  'char-duck': '16041', 'char-flamingo': '95002', 'char-seagull': '5PinlUweOebo', 'char-swan': '59097',
  'char-chick': 'Ge7zMJ8FeOLa', 'char-rooster': '36858',
  // sea life
  'char-dolphin': '16043', 'char-whale': '20894', 'char-octopus': '16077', 'char-crab': '16022',
  'char-seahorse': '16108', 'char-starfish': '16103', 'char-clownfish': '16021', 'char-jellyfish': '9uU0ujsukNR5',
  'char-fish': '16040', 'char-shark': 'SD6u6oqzzyfZ', 'char-koi': '37099', 'char-stingray': 'SsT0C7bPK2vO',
  'char-salmon': 'RqlLQZrW8PFf', 'char-seal': '95003', 'char-narwhal': '3cOZewYLnOfC',
  // insects
  'char-butterfly': '16031', 'char-bee': '16030', 'char-ladybug': '16059', 'char-snail': '16117',
  'char-snake': '87063',
  // farm
  'char-pig': '16079', 'char-horse': '16058', 'char-cow': '16016', 'char-sheep': '16104',
  'char-goat': 'vm1KGI0m5jtH', 'char-llama': '16095', 'char-hamster': '69301',
  // mythical / fantasy
  'char-dragon-eu': '61304', 'char-jackalope': 'TCOtrQivEhSg', 'char-phoenix': '57197', 'char-pegasus': 'RJXpN0IjlHQc',
  'char-mermaid': '56953', 'char-fairy': 'PdIRfx3Xy1hM', 'char-genie': '21721', 'char-ghost': 'J3yGaQTpKoRE',
  'char-robot': '9inONWn9EvfI', 'char-alien': '13482',
  // dinosaurs
  'char-dino': '16033', 'char-kawaii-dino': '5vV_csnCe5Q2', 'char-stegosaurus': 'zzSmCxPka4zD',
  'char-diplodocus': '3F1S65KAeUpP', 'char-tyrannosaur': 'M4p3qvRyOoBp', 'char-spinosaurus': '7CbRLyB4ds1O',
  'char-velociraptor': 'kkjBrqTcWZwu', 'char-triceratops': 'k2IplTISdSQi', 'char-ankylosaurus': '8rPQc6z6RrkL',
  'char-pterodactyl': 'YxngeayofcUD', 'char-carnotaurus': 'kpDZVaK4BdC9', 'char-hadrosaur': 'qlS6VIPSjkiB',
  'char-dino-egg': '1MIUpRTwcaOC',
  // pets (accessory category)
  'pet-cat': '16017', 'pet-dog': '16018', 'pet-dragon': 'NkphTkua9tjT',
  // hats
  'hat-party': '26198', 'hat-crown': '13728', 'hat-wizard': '17388',
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0;
  const entries = Object.entries(ART);
  for (const [name, id] of entries) {
    const url = `https://img.icons8.com/?id=${id}&format=png&size=${SIZE}`;
    try {
      const res = await fetch(url);
      if (!res.ok) { console.error(`[avatar] FAIL ${name} (${id}): HTTP ${res.status}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
        console.error(`[avatar] WARN ${name}: not a PNG (${buf.length} bytes)`); continue;
      }
      await writeFile(join(OUT_DIR, `${name}.png`), buf);
      ok += 1;
    } catch (err) {
      console.error(`[avatar] ERROR ${name} (${id}):`, err.message);
    }
  }
  console.log(`[avatar] done: ${ok}/${entries.length} -> public/avatars/`);
}

main();
