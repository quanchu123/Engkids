const fs = require('fs/promises');
const path = require('path');

const API_BASE = 'https://api.iconscout.com/v3';
const OUT_DIR = path.join(process.cwd(), 'public', 'assets', 'iconscout');

const DEFAULT_QUERIES = {
  animals: 'cute animal 3d icon',
  space: 'rocket space 3d icon',
  weather: 'weather sun 3d icon',
  family: 'family home 3d icon',
  body: 'body health 3d icon',
  music: 'music note 3d icon',
  story: 'storybook 3d icon',
  game: 'game controller 3d icon',
  // Admin panel icons
  'admin-stories': 'open book 3d icon',
  'admin-videos': 'video play 3d icon',
  'admin-games': 'game controller 3d icon',
  'admin-music': 'music note 3d icon',
  'admin-dashboard': 'dashboard chart 3d icon',
  'admin-upload': 'cloud upload 3d icon',
};

function parseQueries(value) {
  if (!value) return DEFAULT_QUERIES;

  return value.split(',').reduce((acc, item) => {
    const [rawName, ...rawQuery] = item.split('=');
    const name = rawName?.trim();
    const query = rawQuery.join('=').trim();
    if (name && query) acc[name] = query;
    return acc;
  }, {});
}

function pickItems(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.response?.items)) return payload.response.items;
  return [];
}

function pickUuid(item) {
  return item?.uuid || item?.item_uuid || item?.id || item?.slug;
}

function pickDownloadUrl(payload) {
  return (
    payload?.data?.download_url ||
    payload?.data?.url ||
    payload?.download_url ||
    payload?.url ||
    payload?.response?.download_url ||
    payload?.response?.url
  );
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();

  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const details = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`IconScout request failed (${response.status}): ${details}`);
  }

  return body;
}

async function downloadBinary(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Asset download failed (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function downloadAsset({ name, query, asset, format, clientId, clientSecret }) {
  const searchUrl = new URL(`${API_BASE}/search`);
  searchUrl.searchParams.set('asset', asset);
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('per_page', '8');

  const search = await fetchJson(searchUrl, {
    headers: { 'Client-ID': clientId },
  });

  const item = pickItems(search)[0];
  const uuid = pickUuid(item);
  if (!uuid) {
    throw new Error(`No IconScout asset found for "${query}"`);
  }

  if (!clientSecret) {
    return {
      name,
      query,
      uuid,
      skipped: true,
      reason: 'ICONSCOUT_CLIENT_SECRET is required to download assets',
    };
  }

  const download = await fetchJson(`${API_BASE}/items/${uuid}/api-download`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Client-Secret': clientSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ format }),
  });

  const downloadUrl = pickDownloadUrl(download);
  if (!downloadUrl) {
    throw new Error(`IconScout did not return a download URL for "${query}"`);
  }

  const bytes = await downloadBinary(downloadUrl, {});
  const fileName = `${name}.${format}`;
  const filePath = path.join(OUT_DIR, fileName);
  await fs.writeFile(filePath, bytes);

  return {
    name,
    query,
    uuid,
    file: `/assets/iconscout/${fileName}`,
  };
}

async function main() {
  const clientId = process.env.ICONSCOUT_CLIENT_ID;
  const clientSecret = process.env.ICONSCOUT_CLIENT_SECRET;
  const asset = process.env.ICONSCOUT_ASSET || '3d';
  const format = process.env.ICONSCOUT_FORMAT || 'png';
  const queries = parseQueries(process.env.ICONSCOUT_QUERIES);

  if (!clientId) {
    throw new Error('Set ICONSCOUT_CLIENT_ID before running this script.');
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const results = [];
  for (const [name, query] of Object.entries(queries)) {
    process.stdout.write(`[iconscout] ${name}: ${query}\n`);
    try {
      results.push(await downloadAsset({
        name,
        query,
        asset,
        format,
        clientId,
        clientSecret,
      }));
    } catch (error) {
      results.push({
        name,
        query,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await fs.writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({
      asset,
      format,
      generatedAt: new Date().toISOString(),
      results,
    }, null, 2)}\n`,
  );

  process.stdout.write(`[iconscout] wrote ${path.join(OUT_DIR, 'manifest.json')}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
