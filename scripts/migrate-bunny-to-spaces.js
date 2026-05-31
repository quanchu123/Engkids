/* eslint-disable @typescript-eslint/no-var-requires */
// ============================================
// ONE-TIME MIGRATION: Bunny.net -> DigitalOcean Spaces
// ============================================
// Copies existing Bunny.net videos into DigitalOcean Spaces and updates the
// corresponding `videos` rows to reference the new object key.
//
// IMPORTANT: Run this BEFORE applying SQL migration 013 (which drops the
// bunny_video_id / hls_url columns). It is safe to re-run: videos already
// migrated (object_key set) are skipped.
//
// Usage:
//   node scripts/migrate-bunny-to-spaces.js
//
// Requires env (.env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   BUNNY_CDN_HOSTNAME (to download the source MP4)
//   DO_SPACES_REGION, DO_SPACES_ENDPOINT, DO_SPACES_BUCKET, DO_SPACES_KEY, DO_SPACES_SECRET
// ============================================

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME;

const SPACES = {
  region: process.env.DO_SPACES_REGION,
  endpoint: process.env.DO_SPACES_ENDPOINT,
  bucket: process.env.DO_SPACES_BUCKET,
  key: process.env.DO_SPACES_KEY,
  secret: process.env.DO_SPACES_SECRET,
};

function assertConfig() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!SPACES.region) missing.push('DO_SPACES_REGION');
  if (!SPACES.endpoint) missing.push('DO_SPACES_ENDPOINT');
  if (!SPACES.bucket) missing.push('DO_SPACES_BUCKET');
  if (!SPACES.key) missing.push('DO_SPACES_KEY');
  if (!SPACES.secret) missing.push('DO_SPACES_SECRET');
  if (missing.length) {
    console.error('Missing required env vars:', missing.join(', '));
    process.exit(1);
  }
}

async function downloadBunnySource(bunnyVideoId) {
  if (!BUNNY_CDN_HOSTNAME) {
    throw new Error('BUNNY_CDN_HOSTNAME not set — cannot download source video');
  }
  // Bunny Stream original/play file. The direct MP4 play URL is typically:
  //   https://<cdn>/<videoId>/play_720p.mp4  (resolution may vary)
  // We try a few common resolutions and fall back to the original.
  const candidates = [
    `https://${BUNNY_CDN_HOSTNAME}/${bunnyVideoId}/play_720p.mp4`,
    `https://${BUNNY_CDN_HOSTNAME}/${bunnyVideoId}/play_480p.mp4`,
    `https://${BUNNY_CDN_HOSTNAME}/${bunnyVideoId}/original`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 0) return buf;
      }
    } catch {
      // try next candidate
    }
  }
  throw new Error('Could not download source video from Bunny CDN');
}

async function main() {
  assertConfig();

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const s3 = new S3Client({
    region: SPACES.region,
    endpoint: SPACES.endpoint,
    forcePathStyle: false,
    credentials: { accessKeyId: SPACES.key, secretAccessKey: SPACES.secret },
  });

  // Pull all videos. We detect "needs migration" by the presence of a
  // bunny_video_id and the absence of an object_key.
  const { data: videos, error } = await supabase.from('videos').select('*');
  if (error) {
    console.error('Failed to read videos:', error.message);
    process.exit(1);
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const v of videos || []) {
    const hasObjectKey = Boolean(v.object_key);
    const bunnyId = v.bunny_video_id;

    // Already migrated to Spaces.
    if (hasObjectKey) {
      skipped++;
      continue;
    }

    // Not a Bunny video (no source to migrate).
    if (!bunnyId || bunnyId.startsWith('storage-') || bunnyId.startsWith('local-')) {
      skipped++;
      continue;
    }

    try {
      console.log(`Migrating "${v.title}" (${bunnyId})...`);
      const buffer = await downloadBunnySource(bunnyId);
      const objectKey = `videos/${randomUUID()}.mp4`;

      await s3.send(
        new PutObjectCommand({
          Bucket: SPACES.bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: 'video/mp4',
          ACL: 'public-read',
        }),
      );

      const { error: updateError } = await supabase
        .from('videos')
        .update({ object_key: objectKey, status: 'ready' })
        .eq('id', v.id);

      if (updateError) throw new Error(updateError.message);

      migrated++;
      console.log(`  -> done: ${objectKey}`);
    } catch (e) {
      failed++;
      console.error(`  -> FAILED for "${v.title}":`, e.message);
    }
  }

  console.log('\n==============================');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log('==============================');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
