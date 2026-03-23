#!/usr/bin/env node
/**
 * Test với video thật từ Supabase DB
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, label, message) {
  console.log(`${color}${label}${colors.reset} ${message}`);
}

function header(text) {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${text}${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}\n`);
}

function generateSignedUrl(url, expiresInSeconds = 86400, securityKey) {
  if (!securityKey) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const hashableBase = securityKey + path + expires;
    const hash = crypto.createHash('sha256').update(hashableBase).digest('base64');

    const token = hash
      .replace(/\n/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    urlObj.searchParams.set('token', token);
    urlObj.searchParams.set('expires', expires.toString());

    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

async function main() {
  header('TEST VỚI VIDEO THẬT TỪ DATABASE');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;
  const securityKey = process.env.BUNNY_CDN_SECURITY_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log(colors.red, '❌', 'Supabase credentials missing');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch một video từ DB
  log(colors.cyan, '📡', 'Fetching videos from database...');
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .eq('status', 'ready')
    .limit(1);

  if (error) {
    log(colors.red, '❌', `Database error: ${error.message}`);
    return;
  }

  if (!videos || videos.length === 0) {
    log(colors.yellow, '⚠️', 'No videos found in database');
    return;
  }

  const video = videos[0];
  log(colors.green, '✅', `Found video: ${video.title}`);
  console.log(`   ID: ${video.id}`);
  console.log(`   Bunny Video ID: ${video.bunny_video_id}`);
  console.log(`   Status: ${video.status}`);
  console.log(`   DB Thumbnail: ${video.thumbnail_url || 'null'}\n`);

  // Generate thumbnail URL
  const thumbnailUrl = `https://${cdnHostname}/${video.bunny_video_id}/thumbnail.jpg`;
  log(colors.blue, '🖼️', `Generated Thumbnail URL (unsigned):`);
  console.log(`   ${thumbnailUrl}\n`);

  // Generate signed URL (nếu có security key)
  if (securityKey) {
    const signedUrl = generateSignedUrl(thumbnailUrl, 86400, securityKey);
    log(colors.green, '🔐', `Signed Thumbnail URL:`);
    console.log(`   ${signedUrl}\n`);

    log(colors.cyan, '💡', 'Bạn có thể test URL này bằng cách:');
    console.log('   1. Copy URL trên');
    console.log('   2. Paste vào browser hoặc curl');
    console.log('   3. Nếu 200 OK → Token authentication đang hoạt động');
    console.log('   4. Nếu 403 Forbidden → Security key sai hoặc chưa bật token auth\n');
  } else {
    log(colors.yellow, '⚠️', `KHÔNG CÓ SECURITY KEY - URL không được sign`);
    console.log(`   Nếu Pull Zone bật Token Authentication → 403 Forbidden`);
    console.log(`   Nếu Pull Zone KHÔNG bật Token Auth → URL sẽ hoạt động\n`);
  }

  // Test fetch thumbnail
  log(colors.cyan, '🌐', 'Testing thumbnail URL...');
  const testUrl = securityKey
    ? generateSignedUrl(thumbnailUrl, 86400, securityKey)
    : thumbnailUrl;

  try {
    const response = await fetch(testUrl, { method: 'HEAD' });
    if (response.ok) {
      log(colors.green, '✅', `Thumbnail accessible! Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')}`);
    } else {
      log(colors.red, '❌', `Thumbnail NOT accessible! Status: ${response.status}`);
      console.log(`   ${response.statusText}`);

      if (response.status === 403) {
        console.log(`\n${colors.yellow}💡 Fix cho lỗi 403:${colors.reset}`);
        if (!securityKey) {
          console.log('   → Thêm BUNNY_CDN_SECURITY_KEY vào .env.local');
          console.log('   → Hoặc tắt Token Authentication trong Bunny Dashboard');
        } else {
          console.log('   → Check security key có đúng không');
          console.log('   → Check token authentication có bật trong Pull Zone không');
        }
      }
    }
  } catch (error) {
    log(colors.red, '❌', `Fetch error: ${error.message}`);
  }

  header('TEST HOÀN THÀNH');
}

main().catch(console.error);
