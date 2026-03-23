#!/usr/bin/env node
/**
 * Test Bunny CDN Signed URL Generation
 * Debug lỗi 403 khi load thumbnail
 */

const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Colors for console output
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

// Step 1: Check ENV VARS
header('STEP 1: KIỂM TRA ENV VARIABLES');

const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME;
const BUNNY_CDN_SECURITY_KEY = process.env.BUNNY_CDN_SECURITY_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

log(colors.cyan, '📋', `BUNNY_CDN_HOSTNAME: ${BUNNY_CDN_HOSTNAME || '❌ MISSING'}`);
log(colors.cyan, '🔑', `BUNNY_CDN_SECURITY_KEY: ${BUNNY_CDN_SECURITY_KEY ? '✅ SET (không hiển thị value)' : '❌ NOT SET'}`);
log(colors.cyan, '📚', `BUNNY_LIBRARY_ID: ${BUNNY_LIBRARY_ID || '❌ MISSING'}`);

if (!BUNNY_CDN_HOSTNAME) {
  log(colors.red, '❌', 'BUNNY_CDN_HOSTNAME không được set!');
  process.exit(1);
}

// Step 2: Test Signed URL Algorithm
header('STEP 2: PHÂN TÍCH THUẬT TOÁN SIGNED URL');

function generateSignedUrl(url, expiresInSeconds = 86400, securityKey) {
  if (!securityKey) {
    log(colors.yellow, '⚠️', 'Không có security key - return URL gốc');
    return url;
  }

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

    log(colors.blue, '🔍', `Path: ${path}`);
    log(colors.blue, '⏰', `Expires: ${expires} (${new Date(expires * 1000).toISOString()})`);

    // Generate token: Base64(SHA256(security_key + path + expires))
    const hashableBase = securityKey + path + expires;
    log(colors.blue, '📝', `Hashable Base: [SECURITY_KEY]${path}${expires}`);

    const hash = crypto.createHash('sha256').update(hashableBase).digest('base64');
    log(colors.blue, '🔐', `SHA256 Hash (base64): ${hash.substring(0, 30)}...`);

    // Format token: replace special characters for base64url
    const token = hash
      .replace(/\n/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    log(colors.blue, '🎫', `Token (base64url): ${token.substring(0, 30)}...`);

    // Add token and expires to URL
    urlObj.searchParams.set('token', token);
    urlObj.searchParams.set('expires', expires.toString());

    return urlObj.toString();
  } catch (error) {
    log(colors.red, '❌', `Error: ${error.message}`);
    return url;
  }
}

log(colors.cyan, 'ℹ️', 'Thuật toán Bunny CDN Token Authentication:');
console.log('   1. Hash = SHA256(security_key + path + expires)');
console.log('   2. Token = Base64URL(Hash)');
console.log('   3. URL = original_url?token=xxx&expires=timestamp');
console.log('   4. Path phải bao gồm leading "/" (ví dụ: /video-id/thumbnail.jpg)');

// Step 3: Test với video thật
header('STEP 3: TEST VỚI VIDEO THẬT');

// Giả sử một video ID từ DB
const testVideoId = 'abc123-test-video-id';
const testThumbnailUrl = `https://${BUNNY_CDN_HOSTNAME}/${testVideoId}/thumbnail.jpg`;

log(colors.cyan, '📹', `Test Video ID: ${testVideoId}`);
log(colors.cyan, '🖼️', `Original Thumbnail URL: ${testThumbnailUrl}`);

console.log('\n--- Scenario 1: KHÔNG CÓ SECURITY KEY (hiện tại) ---');
const unsignedUrl = generateSignedUrl(testThumbnailUrl, 86400, BUNNY_CDN_SECURITY_KEY);
log(colors.yellow, '🔗', `Result: ${unsignedUrl}`);
log(
  BUNNY_CDN_SECURITY_KEY ? colors.green : colors.yellow,
  BUNNY_CDN_SECURITY_KEY ? '✅' : '⚠️',
  BUNNY_CDN_SECURITY_KEY ? 'URL đã được sign với token' : 'URL KHÔNG có token (vì thiếu BUNNY_CDN_SECURITY_KEY)'
);

