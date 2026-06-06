/**
 * Download Iconscout 3D icons for the English Farming Game.
 *
 * Reuses the same Iconscout v3 search+download flow as
 * scripts/download-iconscout-assets.js, but with a farm-specific query set and
 * its own output prefix so it never clobbers the admin/decor icons.
 *
 * Reads ICONSCOUT_CLIENT_ID / ICONSCOUT_CLIENT_SECRET from .env.local.
 * Writes PNGs to public/games/english-farm/icons/ and a manifest.json there.
 *
 * Progressive enhancement: if the secret is missing or a query fails, the entry
 * is recorded as skipped/errored in the manifest (no file), and the game falls
 * back to emoji/Phaser graphics. Safe to re-run.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'https://api.iconscout.com/v3';
const OUT_DIR = path.join(process.cwd(), 'public', 'games', 'english-farm', 'icons');

// Farm icon set: crops, seeds, tools, animals(products), and UI chrome.
const QUERIES = {
  // Crops (each maps to a vocabulary word)
  carrot: 'carrot vegetable 3d icon',
  tomato: 'tomato vegetable 3d icon',
  corn: 'corn maize 3d icon',
  pumpkin: 'pumpkin 3d icon',
  strawberry: 'strawberry fruit 3d icon',
  potato: 'potato vegetable 3d icon',
  // Seed / generic
  seed: 'seed bag 3d icon',
  sprout: 'sprout seedling 3d icon',
  // Tools
  hoe: 'hoe farming tool 3d icon',
  'watering-can': 'watering can 3d icon',
  // UI / economy
  coin: 'gold coin 3d icon',
  star: 'star 3d icon',
  basket: 'harvest basket 3d icon',
  soil: 'soil dirt ground 3d icon',
  // Character + scenery (visual overhaul)
  farmer: 'farmer character 3d',
  'farmer-girl': 'woman farmer 3d',
  barn: 'barn farm house 3d',
  tree: 'tree 3d icon',
  fence: 'wooden fence 3d',
  scarecrow: 'scarecrow 3d',
  grass: 'grass field 3d',
  cloud: 'cloud 3d icon',
  sun: 'sun 3d icon',
  water: 'water drop 3d icon',
  // Decor + feedback (visual overhaul)
  tree: 'tree 3d icon',
  fence: 'wood fence 3d icon',
  flower: 'flower 3d icon',
  barn: 'barn farm house 3d icon',
  'water-drop': 'water drop 3d icon',
  sparkle: 'sparkle star shine 3d icon',
  sun: 'sun sunny 3d icon',
  cloud: 'cloud 3d icon',
  scarecrow: 'scarecrow 3d icon',
  bush: 'bush shrub 3d icon',
};

function pickItems(p) {
  // v3 search returns paginated items under response.items.data
  if (Array.isArray(p?.response?.items?.data)) return p.response.items.data;
  if (Array.isArray(p?.data?.data)) return p.data.data;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.items)) return p.data.items;
  if (Array.isArray(p?.items)) return p.items;
  if (Array.isArray(p?.response?.items)) return p.response.items;
  return [];
}
const pickThumb = (i) => i?.urls?.thumb || i?.urls?.original || i?.thumb || null;
const pickUuid = (i) => i?.uuid || i?.item_uuid || i?.id || i?.slug;
const pickDownloadUrl = (p) =>
  p?.data?.download_url || p?.data?.url || p?.download_url || p?.url || p?.response?.download_url || p?.response?.url;

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(`IconScout ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  return body;
}

async function downloadBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Asset download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadEnv() {
  const t = await readFile('.env.local', 'utf8');
  const get = (k) => { const m = t.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim() : ''; };

  // Collect all credential pairs: unnumbered (ICONSCOUT_CLIENT_ID) plus
  // numbered variants (ICONSCOUT_CLIENT_ID1, _ID2, ...). Each Iconscout free
  // account has a limited download quota, so having several lets us rotate.
  const pairs = [];
  const base = { id: get('ICONSCOUT_CLIENT_ID'), secret: get('ICONSCOUT_CLIENT_SECRET') };
  if (base.id) pairs.push(base);
  for (let i = 1; i <= 9; i++) {
    const id = get(`ICONSCOUT_CLIENT_ID${i}`);
    const secret = get(`ICONSCOUT_CLIENT_SECRET${i}`);
    if (id) pairs.push({ id, secret });
  }
  return pairs;
}

async function downloadAsset({ name, query, asset, format, clientId, clientSecret }) {
  const searchUrl = new URL(`${API_BASE}/search`);
  searchUrl.searchParams.set('asset', asset);
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('per_page', '8');

  const search = await fetchJson(searchUrl, { headers: { 'Client-ID': clientId } });
  const item = pickItems(search)[0];
  const uuid = pickUuid(item);
  if (!uuid) throw new Error(`No asset found for "${query}"`);

  const thumb = pickThumb(item);

  // Try the official api-download first (full-res). Premium items may reject
  // this without a paid plan, so fall back to the public thumb PNG.
  if (clientSecret) {
    try {
      const download = await fetchJson(`${API_BASE}/items/${uuid}/api-download`, {
        method: 'POST',
        headers: { 'Client-ID': clientId, 'Client-Secret': clientSecret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      const url = pickDownloadUrl(download);
      if (url) {
        const bytes = await downloadBinary(url);
        const fileName = `${name}.${format}`;
        await writeFile(path.join(OUT_DIR, fileName), bytes);
        return { name, query, uuid, file: `/games/english-farm/icons/${fileName}`, source: 'api-download' };
      }
    } catch (e) {
      // fall through to thumb fallback
      process.stdout.write(`  (api-download failed, trying thumb) ${e instanceof Error ? e.message : e}\n`);
    }
  }

  if (thumb) {
    const bytes = await downloadBinary(thumb);
    const fileName = `${name}.png`;
    await writeFile(path.join(OUT_DIR, fileName), bytes);
    return { name, query, uuid, file: `/games/english-farm/icons/${fileName}`, source: 'thumb' };
  }

  return { name, query, uuid, skipped: true, reason: 'no downloadable url (api-download + thumb both unavailable)' };
}

async function main() {
  const creds = await loadEnv();
  if (creds.length === 0) throw new Error('No ICONSCOUT_CLIENT_ID* found in .env.local');
  process.stdout.write(`[farm-icons] loaded ${creds.length} credential pair(s)\n`);
  const asset = process.env.ICONSCOUT_ASSET || '3d';
  const format = process.env.ICONSCOUT_FORMAT || 'png';

  await mkdir(OUT_DIR, { recursive: true });

  let credIdx = 0; // which credential pair we're currently using

  const results = [];
  for (const [name, query] of Object.entries(QUERIES)) {
    process.stdout.write(`[farm-icons] ${name}: ${query}\n`);
    let done = false;
    // Try each remaining credential pair until one succeeds.
    for (let attempt = 0; attempt < creds.length && !done; attempt++) {
      const cur = creds[(credIdx + attempt) % creds.length];
      try {
        const r = await downloadAsset({ name, query, asset, format, clientId: cur.id, clientSecret: cur.secret });
        results.push(r);
        if (r.skipped || r.error) {
          process.stdout.write(`  ~ ${r.reason || r.error}\n`);
        } else {
          process.stdout.write(`  ✓ ${r.source}\n`);
        }
        credIdx = (credIdx + attempt) % creds.length; // stick with the working pair
        done = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Quota/auth error → rotate to the next credential pair.
        if (/429|quota|limit|401|403/i.test(msg) && attempt < creds.length - 1) {
          process.stdout.write(`  (pair ${(credIdx + attempt) % creds.length + 1} failed: ${msg} — rotating)\n`);
          continue;
        }
        results.push({ name, query, error: msg });
        process.stdout.write(`  ! ${msg}\n`);
        done = true;
      }
    }
  }

  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ asset, format, generatedAt: new Date().toISOString(), results }, null, 2) + '\n',
  );
  const ok = results.filter((r) => r.file).length;
  process.stdout.write(`[farm-icons] done: ${ok}/${results.length} downloaded -> ${OUT_DIR}\n`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
