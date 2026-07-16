#!/usr/bin/env node
/**
 * Seed premium educational videos (category=video) from Desktop/ảnh thumbnails.
 * Same pattern as premium music: ready status, thumbnail only, no object_key yet.
 *
 * Usage:
 *   node scripts/seed-premium-videos-from-anh.mjs
 *   node scripts/seed-premium-videos-from-anh.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

const APPLY = process.argv.includes('--apply');
const BUCKET = process.env.VIDEO_THUMB_BUCKET || 'story-images';
const IMAGES_DIR = process.env.VIDEO_THUMB_DIR || path.join('/home/chinhdz/Desktop/ảnh');
const INDEX_HTML = path.join(IMAGES_DIR, 'index.html');

/** Simple VI→EN title map for kids catalog (fallback: keep Vietnamese). */
const TITLE_EN = {
  'Bạn Rồng Con Tinh Nghịch': 'My Playful Little Dragon',
  'Buổi Hòa Nhạc Gấu Trúc': 'Panda Music Time',
  'Tiệc Trà Thỏ Ngọc': 'Bunny Tea Party',
  'Du Ngoạn Trên Vịt Khổng Lồ': 'Ride the Giant Duck',
  'Bánh Dâu Tây Trong Rừng': 'Strawberry Cake in the Forest',
  'Chuyến Bay Của Cá Voi Tinh Tú': 'Star Whale Flight',
  'Chú Chó Shiba Khổng Lồ': 'Giant Shiba Friend',
  'Cô Bé Vớt Sao Trời': 'Catching Falling Stars',
  'Cây Tinh Thể Trong Rừng Cổ': 'Crystal Tree in the Old Forest',
  'Tàu Bay Lâu Đài Di Động': 'Flying Castle Ship',
  'Cung Điện San Hô': 'Coral Palace Adventure',
  'Robot Đồng Hồ Cổ': 'Clockwork Robot Helper',
  'Hái Trái Cây Phát Sáng': 'Picking Glowing Fruit',
  'Thư Viện Phép Thuật': 'Magic Library',
  'Lâu Đài Cát Của Bé': "Kids' Sandcastle",
  'Đầu Bếp Nhí Tài Ba': 'Little Chef',
  'Tiếng Vĩ Cầm Dưới Hoa': 'Violin Under Cherry Blossoms',
  'Họa Sĩ Phép Thuật': 'Magic Painter',
  'Cắm Trại Trên Cây': 'Treehouse Camping',
  'Cô Bé Quàng Khăn Đỏ và Sói Con': 'Little Red and the Kind Wolf',
  'Cậu Bé Peter Pan Bay Lượn': 'Peter Pan Flying Over Town',
};

const FEATURE_BY_CAT = {
  animals: 'Động vật',
  fantasy: 'Kỳ ảo',
  hobbies: 'Sở thích',
  fairy: 'Cổ tích',
  exploration: 'Khám phá',
};

const DURATION_BY_FILE = {
  animal_1: 186, animal_2: 172, animal_3: 195, animal_4: 168, animal_5: 201,
  animal_6: 214, animal_7: 179,
  fantasy_1: 203, fantasy_2: 188, fantasy_3: 221, fantasy_4: 197, fantasy_5: 209,
  fantasy_6: 184, fantasy_7: 216,
  hobby_1: 175, hobby_2: 163, hobby_3: 191, hobby_4: 182, hobby_5: 199,
  hero_1: 208, hero_2: 194,
};

function parseGallery() {
  if (!existsSync(INDEX_HTML)) return [];
  const html = readFileSync(INDEX_HTML, 'utf8');
  const re =
    /\{\s*id:\s*(\d+),\s*file:\s*'([^']+)',\s*category:\s*'([^']+)',\s*tag:\s*'([^']*)',\s*title:\s*'((?:\\'|[^'])*)',\s*desc:\s*'((?:\\'|[^'])*)'/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    out.push({
      htmlId: Number(m[1]),
      file: m[2],
      category: m[3],
      tag: m[4],
      titleVi: m[5].replace(/\\'/g, "'"),
      desc: m[6].replace(/\\'/g, "'"),
    });
  }
  return out;
}

