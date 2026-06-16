#!/usr/bin/env node
// Download ONE representative illustration per kid topic from OpenMoji
// (CC BY-SA 4.0, https://openmoji.org). We map each curriculum topic to a fixed
// OpenMoji codepoint (chosen by hand to represent the theme) and fetch the
// colour SVG. We never invent artwork; every file is an unmodified OpenMoji asset.
//
//   node scripts/fetch-illustrations.mjs
//
// Output: public/illustrations/<topic-slug>.svg  +  manifest.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const OUT_DIR = path.join(root, 'public', 'illustrations');
const BASE = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg';

// topic (English key in DB) -> OpenMoji codepoint. Hand-picked representative
// emoji per theme. These are the same theme keys the lesson generator writes to
// curriculum_units.theme.
const TOPIC_EMOJI = {
  'food and drinks': '1F34E',          // red apple
  'animals': '1F436',                  // dog face
  'plants and trees': '1F333',         // deciduous tree
  'body and health': '1FA7A',          // stethoscope
  'people and family': '1F46A',        // family
  'society and groups': '1F465',       // busts in silhouette
  'language and communication': '1F4AC', // speech balloon
  'places': '1F3D9',                   // cityscape
  'time and calendar': '1F4C5',        // calendar
  'feelings and emotions': '1F60A',    // smiling face
  'things and objects': '1F4E6',       // package/box
  'nature and the world': '1F30D',     // globe (EU-Africa)
  'thinking and ideas': '1F4A1',       // light bulb
  'movement and travel': '2708',       // airplane
  'money and shopping': '1F6D2',       // shopping cart
  'weather and nature': '26C5',        // sun behind cloud
  'art and making': '1F3A8',           // artist palette
  'sports and games': '26BD',          // soccer ball
  'activities and events': '1F389',    // party popper
  'actions': '1F3C3',                  // person running
  'social actions': '1F91D',           // handshake
  'states and being': '2728',          // sparkles
  'senses and perception': '1F441',    // eye
  'qualities and descriptions': '1F50D', // magnifying glass
  'descriptions': '1F3F7',             // label tag
  'manner words': '1F501',             // repeat
  'numbers and measure': '1F522',      // input numbers
  'shapes': '1F537',                   // large blue diamond
  'materials': '1F9F1',                // brick
  'daily life': '1F3E1',               // house with garden
  'school': '1F3EB',                   // school
  'technology': '1F4BB',               // laptop
  'general': '1F4DA',                  // books
};

function slug(topic) {
  return String(topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {};
  let ok = 0;
  let fail = 0;
  for (const [topic, code] of Object.entries(TOPIC_EMOJI)) {
    const url = `${BASE}/${code}.svg`;
    const fileName = `${slug(topic)}.svg`;
    const dest = path.join(OUT_DIR, fileName);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svg = await res.text();
      if (!svg.includes('<svg')) throw new Error('not an svg');
      fs.writeFileSync(dest, svg);
      manifest[topic] = `/illustrations/${fileName}`;
      ok += 1;
      process.stderr.write(`ok ${topic} -> ${fileName}\n`);
    } catch (err) {
      fail += 1;
      process.stderr.write(`FAIL ${topic} (${code}): ${err.message}\n`);
    }
  }
  manifest._license = 'OpenMoji (https://openmoji.org), CC BY-SA 4.0';
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  process.stderr.write(`DONE ok=${ok} fail=${fail} -> ${OUT_DIR}\n`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
