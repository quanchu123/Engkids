#!/usr/bin/env node
/**
 * Check Bunny Stream Library Configuration
 */

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

async function checkStreamLibrary() {
  header('KIỂM TRA BUNNY STREAM LIBRARY');

  const apiKey = process.env.BUNNY_API_KEY;
  const libraryId = process.env.BUNNY_LIBRARY_ID;

  if (!apiKey) {
    log(colors.red, '❌', 'BUNNY_API_KEY không được set');
    return;
  }

  if (!libraryId) {
    log(colors.red, '❌', 'BUNNY_LIBRARY_ID không được set');
    return;
  }

  log(colors.cyan, '🔍', `Checking Stream Library: ${libraryId}`);

  try {
    // Get library info
    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}`, {
      headers: { AccessKey: apiKey },
    });

    if (!response.ok) {
      log(colors.red, '❌', `API Error: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        console.log('\n   API Key có thể không hợp lệ hoặc không có quyền truy cập library này.');
      }
      return;
    }

    const library = await response.json();

    log(colors.green, '✅', `Found Stream Library: ${library.Name}`);
    console.log(`   ID: ${library.Id}`);
    console.log(`   Videos Count: ${library.VideoCount}`);
    console.log(`   Storage Used: ${(library.StorageUsed / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Video Library CDN: ${library.VideoLibraryCDN || 'N/A'}\n`);

    // Check security settings for Pull Zone
    console.log(`${colors.bright}🔐 PULL ZONE SECURITY:${colors.reset}\n`);

    const hasTokenAuth = library.EnabledResolutions && library.EnabledResolutions.includes('TokenAuth');
    const pullZoneId = library.PullZoneId;

    log(colors.cyan, 'ℹ️', `Pull Zone ID: ${pullZoneId || 'N/A'}`);
    log(colors.cyan, 'ℹ️', `CDN Hostname: ${process.env.BUNNY_CDN_HOSTNAME}`);

    console.log(`\n${colors.yellow}💡 PHÂN TÍCH:${colors.reset}\n`);
    console.log('   Bunny Stream sử dụng Pull Zone riêng để deliver video và thumbnail.');
    console.log('   Pull Zone này có thể có Token Authentication enabled.\n');

    console.log(`${colors.bright}📋 CÁCH KIỂM TRA TOKEN AUTH:${colors.reset}\n`);
    console.log('   1. Vào https://dash.bunny.net');
    console.log('   2. Chọn "CDN" → "Pull Zones"');
    console.log('   3. Tìm Pull Zone với hostname: vz-c47b1210-54e.b-cdn.net');
    console.log('   4. Click vào Pull Zone đó');
    console.log('   5. Vào tab "Security"');
    console.log('   6. Kiểm tra "Token Authentication"\n');

    console.log(`${colors.bright}🔧 GIẢI PHÁP:${colors.reset}\n`);

    console.log(`${colors.green}Option 1: Disable Token Authentication (Đơn giản nhất)${colors.reset}`);
    console.log('   → Dashboard → CDN → Pull Zones → [Your Pull Zone] → Security');
    console.log('   → Tắt "Token Authentication"');
    console.log('   → Thumbnails sẽ public, không cần security key\n');

    console.log(`${colors.yellow}Option 2: Enable Token Authentication với Security Key${colors.reset}`);
    console.log('   → Dashboard → CDN → Pull Zones → [Your Pull Zone] → Security');
    console.log('   → Bật "Token Authentication" (nếu chưa bật)');
    console.log('   → Copy "Security Key"');
    console.log('   → Thêm vào .env.local:');
    console.log(`   ${colors.cyan}BUNNY_CDN_SECURITY_KEY=<paste_security_key_here>${colors.reset}`);
    console.log('   → Restart dev server\n');

    console.log(`${colors.blue}Note:${colors.reset}`);
    console.log('   - Security Key khác với API Key');
    console.log('   - Security Key được dùng để sign URLs, không phải authenticate API calls');
    console.log('   - Mỗi Pull Zone có Security Key riêng\n');

  } catch (error) {
    log(colors.red, '❌', `Error: ${error.message}`);
  }

  header('CHECK HOÀN THÀNH');
}

checkStreamLibrary().catch(console.error);