function loadTracks() {
  const diskFiles = new Set(
    readdirSync(IMAGES_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f)),
  );
  const gallery = parseGallery();
  const tracks = [];

  for (const g of gallery) {
    if (!diskFiles.has(g.file)) continue;
    const base = path.parse(g.file).name;
    tracks.push({
      file: g.file,
      title: TITLE_EN[g.titleVi] || g.titleVi,
      titleVi: g.titleVi,
      description: g.desc,
      feature: FEATURE_BY_CAT[g.category] || g.tag || 'Premium Videos',
      topics: [g.category === 'animals' ? 'Animals' : g.category === 'fantasy' ? 'Adventure' : g.category === 'fairy' ? 'Adventure' : 'Daily Life'],
      duration: DURATION_BY_FILE[base] || 180 + (g.htmlId % 40),
      key: `premium-video-${base.replace(/_/g, '-')}`,
    });
  }

  // Any leftover images on disk without HTML entry
  const used = new Set(tracks.map((t) => t.file));
  for (const file of diskFiles) {
    if (used.has(file)) continue;
    const base = path.parse(file).name;
    tracks.push({
      file,
      title: base.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      titleVi: base,
      description: 'Video Premium dành cho bé học tiếng Anh.',
      feature: 'Premium Videos',
      topics: ['Adventure'],
      duration: DURATION_BY_FILE[base] || 180,
      key: `premium-video-${base.replace(/_/g, '-')}`,
    });
  }

  return tracks;
}

function mimeOf(filePath, bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { mime: 'image/jpeg', ext: 'jpg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { mime: 'image/png', ext: 'png' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

async function uploadThumb(supabase, videoId, filePath) {
  const bytes = readFileSync(filePath);
  const { mime, ext } = mimeOf(filePath, bytes);
  const objectKey = `premium-video/${videoId}/thumb-${randomUUID()}.${ext}`;
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  const { error } = await supabase.storage.from(BUCKET).upload(objectKey, bytes, {
    contentType: mime,
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw new Error(`Upload failed ${videoId}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(objectKey).data.publicUrl;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');

  const tracks = loadTracks();
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | dir: ${IMAGES_DIR} | tracks: ${tracks.length}`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let ok = 0;
  for (const track of tracks) {
    const img = path.join(IMAGES_DIR, track.file);
    console.log(`\n• ${track.key}`);
    console.log(`  ${track.title} / ${track.titleVi}`);
    console.log(`  feature=${track.feature} duration=${track.duration}s thumb=${track.file}`);

    if (!APPLY) {
      ok += 1;
      continue;
    }

    // Idempotent: match by title + premium video category
    const { data: existing } = await supabase
      .from('videos')
      .select('id')
      .eq('category', 'video')
      .eq('premium_only', true)
      .eq('title', track.title)
      .is('deleted_at', null)
      .maybeSingle();

    const id = existing?.id || randomUUID();
    const thumbUrl = await uploadThumb(supabase, id, img);

    const row = {
      id,
      title: track.title,
      title_vi: track.titleVi,
      description: track.description || 'Video Premium dành cho bé học tiếng Anh.',
      thumbnail_url: thumbUrl,
      object_key: null,
      duration: track.duration,
      level: 'Beginner',
      curriculum_stage_id: 'a2-key',
      topics: track.topics,
      age_group: '6-8',
      category: 'video',
      feature: track.feature,
      status: 'ready',
      premium_only: true,
      quiz: [],
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabase.from('videos').update(row).eq('id', id)
      : await supabase.from('videos').insert(row);

    if (error) {
      console.error(`  FAIL: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`  ${existing ? 'updated' : 'inserted'} id=${id}`);
    ok += 1;
  }

  console.log(`\nDone: ${ok}/${tracks.length}${APPLY ? ' applied' : ' validated (dry-run)'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