if (BUNNY_CDN_SECURITY_KEY) {
  const hasToken = unsignedUrl.includes('token=');
  const hasExpires = unsignedUrl.includes('expires=');
  log(colors.blue, '🔍', `Has token param: ${hasToken ? '✅' : '❌'}`);
  log(colors.blue, '🔍', `Has expires param: ${hasExpires ? '✅' : '❌'}`);
}

console.log('\n--- Scenario 2: CÓ SECURITY KEY (giả lập) ---');
const mockSecurityKey = 'my-secret-key-12345';
const signedUrl = generateSignedUrl(testThumbnailUrl, 86400, mockSecurityKey);
log(colors.green, '🔗', `Result: ${signedUrl}`);
log(colors.green, '✅', 'URL đã được sign với token');

// Step 4: Recommendations
header('STEP 4: PHÂN TÍCH VÀ ĐỀ XUẤT FIX');

console.log(`${colors.bright}📊 FINDINGS:${colors.reset}\n`);

const findings = [];

if (!BUNNY_CDN_SECURITY_KEY) {
  findings.push({
    severity: 'HIGH',
    issue: 'BUNNY_CDN_SECURITY_KEY không được set trong .env.local',
    impact: 'Nếu Pull Zone bật Token Authentication → 403 Forbidden',
    color: colors.red,
  });
} else {
  findings.push({
    severity: 'OK',
    issue: 'BUNNY_CDN_SECURITY_KEY đã được set',
    impact: 'URLs sẽ được sign với token',
    color: colors.green,
  });
}

findings.push({
  severity: 'INFO',
  issue: 'Thuật toán signed URL đúng theo spec Bunny.net',
  impact: 'SHA256 + Base64URL encoding đúng format',
  color: colors.blue,
});

findings.push({
  severity: 'INFO',
  issue: 'Code có fallback tốt: nếu không có key → return URL gốc',
  impact: 'Hoạt động tốt nếu Pull Zone KHÔNG bật Token Auth',
  color: colors.blue,
});

findings.forEach((finding) => {
  console.log(`${finding.color}[${finding.severity}]${colors.reset} ${finding.issue}`);
  console.log(`   → ${finding.impact}\n`);
});

console.log(`${colors.bright}💡 RECOMMENDATIONS:${colors.reset}\n`);

if (!BUNNY_CDN_SECURITY_KEY) {
  console.log(`${colors.yellow}Option 1: Disable Token Authentication${colors.reset}`);
  console.log('   Vào Bunny.net Dashboard → CDN → Pull Zone → Security');
  console.log('   → Tắt "Token Authentication"');
  console.log('   → Thumbnail URLs sẽ public, không cần token\n');

  console.log(`${colors.green}Option 2: Enable Token Authentication (Recommended)${colors.reset}`);
  console.log('   Vào Bunny.net Dashboard → CDN → Pull Zone → Security');
  console.log('   → Bật "Token Authentication"');
  console.log('   → Copy "Security Key"');
  console.log('   → Thêm vào .env.local:');
  console.log(`   ${colors.cyan}BUNNY_CDN_SECURITY_KEY=your_security_key_here${colors.reset}`);
  console.log('   → Restart dev server\n');
} else {
  console.log(`${colors.green}✅ Configuration looks good!${colors.reset}`);
  console.log('   Nếu vẫn gặp 403, check:');
  console.log('   1. Security key có đúng không (copy từ Bunny dashboard)');
  console.log('   2. Pull Zone có bật Token Authentication không');
  console.log('   3. Check logs xem token có được generate không\n');
}

console.log(`${colors.bright}🔍 NEXT STEPS:${colors.reset}\n`);
console.log('1. Check Bunny.net Dashboard → CDN → Pull Zone → Security');
console.log('2. Xác định Pull Zone có bật Token Authentication hay không');
console.log('3. Nếu có → thêm BUNNY_CDN_SECURITY_KEY vào .env.local');
console.log('4. Nếu không → có thể tắt token auth để dùng public URLs');
console.log('5. Test lại thumbnail loading sau khi config\n');

header('TEST HOÀN THÀNH');
