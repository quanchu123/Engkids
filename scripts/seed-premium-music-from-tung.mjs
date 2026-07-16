#!/usr/bin/env node
/**
 * Seed premium music catalog entries from Desktop/tùng cover images.
 * Video files will be uploaded later (object_key stays null for now).
 *
 * Usage:
 *   node scripts/seed-premium-music-from-tung.mjs
 *   node scripts/seed-premium-music-from-tung.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
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
const IMAGES_DIR =
  process.env.MUSIC_THUMB_DIR ||
  path.join('/home/chinhdz/Desktop/tùng');

/** @type {Array<{file:string,title:string,titleVi:string,feature:string}>} */
const TRACKS = [
  { file: 'A Million Dreams.jpg', title: 'A Million Dreams', titleVi: 'Triệu Giấc Mơ', feature: 'Premium Songs' },
  { file: 'A Whole New World.jpg', title: 'A Whole New World', titleVi: 'Cả Một Thế Giới Mới', feature: 'Premium Songs' },
  { file: 'Brave.jpg', title: 'Brave', titleVi: 'Dũng Cảm', feature: 'Premium Songs' },
  { file: 'Count on me.jpg', title: 'Count on Me', titleVi: 'Hãy Tin Ở Tôi', feature: 'Premium Songs' },
  { file: 'Firework.jpg', title: 'Firework', titleVi: 'Pháo Hoa', feature: 'Premium Songs' },
  { file: 'Happy.jpg', title: 'Happy', titleVi: 'Hạnh Phúc', feature: 'Premium Songs' },
  { file: 'Heal the World.jpg', title: 'Heal the World', titleVi: 'Chữa Lành Thế Giới', feature: 'Premium Songs' },
  { file: 'Imagine.jpg', title: 'Imagine', titleVi: 'Hãy Tưởng Tượng', feature: 'Premium Songs' },
  { file: 'Let It Go.jpg', title: 'Let It Go', titleVi: 'Hãy Buông Bỏ', feature: 'Premium Songs' },
  { file: 'Rainbow.jpg', title: 'Rainbow', titleVi: 'Cầu Vồng', feature: 'Premium Songs' },
  { file: 'Roar.jpg', title: 'Roar', titleVi: 'Gầm Vang', feature: 'Premium Songs' },
  { file: 'The Climb.jpg', title: 'The Climb', titleVi: 'Hành Trình Leo Lên', feature: 'Premium Songs' },
  { file: 'What a Wonderful World.jpg', title: 'What a Wonderful World', titleVi: 'Thế Giới Tuyệt Vời', feature: 'Premium Songs' },
  { file: 'You Are My Sunshine.jpg', title: 'You Are My Sunshine', titleVi: 'Em Là Ánh Nắng Của Anh', feature: 'Premium Songs' },
  { file: 'You_ve Got a Friend in Me.jpg', title: "You've Got a Friend in Me", titleVi: 'Bạn Có Một Người Bạn Trong Tôi', feature: 'Premium Songs' },
];

function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findImage(fileName) {
  const exact = path.join(IMAGES_DIR, fileName);
  try {
    readFileSync(exact);
    return exact;
  } catch {
    const want = fileName.toLowerCase().replace(/_/g, "'");
    const hit = readdirSync(IMAGES_DIR).find((f) => {
      const n = f.toLowerCase().replace(/_/g, "'");
      return n === want || n.includes(path.parse(fileName).name.toLowerCase().replace(/_/g, "'"));
    });
    if (!hit) throw new Error(`Image not found: ${fileName} in ${IMAGES_DIR}`);
    return path.join(IMAGES_DIR, hit);
  }
}

function mimeOf(filePath, bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { mime: 'image/jpeg', ext: 'jpg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { mime: 'image/png', ext: 'png' };
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return { mime: 'image/png', ext: 'png' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

async function uploadThumb(supabase, videoId, filePath) {
  const bytes = readFileSync(filePath);
  const { mime, ext } = mimeOf(filePath, bytes);
  const objectKey = `premium-music/${videoId}/thumb-${randomUUID()}.${ext}`;
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

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | dir: ${IMAGES_DIR} | tracks: ${TRACKS.length}`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let ok = 0;
  for (const track of TRACKS) {
    const slug = `premium-music-${slugify(track.title)}`;
    const img = findImage(track.file);
    console.log(`\n• ${slug}`);
    console.log(`  ${track.title} / ${track.titleVi}`);
    console.log(`  thumb: ${path.basename(img)}`);

    if (!APPLY) {
      ok += 1;
      continue;
    }

    // videos.id is UUID — reuse existing premium placeholder by title+category when present
    const { data: existing } = await supabase
      .from('videos')
      .select('id')
      .eq('category', 'music')
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
      description: 'Bài hát Premium dành cho bé học tiếng Anh qua âm nhạc.',
      thumbnail_url: thumbUrl,
      object_key: null,
      duration: 0,
      level: 'Beginner',
      curriculum_stage_id: 'a2-key',
      topics: ['music', 'songs'],
      age_group: '6-8',
      category: 'music',
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
    console.log(`  thumb=${thumbUrl.slice(0, 72)}...`);
    ok += 1;
  }

  console.log(`\nDone: ${ok}/${TRACKS.length}${APPLY ? ' applied' : ' validated (dry-run)'}`);
  if (!APPLY) console.log('Re-run with --apply to upload thumbs and write DB rows.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
